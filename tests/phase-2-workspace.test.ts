import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { sql, eq } from 'drizzle-orm';
import * as s from '../server/db/schema';
import { createWorkspaceRepository, WorkspaceValidationError } from '../server/workspaceRepository';
import { DEFAULT_PRIVATE_PROFILE, DEFAULT_BLANK_MASTER_RESUME } from '../src/data/privateSeedTemplate';
import { persistenceDb, syntheticJob, syntheticEvidence } from './helpers/persistence';
import { createWorkspaceRouter } from '../server/workspaceRoutes';

test('explicit collection/history/application replacement and owner deletion roll back atomically', async () => {
  const { pg, db } = await persistenceDb();
  const repo = createWorkspaceRepository(() => db as any);
  const project = { id: 'same-id', name: 'Synthetic project', purpose: '', period: '', technologies: [], solomonContribution: '', leadershipEvidence: '', implementationEvidence: '', outcomes: [], supportedMetrics: [], roleFamilyRelevance: [], bullets: [], enabled: true };
  const skill = { id: 'same-id', name: 'Synthetic skill', category: '', professionalEvidence: '', projectEvidence: '', confidence: 'Familiar', isCore: false, enabled: true };
  const resume = structuredClone(DEFAULT_BLANK_MASTER_RESUME);
  const outreach = { jobId: 'job-a', company: 'Synthetic', roleTitle: '', linkedInMessage: '', emailSubject: '', emailBody: '', concreteImpact: '', whyCandidateRelevant: '', generatedAt: '2026-01-01' };
  const job = { ...syntheticJob(), appliedDate: '2026-01-01', applicationAnswers: [], tailoredResume: resume,
    tailoringPlan: { professionalSummaryAngle: '', disneyBulletsPlan: [], projectSelection: [], skillsOrdering: [], skillsToRemove: [], skillsToBackfill: [], unsupportedClaimsToWithhold: [] },
    proofPack: { jobId: 'job-a', generatedAt: '2026-01-01', prepNotes: [], claims: [] },
    outreachDrafts: outreach, recruiterOutreach: outreach,
    referralContact: { id: 'contact', contactName: 'Synthetic', relationship: '', company: '', role: '', contactSource: '', outreachStatus: 'NOT_STARTED', referralMessage: '', updatedAt: '2026-01-01' },
    versionHistory: [syntheticJob().versionHistory[0], { ...syntheticJob().versionHistory[0], versionId: 'v2' }],
    statusHistory: [syntheticJob().statusHistory[0], { from: 'APPLIED', to: 'REJECTED', timestamp: '2026-01-02' }] };
  const input = { evidence: [syntheticEvidence()], projects: [project], skills: [skill], experiences: [{ id: 'same-id', employer: 'Synthetic', title: '', period: '', location: '', bullets: [] }], searchSessions: [{ id: 'same-id' }], jobs: [job], masterResume: resume };
  try {
    await repo.save('owner-a', input, 0); await repo.save('owner-b', input, 0);
    const attachmentKeys = ['fit', 'tailoringPlan', 'tailoredResume', 'proofPack', 'outreachDrafts', 'recruiterOutreach', 'referralContact'];
    const baseJob = Object.fromEntries(Object.entries(job).filter(([key]) => !attachmentKeys.includes(key)));
    const pruned = await repo.save('owner-a', { jobs: [{ ...baseJob, versionHistory: [job.versionHistory[1]], statusHistory: [job.statusHistory[0]], appliedDate: undefined, applicationAnswers: undefined }] }, 1);
    for (const key of attachmentKeys.filter(key=>key!=='tailoredResume')) {
      const {provenance,...content}=pruned.jobs[0][key];
      assert.deepEqual(content,job[key],'omitted attachments preserve existing owner/job content');
      if(['proofPack','outreachDrafts','recruiterOutreach','referralContact'].includes(key))assert.equal(provenance.validationStatus,'DRAFT','legacy artifact remains uncertified');
    }
    const {claimLedger,readiness,readinessIssues,...preservedResume}=pruned.jobs[0].tailoredResume;
    assert.deepEqual(preservedResume,resume,'legacy resume text and identity survive; new readiness metadata does not certify it');
    assert.equal(readiness,'STALE');
    assert.deepEqual(pruned.jobs[0].versionHistory.map(v => v.versionId), ['v2']);
    assert.equal(pruned.jobs[0].statusHistory.length, 1);
    assert.equal(pruned.jobs[0].appliedDate, undefined);
    assert.equal(pruned.jobs[0].applicationAnswers, undefined);
    assert.equal((await repo.read('owner-b')).jobs[0].versionHistory.length, 2);
    const before = await repo.read('owner-a');
    await db.execute(sql`CREATE FUNCTION fail_synthetic_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'synthetic audit failure'; END $$`);
    await db.execute(sql`CREATE TRIGGER fail_synthetic_audit BEFORE INSERT ON audit_events FOR EACH ROW EXECUTE FUNCTION fail_synthetic_audit()`);
    await assert.rejects(repo.save('owner-a', { evidence: [], projects: [], jobs: [{ ...job, versionHistory: [], statusHistory: [] }] }, 2), (e: any) => e.cause?.message === 'synthetic audit failure');
    assert.deepEqual(await repo.read('owner-a'), before, 'rollback restores history deletions and previous collections too');
    await db.execute(sql`DROP TRIGGER fail_synthetic_audit ON audit_events`);
    await db.execute(sql`DROP FUNCTION fail_synthetic_audit()`);
    await repo.save('owner-a', { evidence: [], projects: [], skills: [], experiences: [], searchSessions: [], jobs: [] }, 2);
    for (const table of [s.evidenceItems, s.projects, s.skillEvidence, s.experiences, s.searchSessions, s.jobs, s.fitAssessments, s.tailoringPlans, s.proofRecords, s.outreachRecords, s.contacts, s.resumes, s.resumeVersions, s.applications, s.applicationEvents]) {
      const remaining = await db.select().from(table).where(eq(table.ownerId, 'owner-a'));
      assert.equal(remaining.length, table === s.resumes ? 1 : 0, 'job removal preserves master resume, not orphan job attachments');
      assert((await db.select().from(table).where(eq(table.ownerId, 'owner-b'))).length > 0);
    }
    await db.delete(s.user).where(eq(s.user.id, 'owner-a'));
    assert.equal((await repo.read('owner-a')).revision, 0);
    assert.equal((await repo.read('owner-b')).revision, 1);
  } finally { await pg.close(); }
});

test('actual revisioned HTTP handlers return 409/400/503 without partial state or demo fallback', async () => {
  const { pg, db } = await persistenceDb(); const repository = createWorkspaceRepository(() => db as any);
  let unavailable = false;
  const guarded = (operation: (...args: any[]) => Promise<any>) => (...args: any[]) => { if (unavailable) throw new Error('synthetic DB outage'); return operation(...args); };
  const app = express(); app.use(express.json());
  app.use('/api/workspace', createWorkspaceRouter({ read: guarded(repository.read), save: guarded(repository.save), import: guarded(repository.import) }, (_req, res, next) => { res.locals.ownerId = 'owner-a'; next(); }));
  const server = app.listen(0, '127.0.0.1'); await new Promise<void>(resolve => server.once('listening', resolve));
  const url = `http://127.0.0.1:${(server.address() as any).port}/api/workspace`;
  const save = (revision: any, data = {}) => fetch(`${url}/data`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ revision, data }) });
  try {
    assert.equal((await save(0)).status, 200);
    assert.equal((await save(1, { evidence: [syntheticEvidence()] })).status, 200);
    const before = await repository.read('owner-a');
    const stale = await save(1, { evidence: [] }); assert.equal(stale.status, 409);
    assert.match(stale.headers.get('cache-control')!, /private.*no-store/);
    assert.deepEqual(await repository.read('owner-a'), before);
    for (const revision of [-1, '2', 1.5, null]) assert.equal((await save(revision)).status, 400);
    const imported = await fetch(`${url}/import`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ revision: 1, data: { evidence: [syntheticEvidence('stale')] } }) });
    assert.equal(imported.status, 409); assert.deepEqual(await repository.read('owner-a'), before);
    unavailable = true;
    for (const path of ['data', 'export', 'audit-log']) { const result = await fetch(`${url}/${path}`); assert.equal(result.status, 503); assert.deepEqual(await result.json(), { error: 'Private storage unavailable' }); }
    assert.equal((await save(2)).status, 503);
  } finally { server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())); await pg.close(); }
});

test('additive upload recovery migration preserves existing workspace, metadata and auth sessions', async () => {
  const pg = new PGlite(); const db = drizzle(pg, { schema: s });
  try {
    for (const name of ['0000_friendly_matthew_murdock', '0001_cynical_khan']) await pg.exec(await readFile(`migrations/${name}.sql`, 'utf8'));
    await db.insert(s.user).values({ id: 'owner-a', name: 'Synthetic', email: 'owner-a@example.invalid' });
    const repo = createWorkspaceRepository(() => db as any);
    await repo.save('owner-a', { evidence: [syntheticEvidence()] }, 0);
    await db.insert(s.privateFiles).values({ ownerId: 'owner-a', id: 'file', blobPath: 'private/owner-a/file', originalFilename: 'synthetic.txt', mimeType: 'text/plain', size: 9, purpose: 'evidence', sourceType: 'user-upload' });
    await db.insert(s.session).values({ id: 'synthetic-session', token: 'synthetic-session-token', userId: 'owner-a', expiresAt: new Date('2030-01-01') });
    const before = await repo.read('owner-a');
    await pg.exec(await readFile('migrations/0002_broad_lifeguard.sql', 'utf8'));
    assert.deepEqual(await repo.read('owner-a'), before);
    assert.equal((await db.select().from(s.privateFiles)).length, 1); assert.equal((await db.select().from(s.session)).length, 1);
    assert.deepEqual(await db.select().from(s.privateFileUploads), []);
  } finally { await pg.close(); }
});

test('history duplicate and ambiguous parent IDs fail atomically instead of moving another job child', async () => {
  const { pg, db } = await persistenceDb();
  const repo = createWorkspaceRepository(() => db as any);
  try {
    const first = { ...syntheticJob('x'), versionHistory: [{ ...syntheticJob().versionHistory[0], versionId: 'y:versionHistory:z' }] };
    await repo.save('owner-a', { jobs: [first] }, 0);
    const before = await repo.read('owner-a');
    const collision = { ...syntheticJob('x:versionHistory:y'), versionHistory: [{ ...syntheticJob().versionHistory[0], versionId: 'z' }] };
    await assert.rejects(repo.import('owner-a', { jobs: [collision] }, 1), WorkspaceValidationError);
    assert.deepEqual(await repo.read('owner-a'), before);
    await assert.rejects(repo.import('owner-a', { jobs: [{ ...first, versionHistory: [first.versionHistory[0], first.versionHistory[0]] }] }, 1), WorkspaceValidationError);
  } finally { await pg.close(); }
});

test('imports merge selected records, overwrite conflicting IDs deterministically and distrust nested candidate provenance', async () => {
  const { pg, db } = await persistenceDb();
  const repo = createWorkspaceRepository(() => db as any);
  try {
    await repo.save('owner-a', { evidence: [syntheticEvidence('retained')], jobs: [syntheticJob('retained')] }, 0);
    const resume = { ...structuredClone(DEFAULT_BLANK_MASTER_RESUME), experience: [{ id: 'exp', employer: 'Synthetic', title: '', period: '', location: '', bullets: [{ id: 'bullet', section: 'experience', parentId: 'exp', text: 'Synthetic', targetRequirement: '', evidenceSource: '', whyThisBullet: '', underlyingEvidence: '', provenanceStatus: 'verified', enabled: true }] }] };
    const incoming = { profile: structuredClone(DEFAULT_PRIVATE_PROFILE), evidence: [syntheticEvidence('imported')], jobs: [{ ...syntheticJob('imported'), tailoredResume: resume }] };
    const result = await repo.import('owner-a', incoming, 1);
    assert.equal(result.jobs.length, 2); assert.equal(result.evidence.length, 2);
    assert.equal(result.evidence.find(e => e.id === 'imported').verificationStatus, 'requires-review');
    const importedJob = result.jobs.find(j => j.id === 'imported');
    assert.equal(importedJob.verificationStatus, 'UNKNOWN', 'candidate review must not fabricate ATS status');
    assert.equal(importedJob.tailoredResume.experience[0].bullets[0].provenanceStatus, 'requires-review');
    assert.equal(importedJob.tailoredResume.requiresUserReview, true);
    assert.equal(importedJob.versionHistory[0].requiresUserReview, true);
    assert.equal(result.profile.importProvenance.status, 'requires-review');
    const [importedApplication] = await db.select().from(s.applications).where(eq(s.applications.id, 'imported'));
    assert.equal(importedApplication.data.importProvenance && (importedApplication.data.importProvenance as any).status, 'requires-review');
    const overwritten = await repo.import('owner-a', { evidence: [syntheticEvidence('imported', 'Replacement synthetic assertion')] }, 2);
    assert.equal(overwritten.evidence.length, 2);
    assert.equal(overwritten.evidence.find(e => e.id === 'imported').rawEvidence, 'Replacement synthetic assertion');
    assert.equal((await repo.read('owner-b')).evidence.length, 0);
  } finally { await pg.close(); }
});
