import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = (path: string) => readFile(path, 'utf8');

test('workspace save UX uses the established durable queue and truthful terminal states', async () => {
  const context = await source('src/context/AppContext.tsx');
  assert.match(context, /const saveProfile = async[\s\S]*?await persistCurrent\(\)/);
  assert.match(context, /const addEvidenceItem = async[\s\S]*?storageService\.saveEvidence\(updated, workspaceMode\);\s*try \{\s*await persistCurrent\(\);\s*setEvidence\(updated\)/);
  assert.match(context, /setSyncStatus\('Saving…'\)/);
  assert.match(context, /setSyncStatus\('Saved privately'\)/);
  assert.match(context, /setSyncStatus\('Not saved — reload required'\)/);
  assert.doesNotMatch(context, /saveWorkspaceData\([^)]*\)\s*;\s*await apiService\.saveWorkspaceData/, 'no second workspace save path');
});

test('candidate draft and evidence dialogs retain user input until durable acknowledgement', async () => {
  const candidate = await source('src/components/CandidateSetupView.tsx');
  const evidence = await source('src/components/EvidenceBankView.tsx');
  assert.match(candidate, /JSON\.stringify\(draft\) === JSON\.stringify\(adoptedProfile\.current\)/);
  assert.match(candidate, /profileIsDirty \? 'Unsaved changes' : syncStatus/);
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
