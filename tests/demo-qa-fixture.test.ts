import test from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { AppProvider } from '../src/context/AppContext';
import { CandidateSetupView } from '../src/components/CandidateSetupView';
import { storageService } from '../src/services/storage';
import {
  DEMO_CANDIDATE_PROFILE, DEMO_SEARCH_PROFILE, DEMO_EVIDENCE_ITEMS,
  DEMO_PROJECTS, DEMO_SKILLS, DEMO_JOBS, DEMO_MASTER_RESUME, DEMO_READY_JOB
} from '../src/data/syntheticDemoData';
import { assessmentMetadata, isCurrent, sourceRequirements } from '../server/assessment';
import { currentJob, inspectResume, resumeBasis, validateClaim } from '../server/resumeProvenance';
import { canExportFinal } from '../src/utils/resumeReadiness';
import { selectQuickGrabResume } from '../src/components/QuickDataGrabModal';

const values = new Map<string, string>();
const removals: string[] = [];
Object.assign(globalThis, { localStorage: {
  get length() { return values.size; },
  key(index: number) { return [...values.keys()][index] ?? null; },
  getItem(key: string) { return values.get(key) ?? null; },
  setItem(key: string, value: string) { values.set(key, value); },
  removeItem(key: string) { removals.push(key); values.delete(key); }
} });

test('confirmed Public Demo action is shown only in demo setup', () => {
  storageService.setWorkspaceMode('PUBLIC_DEMO');
  const html = renderToStaticMarkup(createElement(AppProvider, null, createElement(CandidateSetupView)));
  assert.match(html, /Reset Public Demo/);
  assert.doesNotMatch(html, /Confirm Reset Public Demo/, 'the destructive action requires a second explicit confirmation');
});

test('reset removes only demo-prefixed keys and restores every exact synthetic fixture', () => {
  values.clear(); removals.length = 0;
  const ownerSession = { isAuthenticated: true, isOwner: true, userEmail: 'owner@example.invalid', mode: 'PRIVATE_WORKSPACE' as const };
  storageService.saveAuthSession(ownerSession);
  storageService.hydratePrivateWorkspace({ profile: { name: 'Private Synthetic Owner' }, evidence: [{ id: 'owner-record' }], jobs: [{ id: 'owner-job' }] });
  const privateBefore = storageService.privateSnapshot();
  storageService.setWorkspaceMode('PUBLIC_DEMO');
  for (const key of ['profile','search_profile','evidence','projects','skills','jobs','master_resume','future_collection']) values.set(`caos_demo_${key}`, JSON.stringify({ changed: key }));
  values.set('caos_priv_legacy', 'untouched private sentinel');
  values.set('caos_auth_session', 'untouched session sentinel');
  values.set('unrelated', 'untouched origin sentinel');
  storageService.resetPublicDemo();
  assert.deepEqual(removals.sort(), ['profile','search_profile','evidence','projects','skills','jobs','master_resume','future_collection'].map(key => `caos_demo_${key}`).sort());
  assert.deepEqual([...values.entries()].sort(), [
    ['caos_priv_legacy','untouched private sentinel'], ['caos_auth_session','untouched session sentinel'], ['unrelated','untouched origin sentinel']
  ].sort());
  assert.deepEqual(storageService.getProfile('PUBLIC_DEMO'), DEMO_CANDIDATE_PROFILE);
  assert.deepEqual(storageService.getSearchProfile('PUBLIC_DEMO'), DEMO_SEARCH_PROFILE);
  assert.deepEqual(storageService.getEvidence('PUBLIC_DEMO'), DEMO_EVIDENCE_ITEMS);
  assert.deepEqual(storageService.getProjects('PUBLIC_DEMO'), DEMO_PROJECTS);
  assert.deepEqual(storageService.getSkills('PUBLIC_DEMO'), DEMO_SKILLS);
  assert.deepEqual(storageService.getJobs('PUBLIC_DEMO'), DEMO_JOBS);
  assert.deepEqual(storageService.getMasterResume('PUBLIC_DEMO'), DEMO_MASTER_RESUME);
  assert.deepEqual(storageService.privateSnapshot(), privateBefore);
  assert.deepEqual(storageService.getAuthSession(), ownerSession);
  assert.notEqual(storageService.getJobs('PUBLIC_DEMO'), DEMO_JOBS, 'consumer mutations cannot change the canonical fixture');
  const fetched = storageService.getJobs('PUBLIC_DEMO'); fetched.pop();
  assert.deepEqual(storageService.getJobs('PUBLIC_DEMO'), DEMO_JOBS);
  values.set('caos_demo_jobs', 'changed again');
  storageService.setWorkspaceMode('PRIVATE_WORKSPACE');
  const beforeDenied = [...values.entries()];
  assert.throws(() => storageService.resetPublicDemo(), /Switch to Public Demo/);
  assert.deepEqual([...values.entries()], beforeDenied);
  assert.deepEqual(storageService.privateSnapshot(), privateBefore);
  storageService.clearAuthSession(); storageService.setWorkspaceMode('PUBLIC_DEMO');
});

test('authored synthetic READY job satisfies current assessment, server inspection and the production Quick Grab fence', () => {
  const job = DEMO_READY_JOB;
  const resume = job.tailoredResume!;
  const workspace = { evidence: DEMO_EVIDENCE_ITEMS, jobs: DEMO_JOBS, masterResume: DEMO_MASTER_RESUME,
    searchProfile: DEMO_SEARCH_PROFILE, profile: DEMO_CANDIDATE_PROFILE };
  assert.equal(DEMO_JOBS[0].id, job.id, 'initial browser Quick Grab target is the READY fixture');
  assert.equal(job.assessmentStatus, 'ASSESSED');
  assert.equal(job.verificationStatus, 'UNKNOWN', 'synthetic posting is not represented as a live verified listing');
  assert.deepEqual(sourceRequirements({ roleFamily: 'frontend-product', modifiers: [], facts: [],
    requirements: [{ kind: 'hard', excerpt: job.hardRequirements[0] }] }, job.rawDescription!).requirements, job.requirements);
  assert.equal(isCurrent(job.assessmentMetadata, assessmentMetadata(job, workspace.evidence, workspace.searchProfile)), true);
  assert.equal(currentJob(workspace, job.id), job);
  assert.deepEqual(resume.basis, resumeBasis(workspace, job));
  assert.deepEqual(resume.header, DEMO_MASTER_RESUME.header);
  assert.deepEqual(resume.education, DEMO_MASTER_RESUME.education);
  assert.ok(resume.claimLedger?.every(claim => claim.supportingEvidenceIds.every(id => DEMO_EVIDENCE_ITEMS.some(e => e.id === id && e.verificationStatus === 'verified' && e.enabled))));
  assert.ok(resume.claimLedger?.every(claim => validateClaim(claim, workspace, job).validationStatus === 'verified'));
  const inspected = inspectResume(resume, workspace, job);
  assert.equal(inspected.readiness, 'READY', inspected.readinessIssues?.join('; '));
  assert.equal(canExportFinal(inspected, job.assessmentStatus), true);
  assert.equal(selectQuickGrabResume(job, DEMO_MASTER_RESUME).kind, 'tailored');
  const changed = { ...workspace, evidence: workspace.evidence.map(item => item.id === 'demo-ev-2' ? { ...item, enabled: false } : item) };
  const stale = inspectResume(resume, changed, job);
  assert.equal(stale.readiness, 'STALE');
  assert.equal(canExportFinal(stale, job.assessmentStatus), false);
  assert.equal(selectQuickGrabResume({ ...job, assessmentStatus: 'STALE' }, DEMO_MASTER_RESUME).kind, 'blocked');
});
