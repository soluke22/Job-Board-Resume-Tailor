import { pgTable, text, boolean, timestamp, integer, jsonb, primaryKey, index } from 'drizzle-orm/pg-core';

const times = () => ({ createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(), updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow() });
export const user = pgTable('auth_user', {
  id: text('id').primaryKey(), name: text('name').notNull(), email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').notNull().default(false), image: text('image'), ...times(),
});
export const session = pgTable('auth_session', {
  id: text('id').primaryKey(), token: text('token').notNull().unique(), expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }), ipAddress: text('ip_address'), userAgent: text('user_agent'), ...times(),
}, t => [index('session_user_idx').on(t.userId)]);
export const account = pgTable('auth_account', {
  id: text('id').primaryKey(), accountId: text('account_id').notNull(), providerId: text('provider_id').notNull(),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  accessToken: text('access_token'), refreshToken: text('refresh_token'), idToken: text('id_token'),
  accessTokenExpiresAt: timestamp('access_token_expires_at', { withTimezone: true }), refreshTokenExpiresAt: timestamp('refresh_token_expires_at', { withTimezone: true }),
  scope: text('scope'), password: text('password'), ...times(),
}, t => [index('account_user_idx').on(t.userId)]);
export const verification = pgTable('auth_verification', {
  id: text('id').primaryKey(), identifier: text('identifier').notNull(), value: text('value').notNull(), expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(), ...times(),
}, t => [index('verification_identifier_idx').on(t.identifier)]);
export const workspaces = pgTable('workspaces', {
  ownerId: text('owner_id').primaryKey().references(() => user.id, { onDelete: 'cascade' }), revision: integer('revision').notNull().default(0), ...times(),
});
// Each domain record has a composite owner/id key. JSON holds evolving domain content,
// never a workspace snapshot; queryable lifecycle and relationship fields are columns.
const entity = (name: string, fields: Record<string, ReturnType<typeof text>> = {}) => pgTable(name, {
  ownerId: text('owner_id').notNull().references(() => workspaces.ownerId, { onDelete: 'cascade' }),
  id: text('id').notNull(), parentId: text('parent_id'), label: text('label'), status: text('status'),
  data: jsonb('data').$type<Record<string, unknown>>().notNull(), ...times(), ...fields,
}, t => [primaryKey({ columns: [t.ownerId, t.id] }), index(`${name}_owner_parent_idx`).on(t.ownerId, t.parentId)]);
export const candidateProfiles = entity('candidate_profiles', { name: text('name'), email: text('email'), phone: text('phone'), location: text('location'), title: text('title'), masterSummary: text('master_summary') });
export const searchProfiles = entity('search_profiles');
export const experiences = entity('experiences');
export const evidenceItems = entity('evidence_items', { rawEvidence: text('raw_evidence'), sourceType: text('source_type'), sourceLocation: text('source_location'), verificationStatus: text('verification_status') });
export const skillEvidence = entity('skill_evidence');
export const projects = entity('projects');
export const jobs = entity('jobs', { title: text('title'), company: text('company'), canonicalUrl: text('canonical_url'), description: text('description'), atsProvider: text('ats_provider'), atsJobId: text('ats_job_id') });
export const fitAssessments = entity('fit_assessments');
export const tailoringPlans = entity('tailoring_plans');
export const resumes = entity('resumes');
export const resumeVersions = entity('resume_versions');
export const applications = entity('applications');
export const applicationEvents = entity('application_events');
export const contacts = entity('contacts');
export const outreachRecords = entity('outreach_records');
export const proofRecords = entity('proof_records');
export const searchSessions = entity('search_sessions');
export const auditEvents = entity('audit_events');
export const privateFiles = pgTable('private_files', {
  ownerId: text('owner_id').notNull().references(() => user.id, { onDelete: 'cascade' }), id: text('id').notNull(),
  blobPath: text('blob_path').notNull().unique(), originalFilename: text('original_filename').notNull(),
  mimeType: text('mime_type').notNull(), size: integer('size').notNull(), purpose: text('purpose').notNull(), sourceType: text('source_type').notNull(), ...times(),
}, t => [primaryKey({ columns: [t.ownerId, t.id] })]);
