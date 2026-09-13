import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { sql } from 'drizzle-orm';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { persistenceDb, syntheticJob } from './helpers/persistence';
import { createWorkspaceRepository, WorkspaceValidationError } from '../server/workspaceRepository';
import { createWorkspaceRouter } from '../server/workspaceRoutes';
import { assessmentMetadata } from '../server/assessment';
import { transitionApplication } from '../server/applicationLifecycle';
import { normalizeHistory, effectiveEvents, type ApplicationStatus, type TransitionRequest } from '../src/types/application';
import { computeOutcomeAnalytics, sampleState } from '../src/utils/outcomeAnalytics';
import type { JobRecord } from '../src/types';

const freshJob = () => ({...syntheticJob(),applicationStatus:'TAILORED',statusHistory:[],jdSource:'user-provided',assessmentStatus:'STALE'});
const req = (status:ApplicationStatus,extra:Partial<TransitionRequest>={}) => ({jobId:'job-a',targetStatus:status,requestId:crypto.randomUUID(),...extra});
function path(stages:ApplicationStatus[]) {
  let job:any=freshJob();
  for(const [index,stage] of stages.entries())job=transitionApplication(job,req(stage,{timestamp:`2026-01-${String(index+1).padStart(2,'0')}T12:00:00Z`}), '2026-09-13T12:00:00Z') || job;
  return job as JobRecord;
}

test('Phase 7 historical screens, deeper stages, withdrawal and archive retain explicit outcomes once',()=>{
  for(const terminal of ['REJECTED','WITHDRAWN','OFFER'] as const) {
    const job=path(['APPLIED','RECRUITER_SCREEN','HIRING_MANAGER','TECHNICAL','FINAL_ONSITE',terminal,'ARCHIVED']);
    const a=computeOutcomeAnalytics([job]);
    assert.equal(job.applicationStatus,'ARCHIVED');
    assert.deepEqual([a.totalApplications,a.totalAnyInterviews,a.totalScreens,a.totalHiringManager,a.totalTechnicalInterviews,a.totalFinalInterviews],[1,1,1,1,1,1]);
    assert.equal(a.totalRejections,terminal==='REJECTED'?1:0);assert.equal(a.totalWithdrawals,terminal==='WITHDRAWN'?1:0);assert.equal(a.totalOffers,terminal==='OFFER'?1:0);
    const duplicate={...job,statusHistory:[...job.statusHistory!,...job.statusHistory!]};
    assert.equal(computeOutcomeAnalytics([duplicate]).totalApplications,1);assert.equal(computeOutcomeAnalytics([duplicate]).totalScreens,1);
  }
  const screened=computeOutcomeAnalytics([path(['APPLIED','RECRUITER_SCREEN','REJECTED'])]);
  assert.deepEqual([screened.totalApplications,screened.totalScreens,screened.totalAnyInterviews,screened.totalRejections],[1,1,1,1]);
});

test('Phase 7 skipped stages and current-only legacy status never fabricate funnel history',()=>{
  const a=computeOutcomeAnalytics([path(['APPLIED','TECHNICAL','OFFER'])]);
  assert.deepEqual([a.totalApplications,a.totalScreens,a.totalHiringManager,a.totalTechnicalInterviews,a.totalFinalInterviews,a.totalOffers],[1,0,0,1,0,1]);
  const legacy={...freshJob(),applicationStatus:'REJECTED',statusHistory:undefined} as JobRecord;
  assert.equal(computeOutcomeAnalytics([legacy]).totalApplications,0);
  const dated={...legacy,appliedDate:'2026-01-01'};
  const d=computeOutcomeAnalytics([dated]);assert.equal(d.totalApplications,1);assert.equal(d.totalRejections,0);assert.equal(d.conversionByFitBand['UNKNOWN / LEGACY'].total,1);
  const empty=computeOutcomeAnalytics([]);assert.equal(empty.interviewRate,0);assert.equal(empty.offerRate,0);assert.equal(empty.sampleState,'INSUFFICIENT_SAMPLE');
});

test('Phase 7 migration recovers only explicit legacy destinations and quarantines malformed history',()=>{
  const raw=[{status:'APPLIED',timestamp:'2026-01-01',notes:'synthetic note'},{from:'APPLIED',to:'TECHNICAL',timestamp:'2026-01-02'},null,{status:'REJECTED',timestamp:'bad'},{to:'invented',timestamp:'2026-01-03'}];
  const n=normalizeHistory(raw);assert.equal(n.events.length,2);assert.equal(n.quarantine.length,3);
  assert.deepEqual(n.events[0],{from:null,to:'APPLIED',timestamp:'2026-01-01',note:'synthetic note'});
  const a=computeOutcomeAnalytics([{...freshJob(),statusHistory:n.events} as JobRecord]);assert.equal(a.totalTechnicalInterviews,1);assert.equal(a.totalScreens,0);
});

test('Phase 7 duplicate requests, no-op saves, notes, terminal validation and corrections are explicit',()=>{
  let job:any=freshJob();const request=req('APPLIED');job=transitionApplication(job,request)!;
  assert.equal(transitionApplication(job,request),null);assert.equal(transitionApplication(job,req('APPLIED')),null);
  assert.throws(()=>transitionApplication(job,{...request,note:'different'}),/identifier/);
  assert.throws(()=>transitionApplication(job,req('SHORTLISTED')),/correction/);
  const noted=req('APPLIED',{note:'  Owner observation  '});
  job=transitionApplication(job,noted)!;assert.equal(transitionApplication(job,noted),null);
  assert.equal(job.statusHistory.at(-1).kind,'note');assert.equal(computeOutcomeAnalytics([job]).totalApplications,1);
  job=transitionApplication(job,req('REJECTED'))!;
  assert.equal(job.statusHistory.at(-1).reasonSource,'unknown');assert.equal(job.statusHistory.at(-1).reasonText,undefined);
  assert.throws(()=>transitionApplication(job,req('TECHNICAL')),/correction/);
  const sourced=transitionApplication(path(['APPLIED']),req('REJECTED',{reasonText:'Owner hypothesis',reasonSource:'user-inferred'}))!;
  assert.equal(sourced.statusHistory.at(-1).reasonSource,'user-inferred');
  const unknown=transitionApplication(path(['APPLIED']),req('REJECTED',{reasonSource:'employer-provided'}))!;
  assert.equal(unknown.statusHistory.at(-1).reasonSource,'unknown');
  const rejection=job.statusHistory.at(-1);
  job=transitionApplication(job,req('APPLIED',{supersedesEventId:rejection.id,correctionReason:'Marked rejection accidentally'}))!;
  assert.equal(job.statusHistory.length,4);assert.equal(computeOutcomeAnalytics([job]).totalRejections,0);
  assert(job.statusHistory.some((e:any)=>e.id===rejection.id));assert(!effectiveEvents(job.statusHistory).some(e=>e.id===rejection.id));
  assert.throws(()=>transitionApplication(job,req('APPLIED',{supersedesEventId:rejection.id,correctionReason:'Again'})),/effective/);
  assert.throws(()=>transitionApplication(job,req('REJECTED',{timestamp:'2099-01-01'})),/future/);
});

test('Phase 7 backdated correction preserves later terminal state and corrections can be corrected',()=>{
  let job:any=path(['APPLIED','TECHNICAL','REJECTED']);
  const technical=job.statusHistory[1];
  job=transitionApplication(job,req('SHORTLISTED',{timestamp:'2026-01-02T12:00:00Z',supersedesEventId:technical.id,correctionReason:'Mistaken technical event'}),'2026-09-13')!;
  assert.equal(job.applicationStatus,'REJECTED');assert.equal(computeOutcomeAnalytics([job]).totalTechnicalInterviews,0);
  assert.throws(()=>transitionApplication(job,req('TECHNICAL')),/correction/);
  const correction=job.statusHistory.at(-1);
  job=transitionApplication(job,req('TECHNICAL',{timestamp:'2026-01-02T12:00:00Z',supersedesEventId:correction.id,correctionReason:'Correct previous correction'}),'2026-09-13')!;
  assert.equal(job.applicationStatus,'REJECTED');assert.equal(computeOutcomeAnalytics([job]).totalTechnicalInterviews,1);
  assert.equal(job.statusHistory.length,5);
});

test('Phase 7 legacy current-state mistakes can be corrected or confirmed without inventing a fit snapshot',()=>{
  const legacy:any={...freshJob(),applicationStatus:'APPLIED',assessmentStatus:'ASSESSED',assessmentMetadata:{algorithmVersion:'phase4.1-v2'}};
  const corrected=transitionApplication(legacy,req('SHORTLISTED',{correctLegacyState:true,correctionReason:'Legacy stage was entered accidentally'}))!;
  assert.equal(corrected.applicationStatus,'SHORTLISTED');assert.equal(corrected.statusHistory[0].from,'APPLIED');assert.equal(corrected.statusHistory[0].kind,'correction');
  const confirmed=transitionApplication(legacy,req('APPLIED',{timestamp:'2026-01-01',correctLegacyState:true,correctionReason:'Owner confirms actual historical submission'}))!;
  assert.equal(computeOutcomeAnalytics([confirmed]).totalApplications,1);assert.equal(confirmed.applicationSnapshot,undefined);
  const dated:any={...legacy,applicationStatus:'REJECTED',appliedDate:'2026-01-01'};
  const fixed=transitionApplication(dated,req('TECHNICAL',{timestamp:'2026-01-02',correctLegacyState:true,correctionReason:'Correct legacy current stage'}))!;
  assert.equal(fixed.appliedDate,'2026-01-01');assert.equal(computeOutcomeAnalytics([fixed]).totalTechnicalInterviews,1);
  assert.equal(computeOutcomeAnalytics([fixed]).totalApplications,1);
  const progressed=transitionApplication({...dated,applicationStatus:'APPLIED'},req('TECHNICAL',{timestamp:'2026-01-02'}))!;
  assert.equal(progressed.appliedDate,'2026-01-01');assert.equal(computeOutcomeAnalytics([progressed]).totalApplications,1);
  assert.throws(()=>transitionApplication(confirmed,req('DISCOVERED',{correctLegacyState:true,correctionReason:'No target supplied'})),/established/);
});

test('Phase 7 history overflow fails before appending and legacy overflow is retained in quarantine',()=>{
  const job:any=path(['APPLIED']);
  job.statusHistory=[...job.statusHistory,...Array.from({length:4999},(_,i)=>({id:`note-${i}`,from:'APPLIED',to:'APPLIED',kind:'note',timestamp:'2026-01-01T12:00:00Z',note:'Synthetic note'}))];
  assert.throws(()=>transitionApplication(job,req('TECHNICAL')),/limit/);assert.equal(job.statusHistory.length,5000);
  const overflow=normalizeHistory([...job.statusHistory,{from:'APPLIED',to:'TECHNICAL',timestamp:'2026-01-02'}]);
  assert.equal(overflow.events.length,5000);assert.equal((overflow.quarantine[0] as any).events[0].to,'TECHNICAL');
});

test('Phase 7 application snapshot segments remain stable after current reassessment; strong rejection is noisy observation',()=>{
  let job:any={...freshJob(),assessmentStatus:'ASSESSED',assessmentMetadata:{algorithmVersion:'phase4.1-v2'},qualificationFit:9.5,evidenceCoverage:9,applicationPriority:'APPLY FIRST',roleModifiers:['DESIGN_SYSTEMS','DESIGN_SYSTEMS','ACCESSIBILITY'],publishedAt:'2026-01-01',atsProvider:'ashby',sourceChannel:'search',fit:{...syntheticJob().fit,recommendation:'APPLY'}};
  job=transitionApplication(job,req('APPLIED',{timestamp:'2026-01-02',applicationChannel:'REFERRAL'}),'2026-09-13')!;
  const snapshot=structuredClone(job.applicationSnapshot),score=job.qualificationFit;
  job=transitionApplication(job,req('REJECTED',{timestamp:'2026-01-03'}),'2026-09-13')!;
  assert.equal(job.qualificationFit,score);assert.equal(job.statusHistory.at(-1).reasonText,undefined);
  job={...job,qualificationFit:2,applicationPriority:'SKIP',primaryRoleFamily:'forward-deployed-software',roleModifiers:[],freshnessBand:'OLD',assessmentStatus:'STALE'};
  assert.deepEqual(job.applicationSnapshot,snapshot);
  const a=computeOutcomeAnalytics([job]);
  assert.equal(a.conversionByFamily['frontend-product'].rejections,1);assert.equal(a.conversionByModifier.DESIGN_SYSTEMS.total,1);
  assert.equal(a.conversionByModifier.ACCESSIBILITY.total,1);assert.equal(a.conversionByChannel.REFERRAL.total,1);
  assert.equal(a.conversionBySource.search.total,1);assert.equal(a.conversionByAts.ashby.total,1);assert.equal(a.conversionByFreshness.NEW.total,1);
  const band=Object.keys(a.conversionByFitBand)[0];assert.match(band,/phase4.1-v2.*APPLY FIRST.*8.8/);assert.equal(a.conversionByFitBand[band].rejections,1);
  assert.equal(a.conversionByFitBand[band].sampleState,'INSUFFICIENT_SAMPLE');assert.equal(a.conversionByFitBand[band].rate,0);
  const corrected=transitionApplication(job,req('APPLIED',{timestamp:'2026-01-01T12:00:00Z',supersedesEventId:job.statusHistory[0].id,correctionReason:'Correct actual application instant'}),'2026-09-13')!;
  assert.deepEqual(corrected.applicationSnapshot,snapshot);assert.equal(corrected.appliedDate,'2026-01-01T12:00:00.000Z');
  assert.equal(computeOutcomeAnalytics([corrected]).conversionByFitBand['UNKNOWN / LEGACY'].total,1);
  const legacy={...job,applicationSnapshot:undefined};assert.equal(computeOutcomeAnalytics([legacy]).conversionByFitBand['UNKNOWN / LEGACY'].total,1);
});

test('Phase 7 sample thresholds, measured medians and weekly event windows are deterministic',()=>{
  assert.deepEqual([0,1,4,5,14,15].map(sampleState),['INSUFFICIENT_SAMPLE','INSUFFICIENT_SAMPLE','INSUFFICIENT_SAMPLE','EARLY_SIGNAL','EARLY_SIGNAL','OBSERVED']);
  const job=path(['APPLIED','TECHNICAL','REJECTED']);
  assert.equal(computeOutcomeAnalytics([job]).timeToEvent.firstInterview.medianDays,null);
  const cohort=computeOutcomeAnalytics(Array.from({length:5},(_,i)=>({...job,id:`job-${i}`})));
  assert.equal(cohort.timeToEvent.firstInterview.medianDays,1);assert.equal(cohort.timeToEvent.rejection.medianDays,2);
  assert.equal(cohort.conversionByChannel.UNKNOWN.total,5);assert.equal(cohort.conversionByChannel.UNKNOWN.rate,1);
  const weekly=computeOutcomeAnalytics([job],{start:'2026-01-02',end:'2026-01-04'});
  assert.equal(weekly.totalApplications,0);assert.equal(weekly.totalTechnicalInterviews,1);assert.equal(weekly.totalRejections,1);assert.equal(weekly.interviewRate,null);
});

test('Phase 7 owner repository transition is atomic, immutable through saves/imports, idempotent and owner isolated',async()=>{
  const {pg,db}=await persistenceDb();const repo=createWorkspaceRepository(()=>db as any);
  try {
    const seed:any=freshJob();seed.assessmentMetadata=assessmentMetadata(seed,[],null);seed.assessmentStatus='ASSESSED';
    await repo.saveAssessment('owner-a',{jobs:[seed]},0,seed.id);
    await repo.save('owner-b',{jobs:[{...freshJob(),id:'other-job'}]},0);
    await assert.rejects(repo.transition('owner-a',req('APPLIED',{jobId:'other-job'})),/owner workspace/);
    const request=req('APPLIED',{applicationChannel:'DIRECT_PORTAL',timestamp:'2026-01-02'});
    const applied=await repo.transition('owner-a',request);assert.equal(applied.jobs[0].applicationSnapshot.assessmentState,'KNOWN');
    const retried=await repo.transition('owner-a',request);assert.deepEqual(retried,applied);
    const concurrent=await Promise.all([repo.transition('owner-a',req('RECRUITER_SCREEN')),repo.transition('owner-a',req('RECRUITER_SCREEN'))]);
    const screened=await repo.read('owner-a');assert.equal(screened.jobs[0].statusHistory.length,2);
    assert.equal(screened.auditLog.filter(e=>e.eventType==='APPLICATION_STATUS_CHANGED').length,2);
    const rejected=await repo.transition('owner-a',req('REJECTED'));
    const archived=await repo.transition('owner-a',req('ARCHIVED'));
    const forged={...archived.jobs[0],applicationStatus:'OFFER',statusHistory:[],appliedDate:'2099-01-01',applicationSnapshot:{...archived.jobs[0].applicationSnapshot,qualificationFit:1}};
    const saved=await repo.save('owner-a',{jobs:[forged]},archived.revision);assert.deepEqual(saved.jobs[0].statusHistory,archived.jobs[0].statusHistory);assert.deepEqual(saved.jobs[0].applicationSnapshot,applied.jobs[0].applicationSnapshot);
    const imported=await repo.import('owner-a',{jobs:[forged]},saved.revision);assert.deepEqual(imported.jobs[0].applicationSnapshot,applied.jobs[0].applicationSnapshot);
    assert.deepEqual([computeOutcomeAnalytics(imported.jobs).totalApplications,computeOutcomeAnalytics(imported.jobs).totalScreens,computeOutcomeAnalytics(imported.jobs).totalRejections],[1,1,1]);
    assert.equal(computeOutcomeAnalytics((await repo.read('owner-b')).jobs).totalApplications,0);
    await db.execute(sql`CREATE FUNCTION fail_transition_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'synthetic transition failure'; END $$`);
    await db.execute(sql`CREATE TRIGGER fail_transition_audit BEFORE INSERT ON audit_events FOR EACH ROW EXECUTE FUNCTION fail_transition_audit()`);
    const before=await repo.read('owner-a');
    await assert.rejects(repo.transition('owner-a',req('APPLIED',{supersedesEventId:rejected.jobs[0].statusHistory.at(-1).id,correctionReason:'synthetic correction'})));
    assert.deepEqual(await repo.read('owner-a'),before,'event/status/revision/audit all roll back');
  } finally {await pg.close();}
});

test('Phase 7 disk restart and new-owner export/import preserve snapshot/events; malformed legacy is quarantined',async()=>{
  const directory=await mkdtemp(join(tmpdir(),'phase7-synthetic-'));let connection=await persistenceDb(directory);
  try {
    let repo=createWorkspaceRepository(()=>connection.db as any);
    await repo.save('owner-a',{jobs:[freshJob()]},0);
    const applied=await repo.transition('owner-a',req('APPLIED'));
    await connection.pg.close();connection=await persistenceDb(directory);repo=createWorkspaceRepository(()=>connection.db as any);
    const restarted=await repo.read('owner-a');assert.deepEqual(restarted.jobs[0].applicationSnapshot,applied.jobs[0].applicationSnapshot);assert.deepEqual(restarted.jobs[0].statusHistory,applied.jobs[0].statusHistory);
    const imported=await repo.import('owner-b',{jobs:restarted.jobs},0);assert.deepEqual(imported.jobs[0].applicationSnapshot,applied.jobs[0].applicationSnapshot);assert.deepEqual(imported.jobs[0].statusHistory,applied.jobs[0].statusHistory);
    const legacy=await repo.import('owner-b',{jobs:[{...freshJob(),id:'legacy',statusHistory:[{status:'APPLIED',notes:'synthetic',timestamp:'2026-01-01'},null]}]},imported.revision);
    assert.equal(legacy.jobs.find(j=>j.id==='legacy').historyQuarantine.length,1);
    assert.equal(legacy.jobs.find(j=>j.id==='legacy').statusHistory[0].from,null);
  } finally {await connection.pg.close();await rm(directory,{recursive:true,force:true});}
});

test('Phase 7 real owner HTTP operations reject browser histories and malformed transition payloads',async()=>{
  const {pg,db}=await persistenceDb();const repo=createWorkspaceRepository(()=>db as any);
  const app=express();app.use(express.json());app.use('/api/workspace',createWorkspaceRouter(repo,(_req,res,next)=>{res.locals.ownerId='owner-a';next();}));
  const server=app.listen(0);const base=`http://127.0.0.1:${(server.address() as any).port}/api/workspace`;
  const post=(route:string,body:unknown)=>fetch(base+route,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
  try {
    assert.equal((await post('/data',{revision:0,data:{jobs:[syntheticJob()]}})).status,400);
    assert.equal((await post('/data',{revision:0,data:{jobs:[freshJob()]}})).status,200);
    assert.equal((await post('/application-transition',{...req('APPLIED'),statusHistory:[]})).status,400);
    const response=await post('/application-transition',req('APPLIED'));assert.equal(response.status,200);
    assert.equal((await response.json()).data.jobs[0].applicationStatus,'APPLIED');
    const analytics=await fetch(base+'/analytics');assert.match(analytics.headers.get('cache-control')!,/no-store/);assert.equal((await analytics.json()).totalApplications,1);
    assert.equal((await post('/application-transition',req('TECHNICAL',{jobId:'absent'}))).status,400);
  } finally {await new Promise<void>(resolve=>server.close(()=>resolve()));await pg.close();}
});
