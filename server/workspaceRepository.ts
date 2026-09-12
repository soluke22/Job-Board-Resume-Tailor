import { and, eq, notInArray, sql } from 'drizzle-orm';
import { z } from 'zod';
import { randomUUID } from 'node:crypto';
import { getDb } from './db/client';
import * as s from './db/schema';
import { workspaceInput } from './db/workspaceValidation';
import { assessmentMetadata, isCurrent, fingerprint } from './assessment';
export { workspaceInput } from './db/workspaceValidation';

export type WorkspaceInput = z.infer<typeof workspaceInput>;
export class WorkspaceConflict extends Error {}
export class WorkspaceValidationError extends Error {}
type EntityTable = typeof s.evidenceItems;
// The adapter intentionally exposes only Drizzle's shared transaction surface, allowing
// the same repository and migrations to run against real PostgreSQL in integration tests.
type DatabaseProvider = () => Pick<ReturnType<typeof getDb>, 'transaction'>;
const collections = { evidence: s.evidenceItems, projects: s.projects, skills: s.skillEvidence, experiences: s.experiences, searchSessions: s.searchSessions };
const attachments = {
  fit: s.fitAssessments, tailoringPlan: s.tailoringPlans, tailoredResume: s.resumes,
  proofPack: s.proofRecords, outreachDrafts: s.outreachRecords, recruiterOutreach: s.outreachRecords,
  referralContact: s.contacts,
};
const applicationKeys = ['applicationStatus', 'appliedDate', 'rejectionReason', 'stage', 'channel', 'applicationAnswers'];
const scalarFields = new Map<EntityTable, string[]>([
  [s.candidateProfiles, ['name', 'email', 'phone', 'location', 'title', 'masterSummary']],
  [s.evidenceItems, ['rawEvidence', 'sourceType', 'sourceLocation', 'verificationStatus']],
  [s.jobs, ['title', 'company', 'canonicalUrl', 'description', 'atsProvider', 'atsJobId']],
]);
function decode(table: EntityTable, row: any) {
  const data = { ...row.data };
  for (const field of scalarFields.get(table) ?? []) if (row[field] != null) data[field] = row[field];
  return { ...row, data };
}

export function createWorkspaceRepository(database: DatabaseProvider = getDb) {
  async function upsert(tx: any, table: EntityTable, ownerId: string, id: string, data: Record<string, unknown>, parentId: string | null = null) {
    const rest = { ...data };
    const scalars: Record<string, string | null> = {};
    for (const field of scalarFields.get(table) ?? []) {
      scalars[field] = null;
      if (rest[field] !== undefined) {
        if (typeof rest[field] !== 'string') throw new WorkspaceValidationError(`Invalid ${field}`);
        scalars[field] = rest[field];
        delete rest[field];
      }
    }
    const values = { ownerId, id, parentId, data: rest, label: String(data.name ?? data.title ?? data.company ?? ''), status: String(data.verificationStatus ?? data.applicationStatus ?? ''), updatedAt: new Date(), ...scalars };
    const changed = await tx.insert(table).values(values).onConflictDoUpdate({
      target: [table.ownerId, table.id], set: values,
      // Legacy delimiter-based child IDs can be ambiguous. Never move an existing
      // child to a different parent; reject the entire transaction instead.
      setWhere: sql`${table.parentId} is not distinct from ${parentId}`,
    }).returning({ id: table.id });
    if (!changed.length) throw new WorkspaceValidationError('Record identifier conflicts with another parent');
  }
  async function rows(tx: any, table: EntityTable, ownerId: string) {
    return (await tx.select().from(table).where(eq(table.ownerId, ownerId))).map(row => decode(table, row));
  }
  async function snapshot(tx: any, ownerId: string) {
    const [workspace] = await tx.select().from(s.workspaces).where(eq(s.workspaces.ownerId, ownerId));
    const output: Record<string, any> = { revision: workspace?.revision ?? 0, profile: null, searchProfile: null, masterResume: null, jobs: [], auditLog: [] };
    for (const [key, table] of Object.entries(collections)) output[key] = (await rows(tx, table, ownerId)).map(r => r.data);
    for (const [key, table] of [['profile', s.candidateProfiles], ['searchProfile', s.searchProfiles], ['masterResume', s.resumes]] as const) {
      const row = (await tx.select().from(table).where(and(eq(table.ownerId, ownerId), eq(table.id, key))))[0];
      output[key] = row ? decode(table, row).data : null;
    }
    const jobRows = await rows(tx, s.jobs, ownerId);
    const children = new Map<EntityTable, any[]>();
    for (const table of new Set([...Object.values(attachments), s.applications, s.resumeVersions, s.applicationEvents])) children.set(table, await rows(tx, table, ownerId));
    output.jobs = jobRows.map(row => {
      const job = { ...row.data };
      for (const [key, table] of Object.entries(attachments)) {
        const child = children.get(table)!.find(c => c.id === `${row.id}:${key}` && c.parentId === row.id);
        if (child) job[key] = child.data;
      }
      Object.assign(job, children.get(s.applications)!.find(c => c.id === row.id)?.data ?? {});
      const versions = children.get(s.resumeVersions)!.filter(c => c.parentId === row.id).map(c => c.data);
      const events = children.get(s.applicationEvents)!.filter(c => c.parentId === row.id).map(c => c.data);
      if (versions.length) job.versionHistory = versions;
      if (events.length) job.statusHistory = events;
      if (job.fit && job.assessmentStatus !== 'UNASSESSED') {
        try { if (!isCurrent(job.assessmentMetadata, assessmentMetadata(job as any, output.evidence, output.searchProfile))) job.assessmentStatus = 'STALE'; }
        catch { job.assessmentStatus = 'STALE'; }
      }
      return job;
    });
    output.auditLog = (await rows(tx, s.auditEvents, ownerId)).map(r => r.data);
    return output;
  }
  async function read(ownerId: string) {
    if (!ownerId) throw new WorkspaceValidationError('Owner identity required');
    return database().transaction(tx => snapshot(tx, ownerId), { isolationLevel: 'repeatable read', accessMode: 'read only' });
  }
  async function save(ownerId: string, raw: unknown, revision: number, importing = false, assessedJobId?: string) {
    if (!ownerId) throw new WorkspaceValidationError('Owner identity required');
    const parsed = workspaceInput.safeParse(raw);
    if (!parsed.success || !Number.isSafeInteger(revision) || revision < 0) throw new WorkspaceValidationError('Invalid workspace or revision');
    const input = parsed.data;
    return database().transaction(async tx => {
      await tx.insert(s.workspaces).values({ ownerId }).onConflictDoNothing();
      const changed = await tx.update(s.workspaces).set({ revision: sql`${s.workspaces.revision} + 1`, updatedAt: new Date() }).where(and(eq(s.workspaces.ownerId, ownerId), eq(s.workspaces.revision, revision))).returning();
      if (!changed.length) throw new WorkspaceConflict('Workspace changed. Reload before saving.');
      const provenance = { source: 'owner-confirmed-import', importedAt: new Date().toISOString(), status: 'requires-review' };
      const reviewImported = (value: unknown, depth = 0): any => {
        if (depth > 100) throw new WorkspaceValidationError('Import nesting exceeds supported limit');
        if (Array.isArray(value)) return value.map(child => reviewImported(child, depth + 1));
        if (!value || typeof value !== 'object') return value;
        const record = Object.fromEntries(Object.entries(value).map(([key, child]) => [key, reviewImported(child, depth + 1)]));
        // Preserve ATS verificationStatus: it is not candidate claim approval.
        // Candidate bullets and nested records cannot inherit approved provenance.
        if ('provenanceStatus' in record || ('section' in record && 'underlyingEvidence' in record)) record.provenanceStatus = 'requires-review';
        if ('id' in record || 'versionId' in record || 'requiresUserReview' in record || 'importProvenance' in record) {
          record.requiresUserReview = true; record.importProvenance = provenance;
        }
        return record;
      };
      const normalize = (data: Record<string, unknown>, evidence = false) => importing ? { ...reviewImported(data), ...(evidence ? { verificationStatus: 'requires-review' } : {}), requiresUserReview: true, importProvenance: provenance } : data;
      for (const [key, table] of Object.entries(collections)) {
        if (!(key in input)) continue;
        const entries = input[key] as Record<string, unknown>[];
        for (const entry of entries) await upsert(tx, table, ownerId, entry.id as string, normalize(entry, key === 'evidence'));
        // Explicit collection saves replace that collection; imports merge selected records.
        if (!importing) await tx.delete(table).where(and(eq(table.ownerId, ownerId), entries.length ? notInArray(table.id, entries.map(e => e.id as string)) : undefined));
      }
      for (const [key, table] of [['profile', s.candidateProfiles], ['searchProfile', s.searchProfiles], ['masterResume', s.resumes]] as const) {
        if (!(key in input)) continue;
        if (input[key] === null) {
          if (!importing) await tx.delete(table).where(and(eq(table.ownerId, ownerId), eq(table.id, key)));
        } else await upsert(tx, table, ownerId, key, normalize(input[key]!));
      }
      if (input.jobs) {
        const previous = await snapshot(tx, ownerId);
        for (const source of input.jobs) {
          const job = normalize({ ...source });
          if (job.assessmentStatus === 'ASSESSED' && job.id !== assessedJobId) {
            const old = previous.jobs.find((j:any) => j.id === job.id);
            const assessmentFields = (j:any) => j && Object.fromEntries(['fit','parsed','requirements','evidenceMatches','assessmentMetadata','assessmentFacts','qualificationFit','evidenceCoverage','applicationPriority','priorityReason','primaryRoleFamily','roleModifiers','hardRequirements','preferredRequirements','technologies','responsibilities','hiringSignals','hardBlockers','softGaps'].map(k=>[k,j[k]]));
            if (importing || !old || old.assessmentStatus !== 'ASSESSED' || fingerprint(assessmentFields(old)) !== fingerprint(assessmentFields(job))) job.assessmentStatus = 'STALE';
          }
          const id = job.id as string;
          for (const [key, table] of Object.entries(attachments)) {
            if (key in job && job[key] != null) {
              if (typeof job[key] !== 'object' || Array.isArray(job[key])) throw new WorkspaceValidationError('Invalid job attachment');
              await upsert(tx, table, ownerId, `${id}:${key}`, normalize(job[key] as Record<string, unknown>), id);
            }
            delete job[key];
          }
          const application: Record<string, unknown> = {};
          for (const key of applicationKeys) if (key in job) { application[key] = job[key]; delete job[key]; }
          if (Object.keys(application).length) await upsert(tx, s.applications, ownerId, id, normalize(application), id);
          for (const [key, table] of [['versionHistory', s.resumeVersions], ['statusHistory', s.applicationEvents]] as const) {
            if (job[key] !== undefined) {
              if (!Array.isArray(job[key])) throw new WorkspaceValidationError('Invalid job history');
              for (const [index, item] of (job[key] as Record<string, unknown>[]).entries()) {
                if (!item || typeof item !== 'object') throw new WorkspaceValidationError('Invalid history entry');
                await upsert(tx, table, ownerId, `${id}:${key}:${String(item.versionId ?? index)}`, normalize(item), id);
              }
              if (!importing) {
                const historyIds = (job[key] as Record<string, unknown>[]).map((item, index) => `${id}:${key}:${String(item.versionId ?? index)}`);
                await tx.delete(table).where(and(eq(table.ownerId, ownerId), eq(table.parentId, id), historyIds.length ? notInArray(table.id, historyIds) : undefined));
              }
            }
            delete job[key];
          }
          await upsert(tx, s.jobs, ownerId, id, job);
        }
        if (!importing) {
          const ids = input.jobs.map(j => j.id as string);
          for (const table of new Set([...Object.values(attachments), s.applications, s.resumeVersions, s.applicationEvents])) {
            await tx.delete(table).where(and(eq(table.ownerId, ownerId), sql`${table.parentId} is not null`, ids.length ? notInArray(table.parentId, ids) : undefined));
          }
          await tx.delete(s.jobs).where(and(eq(s.jobs.ownerId, ownerId), ids.length ? notInArray(s.jobs.id, ids) : undefined));
        }
      }
      const id = randomUUID();
      await upsert(tx, s.auditEvents, ownerId, id, { id, eventType: importing ? 'FILE_IMPORTED' : 'WORKSPACE_SAVED', actorId: ownerId, recordId: 'workspace', timestamp: new Date().toISOString(), summary: importing ? 'Owner confirmed selected workspace import' : 'Workspace saved' });
      return snapshot(tx, ownerId);
    });
  }
  return { read, save, saveAssessment: (ownerId: string, input: unknown, revision: number, jobId:string) => save(ownerId,input,revision,false,jobId), import: (ownerId: string, input: unknown, revision: number) => save(ownerId, input, revision, true) };
}
export const workspaceRepository = createWorkspaceRepository();
