import { z } from 'zod';
const id = z.string().min(1).max(200);
export const claimSchema = z.object({
  claimId: id, artifactId: id,
  claimType: z.enum(['summary', 'experience', 'project', 'skill', 'project-technology']),
  scopeId: z.string().max(200), text: z.string().max(4000), textHash: z.string(),
  sourceKind: z.enum(['evidence', 'master', 'manual']),
  supportingEvidenceIds: z.array(id).max(12), supportingProjectIds: z.array(id).max(12),
  targetRequirementIds: z.array(id).max(100),
  generationMode: z.enum(['generated', 'retained', 'manual', 'regenerated']),
  validationStatus: z.enum(['verified', 'requires-review', 'manual-edit-unvalidated', 'unsupported', 'rejected']),
  validatedTextHash: z.string().optional(), validatedAt: z.string().optional(),
  validationAlgorithmVersion: z.string(), issues: z.array(z.string()).max(100),
}).strict();
export const resumeBasisSchema = z.object({
  assessmentFingerprint: z.string(), jdHash: z.string(), evidenceFingerprint: z.string(),
  profileFingerprint: z.string(), masterFingerprint: z.string(), tailoringAlgorithmVersion: z.string(),
}).strict();
export type ResumeClaim = z.infer<typeof claimSchema>;
export type ResumeBasis = z.infer<typeof resumeBasisSchema>;
export type ResumeReadiness = 'DRAFT' | 'NEEDS_VALIDATION' | 'READY' | 'STALE';
