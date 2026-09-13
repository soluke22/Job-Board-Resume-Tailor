import { z } from 'zod';

export const artifactStateSchema = z.enum(['DRAFT', 'NEEDS_REVIEW', 'READY', 'STALE']);
export const questionCategorySchema = z.enum(['EVIDENCE_BACKED', 'DETERMINISTIC_PROFILE', 'ROLE_MOTIVATION', 'PREFERENCE', 'SENSITIVE_MANUAL', 'UNKNOWN_MANUAL']);
export const artifactProvenanceSchema = z.object({
  artifactId: z.string(), artifactType: z.enum(['proof', 'outreach', 'referral', 'answer']), jobId: z.string(),
  assessmentFingerprint: z.string(), evidenceFingerprint: z.string(), jdHash: z.string(),
  profileFingerprint: z.string(), resumeHash: z.string().optional(),
  generatedAt: z.string(), generationAlgorithmVersion: z.string(),
  supportingEvidenceIds: z.array(z.string()), sourceRequirementIds: z.array(z.string()),
  textHash: z.string(), validatedTextHash: z.string().optional(),
  validationStatus: artifactStateSchema, issues: z.array(z.string()),
}).strict();
export type ArtifactProvenance = z.infer<typeof artifactProvenanceSchema>;
export type QuestionCategory = z.infer<typeof questionCategorySchema>;
export type ApplicationQuestion = {question:string; characterLimit?:number; wordLimit?:number; motivation?:string};
