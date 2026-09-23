import type { FitAssessment, JobRecord } from '../types';
/** Historical scores stay persisted, but never participate in current triage. */
export function currentFit(job: JobRecord) { return job.assessmentStatus === 'ASSESSED' ? job.fit : undefined; }

export type AssessmentDisplay = {
  state: 'current' | 'pending' | 'stale';
  fit?: FitAssessment;
  verdict: string;
  summary: string;
  strongestMatch: string;
  biggestActualGap: string;
  unsupportedRequirements?: string[];
};

/** Only a current, explicitly assessed fit may drive a candidate-facing conclusion. */
export function assessmentDisplay(job: JobRecord): AssessmentDisplay {
  const fit = currentFit(job);
  if (fit) return {
    state: 'current', fit, verdict: fit.verdict, summary: fit.verdictReason,
    strongestMatch: fit.strongestMatch, biggestActualGap: fit.biggestActualGap,
    unsupportedRequirements: fit.unsupportedRequirements
  };
  const stale = job.assessmentStatus === 'STALE';
  return {
    state: stale ? 'stale' : 'pending', verdict: 'Assessment pending',
    summary: stale ? 'Previous assessment is stale. Reassess before making an application decision.' : 'Run analysis before making an application decision.',
    strongestMatch: 'Unknown until assessment completes.',
    biggestActualGap: 'Unknown until assessment completes.'
  };
}

/** Pipeline actions must not imply a Skip decision until a current assessment makes one. */
export function jobPrimaryAction(job: JobRecord): 'Tailor Studio' | 'Skip Guardrail' | 'Run analysis' {
  const fit = currentFit(job);
  if (!fit) return 'Run analysis';
  return fit.canTailor ? 'Tailor Studio' : 'Skip Guardrail';
}
