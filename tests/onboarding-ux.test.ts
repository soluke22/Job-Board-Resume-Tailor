import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { applyAdvancedSearchPreferencesDraft, canHideAdvancedPreferences, commonSearchPreferences, isPrivateOnboarding, mergeCommonSearchPreferences, ordinaryRoleFamilies, privateOnboardingSteps, ROLE_FAMILY_OPTIONS, toggleOrdinaryRoleFamily } from '../src/components/CandidateSetupView';
import { importDestination, importReviewWarning, previewImport, selectedImport } from '../src/services/legacyImport';
import { DEFAULT_SEARCH_PROFILE } from '../src/data/privateSeedTemplate';

test('ordinary search-preference controls round-trip while preserving advanced fields', () => {
  const original: any = {
    ...structuredClone(DEFAULT_SEARCH_PROFILE), preferredRoleFamilies: ['frontend-product'], targetSeniority: ['Senior'],
    salaryPreference: { minTarget: 175000, minimumAcceptable: 150000 },
    hiringProcessPreferences: { preferTakeHome: true, notes: 'Prefer practical work samples' },
    preferredModifiers: ['platform'], technologyStrengths: ['TypeScript']
  };
  const common = commonSearchPreferences(original);
  assert.deepEqual(mergeCommonSearchPreferences(original, common), original, 'an untouched ordinary form is not dirty and does not rewrite advanced data');
  const changed = { ...common, locations: 'Boston; Remote', technologyStrengths: 'TypeScript; React', relocationAllowed: true };
  const saved = mergeCommonSearchPreferences(original, changed);
  assert.deepEqual(saved.salaryPreference, original.salaryPreference);
  assert.deepEqual(saved.hiringProcessPreferences, original.hiringProcessPreferences);
  assert.deepEqual(saved.preferredModifiers, ['platform']);
  assert.deepEqual(saved.hybridLocations, ['Boston', 'Remote']);
  assert.deepEqual(saved.technologyStrengths, ['TypeScript', 'React']);
  assert.equal(saved.relocationAllowed, true);
  assert.equal(canHideAdvancedPreferences(JSON.stringify(original, null, 2), original), true);
  assert.equal(canHideAdvancedPreferences('{"malformed": true}', original), false, 'an unsaved advanced draft cannot be hidden and silently discarded');
});

test('ordinary role-family checkboxes map only the exact PrimaryRoleFamily values', () => {
  assert.deepEqual(ROLE_FAMILY_OPTIONS.map(option => option.value), ['frontend-product', 'ui-platform-design-systems', 'frontend-heavy-fullstack', 'production-support-frontend', 'forward-deployed-software']);
  let selected = toggleOrdinaryRoleFamily([], 'frontend-product');
  selected = toggleOrdinaryRoleFamily(selected, 'forward-deployed-software');
  assert.deepEqual(selected, ['frontend-product', 'forward-deployed-software']);
  assert.deepEqual(ordinaryRoleFamilies(['frontend-product', 'unknown-family', 'frontend-product']), ['frontend-product']);
  assert.throws(() => toggleOrdinaryRoleFamily([], 'unknown-family'), /Unsupported ordinary role family/);
});

test('unknown role families survive unrelated edits and toggling a known checkbox', () => {
  const original: any = { ...structuredClone(DEFAULT_SEARCH_PROFILE), preferredRoleFamilies: ['frontend', 'legacy-family'] };
  const common = commonSearchPreferences(original);
  assert.deepEqual(common.roleFamilies, [], 'unknown values are not invented as checkbox options');
  const locationOnly = mergeCommonSearchPreferences(original, { ...common, locations: 'Boston' });
  assert.deepEqual(locationOnly.preferredRoleFamilies, ['frontend', 'legacy-family']);
  assert.deepEqual(locationOnly.hybridLocations, ['Boston']);
  const toggled = mergeCommonSearchPreferences(original, { ...common, roleFamilies: toggleOrdinaryRoleFamily(common.roleFamilies, 'frontend-product') });
  assert.deepEqual(toggled.preferredRoleFamilies, ['frontend', 'legacy-family', 'frontend-product']);
  assert.deepEqual(mergeCommonSearchPreferences(original, common), original, 'untouched values round-trip exactly');
});

test('applied Advanced JSON owns the full profile and later structured edits preserve unrelated fields', () => {
  const original: any = { ...structuredClone(DEFAULT_SEARCH_PROFILE), preferredRoleFamilies: ['legacy-family'], salaryPreference: { minTarget: 100000 }, technologyStrengths: ['Before'] };
  const advanced = { ...original, salaryPreference: { minTarget: 180000 }, technologyStrengths: ['Advanced React'], targetSeniority: ['Principal'], preferredRoleFamilies: ['legacy-family', 'frontend-product'] };
  const applied = applyAdvancedSearchPreferencesDraft(JSON.stringify(advanced));
  assert.equal(applied.kind, 'valid');
  if (applied.kind !== 'valid') return;
  assert.deepEqual(applied.common.roleFamilies, ['frontend-product']);
  assert.equal(applied.common.technologyStrengths, 'Advanced React');
  assert.equal(applied.common.seniority, 'Principal');
  assert.deepEqual(mergeCommonSearchPreferences(applied.value, applied.common), advanced, 'save payload exactly matches the applied full JSON');
  const laterCommon = { ...applied.common, locations: 'Boston', roleFamilies: toggleOrdinaryRoleFamily(applied.common.roleFamilies, 'forward-deployed-software') };
  const savePayload = mergeCommonSearchPreferences(applied.value, laterCommon);
  assert.deepEqual(savePayload.preferredRoleFamilies, ['legacy-family', 'frontend-product', 'forward-deployed-software']);
  assert.deepEqual(savePayload.technologyStrengths, ['Advanced React']);
  assert.deepEqual(savePayload.targetSeniority, ['Principal']);
  assert.deepEqual(savePayload.salaryPreference, { minTarget: 180000 });
  assert.deepEqual(savePayload.hybridLocations, ['Boston']);
  assert.deepEqual(JSON.parse(JSON.stringify(savePayload)), savePayload, 'serialized save payload is the composed profile without a second overwrite');
  assert.deepEqual(applyAdvancedSearchPreferencesDraft('{ broken'), { kind: 'invalid', message: 'Invalid search preferences. Fix the JSON and try again.' });
  assert.equal(applyAdvancedSearchPreferencesDraft('{"preferredRoleFamilies":[],"technologyStrengths":[]}').kind, 'invalid', 'incomplete valid JSON is rejected locally');
});

test('Setup applies full JSON before saving the composed profile', async () => {
  const source = await readFile('src/components/CandidateSetupView.tsx', 'utf8');
  assert.match(source, /const applied = applyAdvancedSearchPreferencesDraft\(preferences\)/);
  assert.match(source, /setAppliedPreferences\(applied\.value\); setCommonPreferences\(applied\.common\)/);
  assert.match(source, /const serialized = JSON\.stringify\(composedPreferences, null, 2\)/);
  assert.match(source, /validateAndPersistSearchPreferences\(serialized, saveSearchProfile\)/);
});

test('import preview is selective and non-mutating with explicit destination and trust warnings', () => {
  const input: any = { evidence: [{ id: 'e1', rawEvidence: 'Synthetic local note', source: 'Record metadata source' }], projects: [{ id: 'p1', name: 'Synthetic project' }], profile: { name: 'Synthetic profile' }, searchProfile: structuredClone(DEFAULT_SEARCH_PROFILE) };
  const before = structuredClone(input);
  const choices = previewImport(input, 'fixture.json');
  assert.deepEqual(input, before, 'preview must not mutate its local input or import anything');
  assert.equal(choices.length, 4);
  const evidence = choices.find(choice => choice.field === 'evidence')!;
  assert.equal(evidence.destination, 'Evidence Bank');
  assert.equal(evidence.importSource, 'fixture.json');
  assert.equal(evidence.recordSource, 'Record metadata source', 'record metadata never replaces the import container');
  assert.match(evidence.warning, /remains untrusted.*Evidence Bank review.*support claims/i);
  const project = choices.find(choice => choice.field === 'projects')!;
  assert.match(project.warning, /not verified by its presence.*supporting reviewed evidence/i);
  assert.match(choices.find(choice => choice.field === 'profile')!.warning, /review.*accuracy/i);
  assert.doesNotMatch(choices.find(choice => choice.field === 'profile')!.warning, /Evidence Bank/i);
  assert.match(choices.find(choice => choice.field === 'searchProfile')!.warning, /review.*accuracy/i);
  assert.deepEqual(selectedImport(choices, new Set([evidence.key])), { evidence: [input.evidence[0]] });
  assert.equal(importDestination('jobs'), 'Pipeline');
  assert.match(importReviewWarning('masterResume'), /untrusted/i);
});

test('private onboarding provides ordered actual next steps without treating presence as verification', () => {
  const steps = privateOnboardingSteps({ profileStarted: false, searchPreferencesStarted: false, masterResumeStarted: true, evidenceCount: 1, projectCount: 2, skillCount: 3, jobCount: 0 });
  assert.deepEqual(steps.map(step => step.id), ['profile', 'search-preferences', 'master-resume', 'evidence', 'projects', 'skills', 'pipeline']);
  assert.equal(new Set(steps.map(step => step.id)).size, steps.length, 'stable IDs avoid duplicate Setup keys');
  assert.match(steps[1].detail, /roles, locations, work style, and technologies/i);
  assert.match(steps[2].detail, /selective import.*structured records.*Source documents are stored without automatic parsing or trust/i);
  assert.match(steps[3].detail, /review status separately/i);
  assert.match(steps[4].detail, /does not verify claims/i);
  assert.match(steps[5].detail, /does not verify proficiency/i);
});

test('empty Projects and Skills render neutral records wording with a Setup return affordance', async () => {
  const [projects, skills] = await Promise.all(['src/components/ProjectsView.tsx', 'src/components/SkillsView.tsx'].map(path => readFile(path, 'utf8')));
  for (const source of [projects, skills]) {
    assert.match(source, /Return to Setup and import/);
    assert.match(source, /setCurrentView\('candidate-setup'\)/);
    assert.match(source, /not verified by presence/);
  }
  assert.match(projects, /Project records/);
  assert.doesNotMatch(projects, /Verified Projects/);
  assert.match(skills, /Skill records/);
  assert.doesNotMatch(skills, /Defensible Skills/);
});

test('onboarding is private-owner-only and cannot mix Public Demo into private setup', () => {
  assert.equal(isPrivateOnboarding('PRIVATE_WORKSPACE', true), true);
  assert.equal(isPrivateOnboarding('PUBLIC_DEMO', true), false);
  assert.equal(isPrivateOnboarding('PRIVATE_WORKSPACE', false), false);
});

// This repository has no React DOM harness. The pure helpers cover state
// contracts; the two empty-state assertions inspect render wiring only and local
// browser smoke remains the UI-level supplement.
