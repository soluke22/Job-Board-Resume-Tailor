import test from 'node:test';
import assert from 'node:assert/strict';
import { acknowledgeWorkspaceMutation, canStartJobWorkflow, clipboardOutcome, createSynchronousSubmitGuard, durableUiLabel, planJobCreation, planMasterResumePersistence, planSearchProfilePersistence, runJobWorkflow, shouldAdoptSerializedDraft } from '../src/context/AppContext';

test('superseded acknowledgement is not reported as saved and preserves newer storage', async () => {
  let published = false;
  const outcome = await acknowledgeWorkspaceMutation({
    stage: () => ({ version: 1 }), persist: async () => {}, isCurrent: () => false,
    publish: () => { published = true; }, restore: () => assert.fail('successful supersession must not restore')
  });
  assert.deepEqual(outcome, { kind: 'superseded' });
  assert.equal(published, false);
});

test('search and master save plans acknowledge both changed document and dependent stale jobs', () => {
  const assessed: any = { id: 'job', fit: { score: 1 }, assessmentStatus: 'ASSESSED', tailoredResume: { id: 'r' }, proofPack: { provenance: { validationStatus: 'READY' } } };
  const search = planSearchProfilePersistence({ preferredRoleFamilies: [] } as any, {} as any, [assessed]);
  assert.equal(search.jobs[0].assessmentStatus, 'STALE');
  assert.equal(search.jobs[0].proofPack.provenance.validationStatus, 'STALE');
  const master = planMasterResumePersistence({ id: 'next' } as any, {} as any, [assessed]);
  assert.equal(master.masterResume.id, 'next');
  assert.equal(master.jobs[0].proofPack.provenance.validationStatus, 'STALE');
});

test('job creation plans from current storage rather than stale React and durable acknowledgement precedes analysis', async () => {
  const stored: any[] = [{ id: 'stored' }]; const created: any = { id: 'stable-id' };
  assert.deepEqual(planJobCreation(stored as any, created).map(job => job.id), ['stable-id', 'stored']);
  const events: string[] = [];
  const result = await runJobWorkflow(async () => { events.push('acknowledged-create'); return created; }, async id => { events.push(`analyze:${id}`); });
  assert.deepEqual(result, { kind: 'analyzed', jobId: 'stable-id' }); assert.deepEqual(events, ['acknowledged-create', 'analyze:stable-id']);
});

test('analysis partial state retries the exact ID without another create', async () => {
  let creates = 0; const first = await runJobWorkflow(async () => ({ id: `job-${++creates}` } as any), async () => { throw new Error('offline'); });
  assert.equal(first.kind, 'analysis-failed');
  const retry = await runJobWorkflow(async () => { creates++; return { id: 'wrong' } as any; }, async id => assert.equal(id, first.jobId), first.jobId);
  assert.deepEqual(retry, { kind: 'analyzed', jobId: first.jobId }); assert.equal(creates, 1);
});

test('workflow guards reject same-frame and fetch conflicts, and creation failure does not produce a job', async () => {
  const guard = createSynchronousSubmitGuard(); assert.equal(guard.acquire(), true); assert.equal(guard.acquire(), false);
  assert.equal(canStartJobWorkflow(true, false), false); assert.equal(canStartJobWorkflow(false, true), false); assert.equal(canStartJobWorkflow(false, false), true);
  await assert.rejects(runJobWorkflow(async () => { throw new Error('persist failed'); }, async () => assert.fail('must not analyze')));
});

test('durable labels, clean adoption, and clipboard outcomes stay truthful', async () => {
  assert.equal(shouldAdoptSerializedDraft({ x: 1 }, { x: 1 }), true); assert.equal(shouldAdoptSerializedDraft({ x: 2 }, { x: 1 }), false);
  assert.equal(durableUiLabel('failed', true), 'Not saved — reload required'); assert.equal(durableUiLabel('saved', true), 'Saved privately'); assert.equal(durableUiLabel('dirty', false), 'Unsaved changes');
  assert.equal(await clipboardOutcome(async () => { throw new Error('denied'); }, 'synthetic'), 'failed'); assert.equal(await clipboardOutcome(async () => {}, 'synthetic'), 'copied');
});
