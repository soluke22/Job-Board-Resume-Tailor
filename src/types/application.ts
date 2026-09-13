import { z } from 'zod';

export const applicationStatuses = ['DISCOVERED','SHORTLISTED','TAILORED','APPLIED','RECRUITER_SCREEN','HIRING_MANAGER','TECHNICAL','FINAL_ONSITE','OFFER','REJECTED','WITHDRAWN','ARCHIVED'] as const;
export const applicationStatusSchema = z.enum(applicationStatuses);
export type ApplicationStatus = z.infer<typeof applicationStatusSchema>;
export const applicationChannelSchema = z.enum(['DIRECT_PORTAL','REFERRAL','LINKEDIN','RECRUITER_REACHOUT','OTHER','UNKNOWN']);
export const reasonSourceSchema = z.enum(['employer-provided','recruiter-provided','user-observed','user-inferred','unknown']);
export const outcomeSourceSchema = z.enum(['manual','email','recruiter','portal','other','unknown']);
const timestamp = z.union([z.iso.datetime({offset:true}), z.iso.date()]);
const id = z.string().min(1).max(200);
export const applicationEventSchema = z.object({
  id: id.optional(), from: applicationStatusSchema.nullable(), to: applicationStatusSchema,
  timestamp, recordedAt: timestamp.optional(), note: z.string().max(4000).optional(),
  kind: z.enum(['transition','note','correction']).optional(), requestId: id.optional(),
  supersedesEventId: id.optional(), correctionReason: z.string().trim().min(1).max(4000).optional(),
  applicationChannel: applicationChannelSchema.optional(), outcomeSource: outcomeSourceSchema.optional(),
  reasonText: z.string().max(4000).optional(), reasonSource: reasonSourceSchema.optional(),
}).strict();
export type StatusTransitionEvent = z.infer<typeof applicationEventSchema>;
export const applicationSnapshotSchema = z.object({
  appliedAt: timestamp, capturedAt: timestamp,
  assessmentState: z.enum(['KNOWN','UNKNOWN']), assessmentAlgorithmVersion: z.string().optional(),
  qualificationFit: z.number().min(0).max(10).optional(), evidenceCoverage: z.number().min(0).max(10).optional(),
  applicationPriority: z.string().optional(), recommendation: z.string().optional(),
  roleFamily: z.string().optional(), modifiers: z.array(z.string()).max(100),
  freshnessBand: z.string(), verificationStatus: z.string(), sourceChannel: z.string(), atsProvider: z.string(),
  applicationChannel: applicationChannelSchema, assessmentFingerprint: z.string().optional(),
}).strict();
export type ApplicationSnapshot = z.infer<typeof applicationSnapshotSchema>;
export const transitionRequestSchema = z.object({
  jobId: id, targetStatus: applicationStatusSchema, requestId: id,
  timestamp: timestamp.optional(), note: z.string().max(4000).optional(),
  applicationChannel: applicationChannelSchema.optional(), outcomeSource: outcomeSourceSchema.optional(),
  reasonText: z.string().max(4000).optional(), reasonSource: reasonSourceSchema.optional(),
  supersedesEventId: id.optional(), correctionReason: z.string().trim().min(1).max(4000).optional(),
  correctLegacyState: z.boolean().optional(),
}).strict();
export type TransitionRequest = z.infer<typeof transitionRequestSchema>;

// Legacy destination-only events establish only the recorded destination. Never
// infer a predecessor from neighboring records or the current job status.
export function normalizeHistory(raw: unknown): { events: StatusTransitionEvent[]; quarantine: unknown[] } {
  const events: StatusTransitionEvent[] = [], quarantine: unknown[] = [];
  if (raw === undefined) return { events, quarantine };
  if (!Array.isArray(raw)) return { events, quarantine: [raw] };
  for (const value of raw.slice(0, 5000)) {
    let candidate = value;
    if (value && typeof value === 'object' && 'status' in value && !('to' in value)) {
      const legacy = value as Record<string, unknown>;
      candidate = { from: null, to: legacy.status, timestamp: legacy.timestamp, ...(legacy.notes !== undefined ? { note: legacy.notes } : {}) };
    }
    const parsed = applicationEventSchema.safeParse(candidate);
    if (parsed.success) events.push(parsed.data); else quarantine.push(value);
  }
  if(raw.length>5000)quarantine.push({kind:'history-overflow',events:raw.slice(5000)});
  return { events, quarantine };
}
export function normalizeApplicationJob(value: unknown): unknown {
  if (!value || typeof value !== 'object') return value;
  const job = { ...value as Record<string, unknown> };
  if ('statusHistory' in job) {
    const normalized = normalizeHistory(job.statusHistory);
    job.statusHistory = normalized.events;
    if (normalized.quarantine.length) job.historyQuarantine = [...(Array.isArray(job.historyQuarantine) ? job.historyQuarantine : []), ...normalized.quarantine].slice(0, 5000);
  }
  return job;
}
export function effectiveEvents(events: StatusTransitionEvent[]): StatusTransitionEvent[] {
  const superseded = new Set(events.filter(e => e.kind === 'correction').map(e => e.supersedesEventId));
  return events.filter(e => e.kind !== 'note' && (!e.id || !superseded.has(e.id)));
}
