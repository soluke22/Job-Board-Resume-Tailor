import test from 'node:test';
import assert from 'node:assert/strict';
import { enabledBullets, formatExperienceBullets, formatProjectBullets, selectQuickGrabResume } from '../src/components/QuickDataGrabModal';
import { canExportFinal } from '../src/utils/resumeReadiness';

test('all aggregate quick-copy bullets exclude disabled entries', () => {
  const bullets: any[] = [{ id: 'enabled', text: 'Keep', enabled: true }, { id: 'disabled', text: 'Exclude', enabled: false }, { id: 'legacy', text: 'Keep legacy' }];
  assert.deepEqual(enabledBullets(bullets).map(b => b.id), ['enabled', 'legacy']);
});

test('non-ready tailored material fails the existing final-export fence', () => {
  assert.equal(canExportFinal({ provenance: { validationStatus: 'STALE' } } as any, 'ASSESSED' as any), false);
});

test('aggregate quick-copy formatters omit disabled experience and project content', () => {
  const resume: any = { experience: [{ bullets: [{ text: 'keep' }, { text: 'drop', enabled: false }] }], projects: [{ name: 'P', bullets: [{ text: 'keep project' }, { text: 'drop project', enabled: false }] }] };
  assert.equal(formatExperienceBullets(resume), '* keep'); assert.equal(formatProjectBullets(resume.projects[0]), 'P\n* keep project');
});

test('Quick Grab selects only a final-ready tailored resume; active jobs never fall back to master', () => {
  const master: any = { id: 'master' }; const ready: any = { id: 'ready', readiness: 'READY', basis: {}, professionalSummary: '', skills: [], projects: [], experience: [{ bullets: [{ id: 'b', text: 'ready bullet' }] }], claimLedger: [{ claimId: 'b', text: 'ready bullet', validationStatus: 'verified', validatedTextHash: 'same', textHash: 'same', supportingEvidenceIds: ['ev'], artifactId: 'ready' }] };
  assert.equal(selectQuickGrabResume(null, master).kind, 'master');
  assert.equal(selectQuickGrabResume({ tailoredResume: ready, assessmentStatus: 'ASSESSED' } as any, master).kind, 'tailored');
  assert.equal(selectQuickGrabResume({ assessmentStatus: 'ASSESSED' } as any, master).kind, 'blocked');
  assert.equal(selectQuickGrabResume({ tailoredResume: ready, assessmentStatus: 'STALE' } as any, master).kind, 'blocked');
});
