import test from 'node:test';
import assert from 'node:assert/strict';
import { acknowledgeWorkspaceMutation, canStartJobWorkflow, clipboardOutcome, createSavedJobRetry, createSynchronousSubmitGuard, durableUiLabel, jobRetryUi, planJobCreation, planMasterResumePersistence, planSearchProfilePersistence, runCreateAndAnalyzeJob, runJobWorkflow, shouldAdoptSerializedDraft, validateAndPersistSearchPreferences } from '../src/context/AppContext';
import { assessmentDisplay, currentFit, jobPrimaryAction } from '../src/utils/assessmentView';

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

test('job navigation occurs only after successful analysis, while failures retain the stable saved ID', async () => {
  const events: string[] = [];
  const success = await runCreateAndAnalyzeJob(
    async () => { events.push('create'); return { id: 'saved-job' } as any; },
    async id => { events.push(`analyze:${id}`); },
    id => events.push(`navigate:${id}`)
  );
  assert.deepEqual(success, { kind: 'analyzed', jobId: 'saved-job' });
  assert.deepEqual(events, ['create', 'analyze:saved-job', 'navigate:saved-job']);

  events.length = 0;
  const partial = await runCreateAndAnalyzeJob(
    async () => { events.push('create'); return { id: 'saved-job' } as any; },
    async id => { events.push(`analyze:${id}`); throw new Error('offline'); },
    id => events.push(`navigate:${id}`)
  );
  assert.equal(partial.kind, 'analysis-failed');
  assert.deepEqual(events, ['create', 'analyze:saved-job']);

  const retry = createSavedJobRetry(partial.jobId, { company: 'Saved company', rawDescription: 'Saved description' });
  assert.equal(retry.jobId, 'saved-job'); assert.equal(Object.isFrozen(retry.draft), true);
  assert.deepEqual(jobRetryUi(retry.jobId), { fieldsDisabled: true, presetsDisabled: true, fetchDisabled: true, primaryLabel: 'Retry analysis' });
  await runCreateAndAnalyzeJob(
    async () => assert.fail('retry must not create another job'),
    async id => { assert.equal(id, retry.jobId); events.push(`retry:${id}`); },
    id => events.push(`navigate:${id}`), retry.jobId
  );
  assert.deepEqual(events.slice(-2), ['retry:saved-job', 'navigate:saved-job']);
});

test('search preference validation stays local and valid input may enter durable saving', async () => {
  let saves = 0;
  const malformed = await validateAndPersistSearchPreferences('{ invalid json', async () => { saves++; });
  assert.deepEqual(malformed, { kind: 'invalid', message: 'Invalid search preferences. Fix the JSON and try again.' });
  assert.equal(saves, 0); assert.equal(durableUiLabel('dirty', true), 'Unsaved changes');
  assert.notEqual(durableUiLabel('dirty', true), 'Not saved — reload required');

  const valid = await validateAndPersistSearchPreferences(JSON.stringify({ preferredRoleFamilies: [], technologyStrengths: [] }), async () => { saves++; });
  assert.equal(valid.kind, 'valid');
  assert.equal(saves, 1); assert.equal(durableUiLabel('saving', true), 'Saving…'); assert.equal(durableUiLabel('saved', true), 'Saved privately');
});

test('assessment display exposes conclusions only for current assessed fits', () => {
  const assessed: any = { assessmentStatus: 'ASSESSED', fit: { verdict: 'Apply', verdictReason: 'Supported', strongestMatch: 'React', biggestActualGap: 'GraphQL', unsupportedRequirements: [] } };
  assert.equal(currentFit(assessed)?.verdict, 'Apply'); assert.equal(assessmentDisplay(assessed).state, 'current');
  for (const assessmentStatus of ['UNASSESSED', 'STALE'] as const) {
    const job: any = { ...assessed, assessmentStatus };
    const display = assessmentDisplay(job);
    assert.equal(currentFit(job), undefined);
    assert.notEqual(display.verdict, 'Borderline');
    assert.equal(display.biggestActualGap, 'Unknown until assessment completes.');
    assert.equal(display.unsupportedRequirements, undefined);
    assert.match(display.summary, /assessment|analysis/i);
    assert.equal(jobPrimaryAction(job), 'Run analysis');
  }
  assert.equal(jobPrimaryAction({ ...assessed, fit: { ...assessed.fit, canTailor: false } }), 'Skip Guardrail');
  assert.equal(jobPrimaryAction({ ...assessed, fit: { ...assessed.fit, canTailor: true } }), 'Tailor Studio');
});

test('workflow guards reject same-frame and fetch conflicts, and creation failure does not produce a job', async () => {
  const guard = createSynchronousSubmitGuard(); assert.equal(guard.acquire(), true); assert.equal(guard.acquire(), false);
  assert.equal(canStartJobWorkflow(true, false), false); assert.equal(canStartJobWorkflow(false, true), false); assert.equal(canStartJobWorkflow(false, false), true);
  const events: string[] = [];
  await assert.rejects(runCreateAndAnalyzeJob(
    async () => { events.push('create'); throw new Error('persist failed'); },
    async () => assert.fail('must not analyze'),
    id => events.push(`navigate:${id}`)
  ));
  assert.deepEqual(events, ['create']);
});

test('durable labels, clean adoption, and clipboard outcomes stay truthful', async () => {
  assert.equal(shouldAdoptSerializedDraft({ x: 1 }, { x: 1 }), true); assert.equal(shouldAdoptSerializedDraft({ x: 2 }, { x: 1 }), false);
  assert.equal(durableUiLabel('failed', true), 'Not saved — reload required'); assert.equal(durableUiLabel('saved', true), 'Saved privately'); assert.equal(durableUiLabel('dirty', false), 'Unsaved changes');
  assert.equal(await clipboardOutcome(async () => { throw new Error('denied'); }, 'synthetic'), 'failed'); assert.equal(await clipboardOutcome(async () => {}, 'synthetic'), 'copied');
});
