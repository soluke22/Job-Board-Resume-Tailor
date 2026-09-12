import { z } from 'zod';

const text = z.string().max(4000);
export const familySchema = z.enum(['frontend-product', 'ui-platform-design-systems', 'frontend-heavy-fullstack', 'production-support-frontend', 'forward-deployed-software']);
export const modifierSchema = z.enum(['AI_PRODUCT','MEDIA','SPORTS','ACCESSIBILITY','INTERNAL_TOOLS','DEVELOPER_TOOLING','DESIGN_SYSTEMS','PRODUCTION_SUPPORT','B2B_SAAS','CUSTOMER_FACING','DATA_VISUALIZATION','EARLY_STAGE','ENTERPRISE']);
// Text is an exact excerpt, rather than an unverifiable model paraphrase.
export const extractionSchema = z.object({
  roleFamily: familySchema,
  modifiers: z.array(modifierSchema).max(13),
  facts: z.array(z.object({kind: z.enum(['company','title','seniority','employment','location','technology','domain','hiring','relocation','clearance','onsite-frequency']), excerpt: text.min(1)}).strict()).max(100),
  requirements: z.array(z.object({kind: z.enum(['hard','preferred','responsibility']), excerpt: text.min(1)}).strict()).min(1).max(100),
}).strict();
export const semanticMatchesSchema = z.object({matches: z.array(z.object({
  requirementId: z.string().min(1).max(200),
  strength: z.enum(['Strong','Moderate','Weak','Missing']),
  relationship: z.enum(['direct','adjacent','none']),
  evidenceIds: z.array(z.string().min(1).max(200)).max(12),
}).strict()).max(100)}).strict();
export const requirementSchema = z.object({id: z.string(), kind: z.enum(['hard','preferred','responsibility']), excerpt: text.min(1), start: z.number().int().min(0), end: z.number().int().min(1)}).strict();
export const metadataSchema = z.object({algorithmVersion: z.string(), jdHash: z.string(), evidenceFingerprint: z.string(), profileFingerprint: z.string(), assessedAt: z.string(), source: z.enum(['canonical','user-provided'])}).strict();
export type Requirement = z.infer<typeof requirementSchema>;
export type AssessmentMetadata = z.infer<typeof metadataSchema>;
export type Extraction = z.infer<typeof extractionSchema>;
export type SemanticMatches = z.infer<typeof semanticMatchesSchema>;
