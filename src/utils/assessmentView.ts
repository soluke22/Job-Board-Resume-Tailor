import type { JobRecord } from '../types';
/** Historical scores stay persisted, but never participate in current triage. */
export function currentFit(job: JobRecord) { return job.assessmentStatus === 'STALE' ? undefined : job.fit; }
