import test from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import express from 'express';
import { sql } from 'drizzle-orm';
import { persistenceDb, syntheticEvidence, syntheticJob } from './helpers/persistence';
import { createWorkspaceRepository, evidenceReviewHash, WorkspaceConflict } from '../server/workspaceRepository';
import { createWorkspaceRouter } from '../server/workspaceRoutes';
import { eligibleEvidence, assessmentMetadata, isCurrent } from '../server/assessment';
import { EvidenceReviewBadge } from '../src/components/EvidenceBankView';
import { evidenceClaimFields, preserveEvidenceReview, unreviewedEvidence } from '../src/utils/evidenceReview';
import { invalidateJobArtifacts, canCopyArtifact } from '../src/utils/artifactReadiness';
import type { EvidenceItem } from '../src/types';
import { storageService } from '../src/services/storage';

const fixture = () => ({ ...syntheticEvidence('review-a', 'Built React components and wrote component tests.'),
  technologies: ['React', 'TypeScript'], employer: '', role: '', period: '', context: 'Personal',
  verificationStatus: 'verified' } as EvidenceItem);
const badge = (item: EvidenceItem) => renderToStaticMarkup(createElement(EvidenceReviewBadge, { item, canReview: true, onReview() {} }));

test('manual evidence needs review; enabling never approves; reviewed disabled evidence stays reviewed', () => {
  const manual = unreviewedEvidence(fixture());
  assert.equal(manual.verificationStatus, 'session-unreviewed');
  assert.equal(manual.requiresUserReview, true);
  assert.deepEqual(eligibleEvidence([manual]), []);
  const enabled = preserveEvidenceReview({ ...manual, enabled: true }, { ...manual, enabled: false });
  assert.deepEqual(eligibleEvidence([enabled]), []);
  assert.match(badge(enabled), /Needs review/); assert.match(badge(enabled), /Review &amp; approve/);
  const verified = { ...fixture(), requiresUserReview: false, lastVerifiedAt: '2026-01-01' };
  assert.equal(eligibleEvidence([verified]).length, 1);
  const disabled = preserveEvidenceReview({ ...verified, enabled: false }, verified);
  assert.equal(disabled.verificationStatus, 'verified'); assert.equal(disabled.requiresUserReview, false);
  assert.equal(disabled.lastVerifiedAt, verified.lastVerifiedAt);
  assert.deepEqual(eligibleEvidence([disabled]), []); assert.match(badge(disabled), /Disabled/);
  assert.deepEqual(eligibleEvidence([preserveEvidenceReview({ ...verified, requiresUserReview: true }, verified)]), [], 'explicit demotion also fails closed');
});

test('every claim-bearing edit demotes verified evidence and removes the approval timestamp', () => {
  const previous = { ...fixture(), requiresUserReview: false, lastVerifiedAt: '2026-01-01' };
  for (const field of evidenceClaimFields) {
    const changed = { ...previous, [field]: Array.isArray(previous[field]) ? ['Changed claim'] : 'Changed claim' };
    const edited = preserveEvidenceReview(changed, previous);
    assert.equal(edited.verificationStatus, 'requires-review', field);
    assert.equal(edited.requiresUserReview, true, field);
    assert.equal(edited.lastVerifiedAt, undefined, field);
    assert.deepEqual(eligibleEvidence([edited]), [], field);
  }
});

test('explicit owner approval persists; imports and ordinary saves cannot promote or rewrite reviewed content', async () => {
  const { pg, db } = await persistenceDb(); const repo = createWorkspaceRepository(() => db as any);
  try {
    let w = await repo.save('owner-a', { evidence: [fixture()] }, 0);
    assert.equal(w.evidence[0].verificationStatus, 'session-unreviewed');
    assert.deepEqual(eligibleEvidence(w.evidence), []);
    w = await repo.save('owner-a', { evidence: [{ ...w.evidence[0], verificationStatus: 'verified', requiresUserReview: false }] }, w.revision);
    assert.deepEqual(eligibleEvidence(w.evidence), []);
    w = await repo.approveEvidence('owner-a', { evidenceId: 'review-a', revision: w.revision, contentHash: evidenceReviewHash(w.evidence[0]) });
    assert.equal(w.evidence[0].verificationStatus, 'verified'); assert.equal(w.evidence[0].requiresUserReview, false);
    assert.ok(w.evidence[0].lastVerifiedAt); assert.equal(eligibleEvidence(w.evidence).length, 1);
    assert.match(badge(w.evidence[0]), /Verified/); assert.doesNotMatch(badge(w.evidence[0]), /Review &amp; approve/);
    assert.equal(w.auditLog.at(-1)?.eventType, 'EVIDENCE_APPROVED');
    const reloaded = await createWorkspaceRepository(() => db as any).read('owner-a');
    assert.deepEqual(reloaded.evidence, w.evidence, 'private serialization/repository reload preserves approval');
    storageService.hydratePrivateWorkspace(JSON.parse(JSON.stringify(reloaded)));
    assert.deepEqual(storageService.getEvidence('PRIVATE_WORKSPACE'), w.evidence, 'private client hydration preserves canonical review fields');
    w = await repo.save('owner-a', { evidence: [{ ...w.evidence[0], rawEvidence: 'Changed claim', verificationStatus: 'verified', requiresUserReview: false }] }, w.revision);
    assert.equal(w.evidence[0].verificationStatus, 'requires-review'); assert.deepEqual(eligibleEvidence(w.evidence), []);
    w = await repo.import('owner-a', { evidence: [fixture()] }, w.revision);
    assert.equal(w.evidence[0].requiresUserReview, true); assert.deepEqual(eligibleEvidence(w.evidence), []);
    w = await repo.approveEvidence('owner-a', { evidenceId: 'review-a', revision: w.revision, contentHash: evidenceReviewHash(w.evidence[0]) });
    assert.equal(eligibleEvidence(w.evidence).length, 1);
    const before = await repo.read('owner-a');
    await db.execute(sql`CREATE FUNCTION fail_review_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'synthetic approval audit failure'; END; $$`);
    await db.execute(sql`CREATE TRIGGER fail_review_audit BEFORE INSERT ON audit_events FOR EACH ROW EXECUTE FUNCTION fail_review_audit()`);
    await assert.rejects(repo.approveEvidence('owner-a', { evidenceId: 'review-a', revision: before.revision, contentHash: evidenceReviewHash(before.evidence[0]) }));
    assert.deepEqual(await repo.read('owner-a'), before, 'approval and audit roll back together');
  } finally { await pg.close(); }
});

test('approval HTTP rejects supplied trust, absent/cross-owner records, stale content and revisions without mutation or budgets', async () => {
  const { pg, db } = await persistenceDb(); const repo = createWorkspaceRepository(() => db as any);
  const app = express(); app.use(express.json());
  app.use('/api/workspace', createWorkspaceRouter(repo, (req, res, next) => {
    const owner = req.headers['x-synthetic-owner'];
    if (owner !== 'owner-a' && owner !== 'owner-b') { res.status(401).end(); return; }
    res.locals.ownerId = owner; next();
  }));
  const server = app.listen(0, '127.0.0.1'); await new Promise<void>(resolve => server.once('listening', resolve));
  const base = `http://127.0.0.1:${(server.address() as any).port}/api/workspace/evidence-approval`;
  const post = (body: any, owner = 'owner-a') => fetch(base, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-synthetic-owner': owner }, body: JSON.stringify(body) });
  try {
    const w = await repo.save('owner-a', { evidence: [fixture()] }, 0);
    const request = { evidenceId: 'review-a', revision: w.revision, contentHash: evidenceReviewHash(w.evidence[0]) };
    assert.equal((await post(request, 'anonymous')).status, 401);
    assert.equal((await post({ ...request, evidence: fixture() })).status, 400);
    assert.equal((await post({ ...request, verificationStatus: 'verified' })).status, 400);
    assert.equal((await post({ ...request, contentHash: '0'.repeat(64) })).status, 409);
    assert.equal((await post({ ...request, evidenceId: 'absent' })).status, 400);
    assert.equal((await post({ ...request, revision: 0 }, 'owner-b')).status, 400);
    assert.deepEqual(await repo.read('owner-a'), w);
    assert.equal((await db.execute(sql`SELECT count(*) AS count FROM provider_usage`)).rows[0].count, 0);
    const results = await Promise.all([post(request), post(request)]);
    assert.deepEqual(results.map(r => r.status).sort(), [200, 409]);
    const approved = await repo.read('owner-a');
    await assert.rejects(repo.approveEvidence('owner-a', request), WorkspaceConflict);
    assert.deepEqual(await repo.read('owner-a'), approved);
    const changed = await repo.save('owner-a', { evidence: [{ ...approved.evidence[0], technologies: ['Swift'] }] }, approved.revision);
    assert.equal((await post({ ...request, revision: changed.revision })).status, 409, 'old inspected content cannot approve an edited persisted record');
  } finally { await new Promise<void>(resolve => server.close(() => resolve())); await pg.close(); }
});

test('approval and material edits change canonical fingerprints and fence dependent artifacts', async () => {
  const { pg, db } = await persistenceDb(); const repo = createWorkspaceRepository(() => db as any);
  try {
    let w = await repo.save('owner-a', { evidence: [fixture()] }, 0);
    const job: any = { ...syntheticJob('dependent'), description: 'React required', jdSource: 'user-provided', assessmentStatus: 'ASSESSED' };
    const unreviewedBasis = assessmentMetadata(job, w.evidence, null);
    w = await repo.approveEvidence('owner-a', { evidenceId: 'review-a', revision: w.revision, contentHash: evidenceReviewHash(w.evidence[0]) });
    const reviewedBasis = assessmentMetadata(job, w.evidence, null);
    assert.equal(isCurrent(unreviewedBasis, reviewedBasis), false);
    job.assessmentMetadata = reviewedBasis;
    w = await repo.saveAssessment('owner-a', { jobs: [job] }, w.revision, job.id);
    assert.equal(w.jobs[0].assessmentStatus, 'ASSESSED');
    w = await repo.save('owner-a', { evidence: [{ ...w.evidence[0], outcomes: ['Changed outcome'] }] }, w.revision);
    assert.equal(w.jobs[0].assessmentStatus, 'STALE');
    const artifactJob: any = { ...job, recruiterOutreach: { provenance: { validationStatus: 'READY', validatedTextHash: 'old' } } };
    const stale = invalidateJobArtifacts(artifactJob, 'Assessment source changed; reassess and regenerate before use');
    assert.equal(canCopyArtifact(stale.recruiterOutreach), false);
  } finally { await pg.close(); }
});
