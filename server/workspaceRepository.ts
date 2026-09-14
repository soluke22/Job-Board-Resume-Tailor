import { normalizeApplicationJob, transitionRequestSchema } from '../src/types/application.js';
import { transitionApplication, ApplicationTransitionError } from './applicationLifecycle.js';
import { inspectArtifact, preserveArtifact } from './artifactProvenance.js';
import { and, eq, notInArray, sql } from 'drizzle-orm';
import { z } from 'zod';
import { randomUUID } from 'node:crypto';
import { createHash } from 'node:crypto';
import { evidenceReviewContent, preserveEvidenceReview } from '../src/utils/evidenceReview.js';
import type { EvidenceItem } from '../src/types/index.js';
import { getDb } from './db/client.js';
import * as s from './db/schema.js';
import { workspaceInput } from './db/workspaceValidation.js';
import { assessmentMetadata, isCurrent, fingerprint } from './assessment.js';
import { inspectResume, factualClaims } from './resumeProvenance.js';
import { assertBoundedJson } from './inputBounds.js';
export { workspaceInput } from './db/workspaceValidation.js';

export type WorkspaceInput = z.infer<typeof workspaceInput>;
export class WorkspaceConflict extends Error {}
export class WorkspaceValidationError extends Error {}
export const evidenceApprovalSchema = z.object({ evidenceId: z.string().min(1).max(200),
  revision: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER),
  contentHash: z.string().regex(/^[a-f0-9]{64}$/) }).strict();
export const evidenceReviewHash = (evidence: EvidenceItem) => createHash('sha256').update(evidenceReviewContent(evidence)).digest('hex');
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
const applicationKeys = ['applicationStatus', 'appliedDate', 'rejectionReason', 'stage', 'channel', 'applicationAnswers', 'applicationSnapshot'];
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
      const events = children.get(s.applicationEvents)!.filter(c => c.parentId === row.id).sort((a,b)=>Number(a.id.split(':').at(-1))-Number(b.id.split(':').at(-1))).map(c => c.data);
      if (versions.length) job.versionHistory = versions;
      if (events.length) job.statusHistory = events;
      if (job.fit && job.assessmentStatus !== 'UNASSESSED') {
        try { if (!isCurrent(job.assessmentMetadata, assessmentMetadata(job as any, output.evidence, output.searchProfile))) job.assessmentStatus = 'STALE'; }
        catch { job.assessmentStatus = 'STALE'; }
      }
      return normalizeApplicationJob(job);
    });
    output.auditLog = (await rows(tx, s.auditEvents, ownerId)).map(r => r.data);
    for (const job of output.jobs) if (job.tailoredResume) {
      job.tailoredResume = inspectResume(job.tailoredResume, output as any, job);
      if (job.tailoredResume.readiness !== 'READY') delete job.evaluation;
    }
    for (const job of output.jobs) {
      for (const key of ['proofPack','recruiterOutreach','outreachDrafts','referralContact']) if(job[key])job[key]=inspectArtifact(job[key],output as any,job);
      if(job.applicationAnswers)job.applicationAnswers=job.applicationAnswers.map((a:any)=>inspectArtifact(a,output as any,job));
    }
    return output;
  }
  async function read(ownerId: string) {
    if (!ownerId) throw new WorkspaceValidationError('Owner identity required');
    return database().transaction(tx => snapshot(tx, ownerId), { isolationLevel: 'repeatable read', accessMode: 'read only' });
  }
  async function save(ownerId: string, raw: unknown, revision: number, importing = false, assessedJobId?: string, resumeJobId?: string, artifactJobId?: string, artifactKey?: string, approvedEvidenceId?: string) {
    if (!ownerId) throw new WorkspaceValidationError('Owner identity required');
    try { assertBoundedJson(raw); } catch { throw new WorkspaceValidationError('Invalid workspace complexity'); }
    const parsed = workspaceInput.safeParse(raw);
    if (!parsed.success || !Number.isSafeInteger(revision) || revision < 0) throw new WorkspaceValidationError('Invalid workspace or revision');
    const input = parsed.data;
    return database().transaction(async tx => {
      await tx.insert(s.workspaces).values({ ownerId }).onConflictDoNothing();
      const changed = await tx.update(s.workspaces).set({ revision: sql`${s.workspaces.revision} + 1`, updatedAt: new Date() }).where(and(eq(s.workspaces.ownerId, ownerId), eq(s.workspaces.revision, revision))).returning();
      if (!changed.length) throw new WorkspaceConflict('Workspace changed. Reload before saving.');
      const previousEvidence = (await tx.select().from(s.evidenceItems).where(eq(s.evidenceItems.ownerId, ownerId)))
        .map((row: any) => ({ ...decode(s.evidenceItems, row).data, id: row.id }) as EvidenceItem);
      const provenance = { source: 'owner-confirmed-import', importedAt: new Date().toISOString(), status: 'requires-review' };
      const reviewImported = (value: unknown, depth = 0): any => {
        if (depth > 100) throw new WorkspaceValidationError('Import nesting exceeds supported limit');
        if (Array.isArray(value)) return value.map(child => reviewImported(child, depth + 1));
        if (!value || typeof value !== 'object') return value;
        const record = Object.fromEntries(Object.entries(value).map(([key, child]) => [key, reviewImported(child, depth + 1)]));
        // Preserve ATS verificationStatus: it is not candidate claim approval.
        // Candidate bullets and nested records cannot inherit approved provenance.
        if ('provenanceStatus' in record || ('section' in record && 'underlyingEvidence' in record)) record.provenanceStatus = 'requires-review';
        const jdRequirement='kind' in record && 'excerpt' in record && 'start' in record && 'end' in record;
        if (!jdRequirement && ('id' in record || 'versionId' in record || 'requiresUserReview' in record || 'importProvenance' in record)) {
          record.requiresUserReview = true; record.importProvenance = provenance;
        }
        return record;
      };
      const normalize = (data: Record<string, unknown>, evidence = false) => importing ? { ...reviewImported(data), ...(evidence ? { verificationStatus: 'requires-review' } : {}), requiresUserReview: true, importProvenance: provenance } : data;
      for (const [key, table] of Object.entries(collections)) {
        if (!(key in input)) continue;
        const entries = input[key] as Record<string, unknown>[];
        for (const entry of entries) {
          let record = normalize(entry, key === 'evidence');
          if (key === 'evidence' && !importing) {
            record = preserveEvidenceReview(entry as unknown as EvidenceItem, previousEvidence.find((e: EvidenceItem) => e.id === entry.id));
            if (entry.id === approvedEvidenceId) record = { ...record, verificationStatus: 'verified', requiresUserReview: false, lastVerifiedAt: new Date().toISOString() };
          }
          await upsert(tx, table, ownerId, entry.id as string, record);
        }
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
          // Lifecycle history is owner-reported observation, not candidate claim
          // certification. Recursive evidence review tags must not corrupt it.
          for(const key of ['statusHistory','applicationSnapshot','historyQuarantine'])
            if(source[key]!==undefined)job[key]=source[key];
          if (job.tailoredResume && job.id !== resumeJobId) {
            const old=previous.jobs.find((j:any)=>j.id===job.id)?.tailoredResume;
            const resume=job.tailoredResume as any;
            const facts=factualClaims(resume);
            resume.basis=old?.id===resume.id ? old.basis : undefined;
            resume.claimLedger=(resume.claimLedger || []).map((claim:any)=>{
              const original=old?.id===resume.id && old.claimLedger?.find((c:any)=>c.claimId===claim.claimId);
              const fact=facts.find(f=>f.claimId===claim.claimId);
              if(!importing && original && fact && fact.text===original.text && fact.scopeId===original.scopeId && fact.claimType===original.claimType && fingerprint(claim.supportingEvidenceIds)===fingerprint(original.supportingEvidenceIds) && fingerprint(claim.targetRequirementIds)===fingerprint(original.targetRequirementIds))return original;
              return {...claim,text:fact?.text || claim.text,textHash:fingerprint(fact?.text || claim.text),sourceKind:'manual',generationMode:'manual',validationStatus:'manual-edit-unvalidated',validatedTextHash:undefined,validatedAt:undefined,issues:['Exact current text requires server validation']};
            });
            resume.readiness='NEEDS_VALIDATION';delete job.evaluation;
          }
          if (job.assessmentStatus === 'ASSESSED' && job.id !== assessedJobId) {
            const old = previous.jobs.find((j:any) => j.id === job.id);
            const assessmentFields = (j:any) => j && Object.fromEntries(['fit','parsed','requirements','evidenceMatches','assessmentMetadata','assessmentFacts','qualificationFit','evidenceCoverage','applicationPriority','priorityReason','primaryRoleFamily','roleModifiers','hardRequirements','preferredRequirements','technologies','responsibilities','hiringSignals','hardBlockers','softGaps'].map(k=>[k,j[k]]));
            if (importing || !old || old.assessmentStatus !== 'ASSESSED' || fingerprint(assessmentFields(old)) !== fingerprint(assessmentFields(job))) job.assessmentStatus = 'STALE';
          }
          const previousJob=previous.jobs.find((j:any)=>j.id===job.id);
          for(const key of ['proofPack','recruiterOutreach','outreachDrafts','referralContact']) {
            if(job[key] && !(job.id===artifactJobId && key===artifactKey))job[key]=preserveArtifact(job[key],importing?undefined:previousJob?.[key]);
          }
          if(Array.isArray(job.applicationAnswers) && !(job.id===artifactJobId && artifactKey==='applicationAnswers'))job.applicationAnswers=job.applicationAnswers.map((a:any)=>preserveArtifact(a,importing?undefined:previousJob?.applicationAnswers?.find((old:any)=>old.id===a.id)));
          if (previousJob) {
            for (const key of ['applicationStatus','statusHistory','appliedDate','applicationSnapshot','rejectionReason','historyQuarantine']) {
              if (previousJob[key] !== undefined) job[key]=previousJob[key]; else delete job[key];
            }
          } else if (!importing) {
            delete job.applicationSnapshot;
          }
          const id = job.id as string;
          const oldVersions=previous.jobs.find((j:any)=>j.id===id)?.versionHistory || [];
          const protectedVersions=oldVersions.filter((v:any)=>v.resume?.basis?.tailoringAlgorithmVersion);
          if(protectedVersions.length) {
            const supplied=(job.versionHistory || []) as any[];
            for(const original of protectedVersions) {
              const changed=supplied.find(v=>v.versionId===original.versionId);
              if(!importing && changed && fingerprint(changed)!==fingerprint(original))throw new WorkspaceValidationError('Certified resume history is immutable');
            }
            job.versionHistory=[...protectedVersions,...supplied.filter(v=>!protectedVersions.some((old:any)=>old.versionId===v.versionId))];
          }
          if(job.id!==resumeJobId && Array.isArray(job.versionHistory))job.versionHistory=job.versionHistory.map((v:any)=>{
            if(protectedVersions.some((old:any)=>old.versionId===v.versionId))return v;
            if(!v.resume?.claimLedger)return v;
            return {...v,resume:{...v.resume,basis:undefined,readiness:'DRAFT',claimLedger:v.resume.claimLedger.map((c:any)=>({...c,validationStatus:'manual-edit-unvalidated',validatedTextHash:undefined,validatedAt:undefined}))}};
          });
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
                if(key==='versionHistory' && protectedVersions.some((v:any)=>v.versionId===item.versionId))continue;
                await upsert(tx, table, ownerId, `${id}:${key}:${String(item.versionId ?? index)}`, key==='statusHistory' ? item : normalize(item), id);
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
      await upsert(tx, s.auditEvents, ownerId, id, { id, eventType: importing ? 'FILE_IMPORTED' : approvedEvidenceId ? 'EVIDENCE_APPROVED' : 'WORKSPACE_SAVED', actorId: ownerId, recordId: approvedEvidenceId || 'workspace', timestamp: new Date().toISOString(), summary: importing ? 'Owner confirmed selected workspace import' : approvedEvidenceId ? 'Owner explicitly approved reviewed evidence' : 'Workspace saved' });
      return snapshot(tx, ownerId);
    });
  }
  async function transition(ownerId: string, raw: unknown) {
    if (!ownerId) throw new WorkspaceValidationError('Owner identity required');
    const parsed=transitionRequestSchema.safeParse(raw);
    if (!parsed.success) throw new WorkspaceValidationError('Invalid application transition request');
    return database().transaction(async tx=>{
      await tx.insert(s.workspaces).values({ownerId}).onConflictDoNothing();
      await tx.select().from(s.workspaces).where(eq(s.workspaces.ownerId,ownerId)).for('update');
      const workspace=await snapshot(tx,ownerId);
      const job=workspace.jobs.find((j:any)=>j.id===parsed.data.jobId);
      if (!job) throw new WorkspaceValidationError('Job not found in owner workspace');
      let updated;
      try { updated=transitionApplication(job,parsed.data); }
      catch(error) { if(error instanceof ApplicationTransitionError)throw new WorkspaceValidationError(error.message); throw error; }
      if (!updated) return workspace;
      const application:Record<string,unknown>={};
      for(const key of applicationKeys)if(updated[key]!==undefined)application[key]=updated[key];
      await upsert(tx,s.applications,ownerId,job.id,application,job.id);
      for(const [index,event] of updated.statusHistory.entries())
        await upsert(tx,s.applicationEvents,ownerId,`${job.id}:statusHistory:${index}`,event,job.id);
      const historyIds=updated.statusHistory.map((_event:any,index:number)=>`${job.id}:statusHistory:${index}`);
      await tx.delete(s.applicationEvents).where(and(eq(s.applicationEvents.ownerId,ownerId),eq(s.applicationEvents.parentId,job.id),notInArray(s.applicationEvents.id,historyIds)));
      if(updated.historyQuarantine?.length) {
        const [stored]=await tx.select().from(s.jobs).where(and(eq(s.jobs.ownerId,ownerId),eq(s.jobs.id,job.id)));
        await upsert(tx,s.jobs,ownerId,job.id,{...decode(s.jobs,stored).data,historyQuarantine:updated.historyQuarantine});
      }
      const auditId=randomUUID();
      await upsert(tx,s.auditEvents,ownerId,auditId,{id:auditId,eventType:'APPLICATION_STATUS_CHANGED',actorId:ownerId,recordId:job.id,timestamp:new Date().toISOString(),summary:`Application ${updated.statusHistory.at(-1).kind}: ${job.applicationStatus} to ${updated.applicationStatus}`});
      await tx.update(s.workspaces).set({revision:sql`${s.workspaces.revision} + 1`,updatedAt:new Date()}).where(eq(s.workspaces.ownerId,ownerId));
      return snapshot(tx,ownerId);
    });
  }
  async function approveEvidence(ownerId: string, raw: unknown) {
    const request = evidenceApprovalSchema.safeParse(raw);
    if (!request.success) throw new WorkspaceValidationError('Only a persisted evidence ID, revision and reviewed content hash are accepted');
    const workspace = await read(ownerId);
    if (workspace.revision !== request.data.revision) throw new WorkspaceConflict('Workspace changed. Review the current evidence before approving.');
    const evidence = workspace.evidence.find((e: EvidenceItem) => e.id === request.data.evidenceId);
    if (!evidence) throw new WorkspaceValidationError('Evidence not found in owner workspace');
    if (evidenceReviewHash(evidence) !== request.data.contentHash) throw new WorkspaceConflict('Evidence changed. Review the current evidence before approving.');
    return save(ownerId, { evidence: workspace.evidence }, workspace.revision, false, undefined, undefined, undefined, undefined, evidence.id);
  }
  return { read, save, approveEvidence, transition, saveArtifact:(ownerId:string,input:unknown,revision:number,jobId:string,key:string)=>save(ownerId,input,revision,false,undefined,undefined,jobId,key), saveAssessment: (ownerId: string, input: unknown, revision: number, jobId:string) => save(ownerId,input,revision,false,jobId), saveResume:(ownerId:string,input:unknown,revision:number,jobId:string)=>save(ownerId,input,revision,false,undefined,jobId), import: (ownerId: string, input: unknown, revision: number) => save(ownerId, input, revision, true) };
}
export const workspaceRepository = createWorkspaceRepository();
