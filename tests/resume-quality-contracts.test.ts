import test from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { EvaluationPanel } from '../src/components/EvaluationPanel';
import { DEFAULT_BLANK_MASTER_RESUME } from '../src/data/privateSeedTemplate';
import { assessmentMetadata, sourceRequirements, assessJob } from '../server/assessment';
import { assembleResume, buildPlan, evaluationFor, generateResume } from '../server/resumeProvenance';
import { syntheticEvidence, syntheticJob, persistenceDb } from './helpers/persistence';
import { createWorkspaceRepository } from '../server/workspaceRepository';
import { workspaceInput } from '../server/db/workspaceValidation';

function fixture() {
  const description = 'Build responsive React interfaces. Automated testing required. Advertising technology preferred.';
  const requirements = [
    { id: 'ui', kind: 'responsibility', centrality: 'core', excerpt: 'Build responsive React interfaces' },
    { id: 'tests', kind: 'hard', excerpt: 'Automated testing required' },
    { id: 'ads', kind: 'preferred', excerpt: 'Advertising technology preferred' },
  ].map(r => ({ ...r, start: description.indexOf(r.excerpt), end: description.indexOf(r.excerpt) + r.excerpt.length }));
  const evidence = [
    { ...syntheticEvidence('test-work', 'Implemented automated interface tests.'), technologies: ['Jest'] },
    { ...syntheticEvidence('ui-work', 'Implemented responsive React interfaces.'), technologies: ['React'] },
    syntheticEvidence('unrelated', 'Maintained unrelated internal documentation.'),
    { ...syntheticEvidence('unreviewed', 'Built advertising interfaces.'), requiresUserReview: true },
  ].map(e => ({ ...e, employer: 'Synthetic Orbit', role: 'Engineer', period: '2021–2025', context: 'Full-time' }));
  const master = { ...structuredClone(DEFAULT_BLANK_MASTER_RESUME),
    header: { name: 'Synthetic Candidate', title: 'Engineer', email: 'candidate@example.invalid', phone: '', location: '', links: [] },
    experience: [{ id: 'orbit', employer: 'Synthetic Orbit', title: 'Engineer', period: '2021–2025', location: '', bullets: [] }],
  };
  const job: any = { ...syntheticJob('quality-job'), description, rawDescription: description, jdSource: 'user-provided',
    assessmentStatus: 'ASSESSED', requirements,
    evidenceMatches: [
      { id: 'ui', strength: 'Strong', relationship: 'direct', supportingEvidenceIds: ['ui-work', 'unreviewed'], gap: '' },
      { id: 'tests', strength: 'Moderate', relationship: 'adjacent', supportingEvidenceIds: ['test-work'], gap: '' },
      { id: 'ads', strength: 'Missing', supportingEvidenceIds: ['unreviewed'], gap: 'No approved advertising evidence' },
    ], fit: { ...syntheticJob().fit, recommendation: 'SELECTIVE_APPLY' },
    parsed: { classifiedFamily: 'frontend-product' },
  };
  const w: any = { evidence, masterResume: master, profile: null, searchProfile: null, jobs: [job] };
  job.assessmentMetadata = assessmentMetadata(job, evidence as any, null);
  return { w, job };
}

test('quality plan orders scoped approved accomplishments against important JD requirements and explains omissions', () => {
  const { w, job } = fixture();
  const plan = buildPlan(w, job);
  assert.deepEqual(plan.experienceBulletsPlan.map(p => p.evidenceId), ['ui-work', 'test-work']);
  assert.match(plan.professionalSummaryAngle, /Build responsive React interfaces/);
  assert.deepEqual((plan.experienceBulletsPlan[0] as any).targetRequirementIds, ['ui']);
  assert.equal((plan.experienceBulletsPlan[0] as any).scopeId, 'orbit');
  assert.deepEqual(plan.unsupportedClaimsToWithhold, ['ads']);
  assert.ok((plan as any).omissions.some((o: any) => o.evidenceId === 'unrelated' && o.action === 'omit'));
  assert.ok(!JSON.stringify(plan).includes('Built advertising interfaces.'));
  assert.deepEqual(buildPlan({ ...w, evidence: [...w.evidence].reverse() }, job), plan);
});

test('provenance READY does not imply relevant, complete or human-reviewed resume quality', () => {
  const { w, job } = fixture();
  const resume = assembleResume({ claims: [{ claimType: 'experience', scopeId: 'orbit',
    text: 'Implemented responsive React interfaces.', evidenceIds: ['ui-work'], requirementIds: [] }] }, w, job, new Set(['ui-work']));
  assert.equal(resume.readiness, 'READY', 'keep the existing provenance/export contract');
  const evaluation = evaluationFor(resume, w, job) as any;
  assert.equal(evaluation.isReady, true);
  assert.equal(evaluation.quality.status, 'GAPS_FOUND');
  assert.equal(evaluation.quality.humanReview, 'PENDING');
  assert.deepEqual(evaluation.quality.relevantWorkClaimIds, []);
  assert.equal(evaluation.quality.requirements.find((r: any) => r.requirementId === 'ui').status, 'NOT_REPRESENTED');
  assert.equal(evaluation.quality.requirements.find((r: any) => r.requirementId === 'ads').status, 'EVIDENCE_GAP');
});

test('extraction discloses an omitted explicit professional duration without inventing a requirement', () => {
  const jd = 'Minimum 3 years of web engineering experience required.\nBuild responsive React interfaces.';
  const raw = { roleFamily: 'frontend-product', modifiers: [], facts: [],
    requirements: [{ kind: 'responsibility', excerpt: 'Build responsive React interfaces' }] };
  const result = sourceRequirements(raw, jd) as any;
  assert.equal(result.requirements.length, 1, 'do not manufacture missing requirements');
  assert.equal(result.extractionReview.status, 'NEEDS_REVIEW');
  assert.equal(result.extractionReview.potentialOmissions.length, 1);
  const omission = result.extractionReview.potentialOmissions[0];
  assert.equal(jd.slice(omission.start, omission.end), omission.excerpt);
  assert.match(omission.excerpt, /Minimum 3 years/);
  assert.equal(omission.reason, 'EXPLICIT_DURATION_NOT_REPRESENTED');
});

test('a complete concise one-bullet resume needs human review, not an arbitrary bullet quota', () => {
  const { w, job } = fixture();
  job.requirements = [job.requirements[0]];
  job.evidenceMatches = [job.evidenceMatches[0]];
  job.assessmentMetadata = assessmentMetadata(job, w.evidence, null);
  const resume = assembleResume({ claims: [{ claimType: 'experience', scopeId: 'orbit',
    text: 'Implemented responsive React interfaces.', evidenceIds: ['ui-work'], requirementIds: ['ui'] }] }, w, job, new Set(['ui-work']));
  const evaluation = evaluationFor(resume, w, job);
  assert.equal(evaluation.quality.status, 'REVIEW_REQUIRED');
  assert.equal(evaluation.quality.humanReview, 'PENDING');
  assert.equal(evaluation.quality.documentCompleteness.status, 'CHECKS_PASSED');
  const html = renderToStaticMarkup(createElement(EvaluationPanel, { evaluation, activeResume: resume, onResumeUpdate() {} }));
  assert.match(html, /Provenance Certification/);
  assert.match(html, /Human review: PENDING/);
  assert.match(html, /does not establish a persuasive/);
  assert.ok(!html.includes('Skills Match:'));
  const incomplete = evaluationFor({ ...resume, header: { ...resume.header, email: '' } }, w, job);
  assert.equal(incomplete.quality.status, 'GAPS_FOUND');
  assert.ok(incomplete.quality.documentCompleteness.missingFields.includes('Contact route'));
});

test('duration review respects preferred and negated experience, and NOT_FLAGGED never means complete', () => {
  for (const text of ['Three years of web experience preferred.', '3 years of engineering experience not required.',
    'Preferred Qualifications:\n3 years of web experience\nResponsibilities:\nBuild responsive React interfaces.']) {
    const jd = `${text}\nBuild responsive React interfaces.`;
    const result = sourceRequirements({ roleFamily: 'frontend-product', modifiers: [], facts: [],
      requirements: [{ kind: 'responsibility', excerpt: 'Build responsive React interfaces' }] }, jd);
    assert.equal(result.extractionReview.status, 'NOT_FLAGGED');
    assert.match(result.extractionReview.limitations, /not proof of complete extraction/);
  }
  const jd = 'At least three years of web engineering experience. React required.';
  const complete = sourceRequirements({ roleFamily: 'frontend-product', modifiers: [], facts: [],
    requirements: [{ kind: 'hard', excerpt: 'At least three years of web engineering experience' }] }, jd);
  assert.equal(complete.extractionReview.status, 'NOT_FLAGGED');
});

test('cached assessments expose omission review without another model call or changing their score', async () => {
  const { job } = fixture();
  job.description = 'Minimum 3 years web engineering experience required.\nBuild responsive React interfaces.';
  job.rawDescription = job.description;
  job.requirements = [job.requirements[0]];
  job.assessmentMetadata = assessmentMetadata(job, [], null);
  const result = await assessJob(job, [], null, async () => { throw Error('No provider allowed'); });
  assert.equal(result.reused, true);
  assert.equal(result.fit.qualificationFit, job.fit.qualificationFit);
  assert.equal(result.extractionReview.status, 'NEEDS_REVIEW');
});

test('quality coverage follows the statement actually rendered, not unrelated IDs in its envelope', () => {
  const { w, job } = fixture();
  const resume = assembleResume({ claims: [{ claimType: 'experience', scopeId: 'orbit',
    text: 'Implemented responsive React interfaces.', evidenceIds: ['ui-work','test-work'], requirementIds: ['ui','tests'] }] }, w, job, new Set(['ui-work','test-work']));
  const quality = evaluationFor(resume,w,job).quality;
  assert.equal(quality.requirements.find(r => r.requirementId === 'tests')!.status, 'NOT_REPRESENTED');
});

test('quality preserves weak adjacent support gaps rather than certifying requirement coverage', () => {
  const { w, job } = fixture();
  job.evidenceMatches[0].strength = 'Weak';
  job.evidenceMatches[0].relationship = 'adjacent';
  job.evidenceMatches[0].gap = 'Professional duration is not established';
  const resume = assembleResume({ claims: [{ claimType: 'experience', scopeId: 'orbit',
    text: 'Implemented responsive React interfaces.', evidenceIds: ['ui-work'], requirementIds: ['ui'] }] }, w, job, new Set(['ui-work']));
  const quality = evaluationFor(resume,w,job).quality;
  assert.equal(quality.requirements.find(r => r.requirementId === 'ui')!.status, 'PARTIAL_SUPPORT');
  assert.equal(quality.status, 'GAPS_FOUND');
  assert.match(buildPlan(w,job).decisions![0].reason, /Professional duration is not established/);
});

test('mandatory duration warnings survive unrelated preferences, but negation and company age are not candidate minima', () => {
  const extraction = { roleFamily: 'frontend-product', modifiers: [], facts: [], requirements: [{ kind: 'hard', excerpt: 'React required' }] };
  const omitted = sourceRequirements(extraction, 'Minimum 3 years of web engineering experience required, design tools preferred.\nReact required');
  assert.equal(omitted.extractionReview.status, 'NEEDS_REVIEW');
  for (const prefix of ['You do not need 3 years of professional experience.', 'For 10 years we have built web products.']) {
    assert.equal(sourceRequirements(extraction, `${prefix}\nReact required`).extractionReview.status, 'NOT_FLAGGED');
  }
});

test('generation receives selected strategy IDs without unrelated evidence bank metadata', async () => {
  const { w, job } = fixture();
  await generateResume(w,job,async (_schema,_system,payload) => {
    assert.ok(!JSON.stringify(payload).includes('unrelated'));
    assert.ok(!JSON.stringify(payload).includes('unreviewed'));
    return { claims: [{ claimType: 'experience', scopeId: 'orbit', text: 'Implemented responsive React interfaces.', evidenceIds: ['ui-work'], requirementIds: ['ui'] }] };
  });
});

test('runtime input rejects object-valued plan fields before they can reach React', () => {
  const { job, w } = fixture();
  const plan = buildPlan(w,job);
  const persistedJob = syntheticJob('runtime-plan');
  assert.equal(workspaceInput.safeParse({jobs:[{...persistedJob,tailoringPlan:plan}]}).success,true);
  for (const patch of [{order:{nested:1}},{scopeId:{nested:1}},{targetRequirementIds:[{nested:1}]},{order:-1}]) {
    const bad = {...plan,experienceBulletsPlan:[{...plan.experienceBulletsPlan[0],...patch}]};
    assert.equal(workspaceInput.safeParse({jobs:[{...persistedJob,tailoringPlan:bad}]}).success,false);
  }
});

test('ordinary save and import reject malformed displayed plan fields without changing the workspace', async () => {
  const {pg,db} = await persistenceDb();
  const repo = createWorkspaceRepository(() => db as any);
  try {
    const {w,job} = fixture();
    const plan = buildPlan(w,job);
    const saved = await repo.save('owner-a',{jobs:[{...syntheticJob('runtime-plan'),tailoringPlan:plan}]},0);
    for (const operation of ['save','import'] as const) {
      const bad = {...saved.jobs[0],tailoringPlan:{...plan,experienceBulletsPlan:[{...plan.experienceBulletsPlan[0],scopeId:{nested:1}}]}};
      await assert.rejects(repo[operation]('owner-a',{jobs:[bad]},saved.revision));
      assert.equal((await repo.read('owner-a')).revision,saved.revision);
    }
  } finally { await pg.close(); }
});
