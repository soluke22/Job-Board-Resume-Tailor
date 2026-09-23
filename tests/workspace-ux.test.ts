import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { acknowledgeWorkspaceMutation, createSynchronousSubmitGuard, planEvidenceAddition, planProfilePersistence, shouldAdoptCandidateDraft } from '../src/context/AppContext';

const source = (path: string) => readFile(path, 'utf8');

test('workspace save UX uses the established durable queue and truthful terminal states', async () => {
  const context = await source('src/context/AppContext.tsx');
  assert.match(context, /const saveProfile = async[\s\S]*?await acknowledgeWorkspaceMutation/);
  assert.match(context, /const addEvidenceItem = async[\s\S]*?storageService\.getEvidence\(workspaceMode\)[\s\S]*?storageService\.getJobs\(workspaceMode\)[\s\S]*?await acknowledgeWorkspaceMutation/);
  assert.match(context, /setSyncStatus\('Saving…'\)/);
  assert.match(context, /setSyncStatus\('Saved privately'\)/);
  assert.match(context, /setSyncStatus\('Not saved — reload required'\)/);
  assert.doesNotMatch(context, /saveWorkspaceData\([^)]*\)\s*;\s*await apiService\.saveWorkspaceData/, 'no second workspace save path');
});

test('profile publishes only after durable acknowledgement and failed profile persistence does not publish', async () => {
  let resolvePersist!: () => void;
  const profile = planProfilePersistence({ name: 'Before' } as any, { name: 'After' } as any, []);
  let published: typeof profile | undefined;
  const waiting = new Promise<void>(resolve => { resolvePersist = resolve; });
  const pending = acknowledgeWorkspaceMutation({
    stage: () => profile,
    persist: async () => await waiting,
    isCurrent: value => value === profile,
    publish: value => { published = value; },
    restore: () => assert.fail('successful profile stage must not restore')
  });
  assert.equal(published, undefined);
  resolvePersist(); await pending;
  assert.equal(published, profile);

  let failedPublished = false;
  await assert.rejects(acknowledgeWorkspaceMutation({
    stage: () => profile, persist: async () => { throw new Error('synthetic durable failure'); },
    isCurrent: value => value === profile, publish: () => { failedPublished = true; }, restore: () => {}
  }));
  assert.equal(failedPublished, false);
});

test('profile and evidence plans include dependent invalidation in the staged acknowledged collections', () => {
  const job: any = { id: 'synthetic-job', assessmentStatus: 'ASSESSED', fit: { score: 9 }, proofPack: { provenance: { validationStatus: 'READY' } } };
  const previousProfile: any = { name: 'Before' };
  const nextProfile: any = { name: 'After' };
  const profile = planProfilePersistence(previousProfile, nextProfile, [job]);
  assert.equal(profile.profile, nextProfile);
  assert.equal(profile.jobs[0].proofPack.provenance.validationStatus, 'STALE');

  const existing: any = { id: 'stored-evidence', rawEvidence: 'Stored record', enabled: true };
  const manual: any = { id: 'manual-evidence', rawEvidence: 'Manual record', enabled: true };
  const evidence = planEvidenceAddition([existing], manual, [job]);
  assert.deepEqual(evidence.evidence.map(item => item.id), ['manual-evidence', 'stored-evidence']);
  assert.equal(evidence.evidence[0].requiresUserReview, true);
  assert.equal(evidence.evidence[0].verificationStatus, 'session-unreviewed');
  assert.equal(evidence.jobs[0].proofPack.provenance.validationStatus, 'STALE');
  assert.equal(evidence.jobs[0].assessmentStatus, 'STALE');
});

test('failed evidence persistence publishes no phantom card and restores only an unsuperseded stage', async () => {
  const staged = planEvidenceAddition([], { id: 'manual-evidence', rawEvidence: 'Manual record', enabled: true } as any, []);
  let published = false;
  let restored = false;
  await assert.rejects(acknowledgeWorkspaceMutation({
    stage: () => staged, persist: async () => { throw new Error('synthetic durable failure'); },
    isCurrent: value => value === staged,
    publish: () => { published = true; }, restore: () => { restored = true; }
  }));
  assert.equal(published, false);
  assert.equal(restored, true);

  restored = false;
  await assert.rejects(acknowledgeWorkspaceMutation({
    stage: () => staged, persist: async () => { throw new Error('synthetic superseded failure'); },
    isCurrent: () => false,
    publish: () => { published = true; }, restore: () => { restored = true; }
  }));
  assert.equal(restored, false);
});

test('candidate draft adoption and synchronous same-frame submit guard are behavioral contracts', () => {
  const adopted = { name: 'Canonical candidate' } as any;
  assert.equal(shouldAdoptCandidateDraft({ ...adopted }, adopted), true);
  assert.equal(shouldAdoptCandidateDraft({ ...adopted, name: 'Unsaved candidate edit' }, adopted), false);
  const guard = createSynchronousSubmitGuard();
  assert.equal(guard.acquire(), true);
  assert.equal(guard.acquire(), false);
  guard.release();
  assert.equal(guard.acquire(), true);
});

test('candidate draft and evidence dialogs retain user input until durable acknowledgement', async () => {
  const candidate = await source('src/components/CandidateSetupView.tsx');
  const evidence = await source('src/components/EvidenceBankView.tsx');
  assert.match(candidate, /shouldAdoptCandidateDraft\(draft, adoptedProfile\.current\)/);
  assert.match(candidate, /profileIsDirty \? 'Unsaved changes' : syncStatus/);
  assert.match(candidate, /const profileSubmitting = useRef\(createSynchronousSubmitGuard\(\)\)/);
  assert.match(candidate, /if \(!profileSubmitting\.current\.acquire\(\)\) return;/);
  assert.match(candidate, /await saveProfile\(draft\)/);
  assert.match(evidence, /const addSubmitting = useRef\(false\)/);
  assert.match(evidence, /await addEvidenceItem\(newItem\);\s*setIsAddModalOpen\(false\)/);
  assert.match(evidence, /const approvalSubmitting = useRef\(false\)/);
  assert.match(evidence, /await approveEvidenceItem\(reviewing\); setReviewing\(null\)/);
  assert.match(evidence, /\{adding \? 'Saving…' : 'Save Evidence'\}/);
});

test('workspace remount keys are explicitly namespaced', async () => {
  const app = await source('src/App.tsx');
  assert.match(app, /main-workspace-\$\{workspaceMode\}-\$\{workspaceEpoch\}/);
  assert.match(app, /quick-data-grab-workspace-\$\{workspaceMode\}-\$\{workspaceEpoch\}/);
});
