import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import * as schema from '../server/db/schema';
import { createWorkspaceRepository, WorkspaceConflict, WorkspaceValidationError } from '../server/workspaceRepository';
import { DEFAULT_PRIVATE_PROFILE, DEFAULT_SEARCH_PROFILE, DEFAULT_BLANK_MASTER_RESUME } from '../src/data/privateSeedTemplate';
import { workspaceInput } from '../server/db/workspaceValidation';

// Full synthetic records exercise the persisted snapshot contract, not a partial patch API.
const evidence = (id: string, rawEvidence: string) => ({
  id, rawEvidence, sourceType: 'user-interview', sourceLocation: 'synthetic fixture',
  verificationStatus: 'verified', context: 'Synthetic test evidence', technologies: [],
  responsibilities: [], outcomes: [], supportedVerbs: [], supportedMetrics: [],
  strength: 'Medium', roleFamilyRelevance: [], source: 'synthetic fixture', enabled: true,
});
const job = () => ({
  id: 'job-a', title: 'Synthetic role', company: 'Synthetic company', atsProvider: 'unknown',
  canonicalUrl: 'https://example.invalid/jobs/job-a', applyUrl: 'https://example.invalid/jobs/job-a',
  description: 'Synthetic job description', location: '', remoteStatus: 'unknown', employmentType: '',
  firstSeenAt: '2026-01-01', verificationStatus: 'UNKNOWN', isCurrentlyListed: false,
  sourceChannel: 'manual', primaryRoleFamily: 'frontend-product', roleModifiers: [], seniority: '',
  hardRequirements: [], preferredRequirements: [], technologies: [], responsibilities: [],
  hiringSignals: [], hardBlockers: [], softGaps: [], qualificationFit: 5, evidenceCoverage: 0,
  applicationPriority: 'review', priorityReason: 'Synthetic fixture', applicationStatus: 'APPLIED',
  fit: { qualificationFit: 5, evidenceCoverage: 0, applicationPriority: 'review',
    initialFitScore: 5, tailoredFitScore: 5, verdict: 'Borderline', verdictReason: 'Synthetic fixture',
    strongestMatch: '', biggestActualGap: '', blockers: [], unsupportedRequirements: [], canTailor: false },
  versionHistory: [{ versionId: 'v1', timestamp: '2026-01-01', note: 'synthetic', resume: structuredClone(DEFAULT_BLANK_MASTER_RESUME) }],
  statusHistory: [{ from: 'TAILORED', to: 'APPLIED', timestamp: '2026-01-01' }],
});

test('durable workspace survives database reopen; owner scope, concurrency and import review', async () => {
  const path = await mkdtemp(join(tmpdir(), 'careeros-workspace-'));
  let pg = new PGlite(path);
  let db = drizzle(pg, { schema });
  try {
    await migrate(db, { migrationsFolder: './migrations' });
    await db.insert(schema.user).values([
      { id: 'owner-a', name: 'Synthetic A', email: 'a@example.invalid' },
      { id: 'owner-b', name: 'Synthetic B', email: 'b@example.invalid' },
    ]);
    let repo = createWorkspaceRepository(() => db as any);
    const blank = await repo.read('owner-a');
    assert.equal(blank.profile, null);
    assert.deepEqual(blank.jobs, []);
    const initial = { profile: { ...structuredClone(DEFAULT_PRIVATE_PROFILE), name: 'Synthetic Candidate' },
      evidence: [evidence('same-id', 'Owner A synthetic evidence')], jobs: [job()] };
    assert(workspaceInput.safeParse(initial).success, 'initial fixture satisfies persisted record contracts');
    await repo.save('owner-a', initial, 0);
    await repo.save('owner-b', { evidence: [evidence('same-id', 'Owner B evidence')] }, 0);
    assert.equal((await repo.read('owner-b')).evidence[0].rawEvidence, 'Owner B evidence');
    assert.equal((await repo.read('owner-b')).profile, null);
    assert.deepEqual((await repo.read('owner-b')).jobs, []);
    await assert.rejects(repo.save('owner-a', { evidence: [] }, 0), WorkspaceConflict);
    assert.equal((await repo.read('owner-a')).evidence.length, 1);
    await pg.close();
    pg = new PGlite(path);
    db = drizzle(pg, { schema });
    repo = createWorkspaceRepository(() => db as any);
    const restored = await repo.read('owner-a');
    assert.equal(restored.profile.name, 'Synthetic Candidate');
    assert.equal(restored.jobs[0].fit.qualificationFit, 5);
    assert.equal(restored.jobs[0].versionHistory[0].versionId, 'v1');
    assert.equal(restored.jobs[0].applicationStatus, 'APPLIED');
    const imported = await repo.import('owner-a', { evidence: [evidence('imported', 'Untrusted local assertion')] }, 1);
    assert.equal(imported.evidence.find(e => e.id === 'imported').verificationStatus, 'requires-review');
    assert.equal(imported.evidence.length, 2);
    assert.equal(imported.profile.name, 'Synthetic Candidate');
    assert.equal(imported.auditLog.length, 2);
    const { fit: omittedFit, versionHistory: omittedVersions, statusHistory: omittedStatus, ...baseJob } = job();
    await repo.save('owner-a', { jobs: [{ ...baseJob, title: 'Edited title' }] }, 2);
    assert.equal((await repo.read('owner-a')).jobs[0].fit.qualificationFit, 5, 'absent attachment is preserved');
    await assert.rejects(repo.save('owner-a', { evidence: [evidence('x', 'Synthetic'), evidence('x', 'Synthetic')] }, 3), WorkspaceValidationError);
    await assert.rejects(repo.save('owner-a', { ownerId: 'owner-b' }, 3), WorkspaceValidationError);
    await assert.rejects(repo.save('owner-a', { profile: { name: ['invalid'] } }, 3), WorkspaceValidationError);
    await assert.rejects(repo.save('owner-a', { profile: { ...structuredClone(DEFAULT_PRIVATE_PROFILE), name: ['invalid'] } }, 3), WorkspaceValidationError);
    await assert.rejects(repo.save('owner-a', { evidence: [{ id: 'partial' }] }, 3), WorkspaceValidationError);
    assert.equal((await repo.read('owner-a')).revision, 3, 'invalid domain fields roll back revision');
    await assert.rejects(repo.read(''), WorkspaceValidationError);
    await repo.save('owner-a', { evidence: [] }, 3);
    assert.equal((await repo.read('owner-a')).evidence.length, 0);
    assert.equal((await repo.read('owner-b')).evidence.length, 1);
    const raced = await Promise.allSettled([
      repo.save('owner-a', { searchProfile: { ...structuredClone(DEFAULT_SEARCH_PROFILE), remotePreference: 'any' } }, 4),
      repo.save('owner-a', { searchProfile: { ...structuredClone(DEFAULT_SEARCH_PROFILE), remotePreference: 'remote_only' } }, 4),
    ]);
    assert.equal(raced.filter(r => r.status === 'fulfilled').length, 1);
    assert.equal(raced.filter(r => r.status === 'rejected' && r.reason instanceof WorkspaceConflict).length, 1);
  } finally {
    await pg.close();
    await rm(path, { recursive: true, force: true });
  }
});
