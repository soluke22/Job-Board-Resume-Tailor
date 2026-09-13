import { randomUUID } from 'node:crypto';
import { effectiveEvents, normalizeHistory, type TransitionRequest, type StatusTransitionEvent, type ApplicationSnapshot } from '../src/types/application';
import { fingerprint } from './assessment';
function applicationFreshness(publishedAt: string | undefined, at: string) {
  const age=(Date.parse(at)-Date.parse(publishedAt || ''))/86400000;
  return !Number.isFinite(age) || age<0 ? 'UNKNOWN' : Math.floor(age)<=7 ? 'NEW' : Math.floor(age)<=21 ? 'RECENT' : Math.floor(age)<=45 ? 'ESTABLISHED' : 'OLD';
}

export class ApplicationTransitionError extends Error {}
export function transitionApplication(job: any, request: TransitionRequest, now = new Date().toISOString()) {
  request={...request,reasonSource:request.reasonText?.trim()?request.reasonSource:undefined,note:request.note?.trim() || undefined,reasonText:request.reasonText?.trim() || undefined,correctionReason:request.correctionReason?.trim() || undefined};
  const history = normalizeHistory(job.statusHistory).events.map((e,index)=>({...e,id:e.id || `legacy-${index}`}));
  const prior = history.find(e=>e.requestId===request.requestId);
  if (prior) {
    const same = prior.to===request.targetStatus && (prior.note || '')===(request.note || '') &&
      prior.supersedesEventId===request.supersedesEventId && prior.correctionReason===request.correctionReason &&
      (!request.timestamp || prior.timestamp===new Date(request.timestamp).toISOString()) &&
      (!request.applicationChannel || prior.applicationChannel===request.applicationChannel) &&
      (!request.outcomeSource || prior.outcomeSource===request.outcomeSource) &&
      (prior.reasonText || '')===(request.reasonText || '') && (!request.reasonSource || prior.reasonSource===request.reasonSource);
    if (!same) throw new ApplicationTransitionError('Request identifier already used for a different event');
    return null;
  }
  const from = job.applicationStatus, to=request.targetStatus;
  const correction = !!request.supersedesEventId || !!request.correctLegacyState;
  if (correction !== !!request.correctionReason) throw new ApplicationTransitionError('Correction requires an event and a reason');
  if(request.correctLegacyState && (request.supersedesEventId || effectiveEvents(history).length))throw new ApplicationTransitionError('Legacy current-state correction requires no established transition history');
  if (correction && !request.correctLegacyState) {
    const target=history.find(e=>e.id===request.supersedesEventId);
    if (!target || target.kind==='note' || !effectiveEvents(history).some(e=>e.id===target.id)) throw new ApplicationTransitionError('Correction target is not an effective transition');
  }
  const rank: Record<string,number>={DISCOVERED:0,SHORTLISTED:1,TAILORED:2,APPLIED:3,RECRUITER_SCREEN:4,HIRING_MANAGER:5,TECHNICAL:6,FINAL_ONSITE:7,OFFER:8};
  if (!correction && from!==to && to!=='ARCHIVED') {
    if (['REJECTED','WITHDRAWN','ARCHIVED','OFFER'].includes(from) || rank[to]!==undefined && rank[from]!==undefined && rank[to]<rank[from]) throw new ApplicationTransitionError('Reopening or moving backward requires an explicit correction');
    if (rank[to]>=4 && !effectiveEvents(history).some(e=>e.to==='APPLIED') && !job.appliedDate) throw new ApplicationTransitionError('Record the application before an interview or offer');
  }
  if (request.reasonText && to!=='REJECTED' || request.reasonSource && to!=='REJECTED') throw new ApplicationTransitionError('Rejection reasons belong to rejection events');
  if (request.applicationChannel && to!=='APPLIED') throw new ApplicationTransitionError('Application channel belongs to an application event');
  if (from===to && !correction && !request.note?.trim() && !request.reasonText?.trim()) return null;
  if(history.length>=5000)throw new ApplicationTransitionError('Application history limit reached; no event was saved');
  const timestamp=request.timestamp ? new Date(request.timestamp).toISOString() : now;
  if (Date.parse(timestamp)>Date.parse(now)) throw new ApplicationTransitionError('Event timestamp cannot be in the future');
  const effective=effectiveEvents(history);
  if (!correction && effective.length && Date.parse(timestamp)<Math.max(...effective.map(e=>Date.parse(e.timestamp)))) throw new ApplicationTransitionError('Backdated events before recorded progression require a correction');
  const event:StatusTransitionEvent={id:randomUUID(),from,to,timestamp,recordedAt:now,requestId:request.requestId,
    kind:correction?'correction':from===to?'note':'transition',
    ...(request.note?.trim()?{note:request.note.trim()}:{}),
    ...(correction?{supersedesEventId:request.supersedesEventId,correctionReason:request.correctionReason}:{}),
    ...(to==='APPLIED'?{applicationChannel:request.applicationChannel || 'UNKNOWN'}:{}),
    outcomeSource:request.outcomeSource || 'manual',
    ...(to==='REJECTED'?{reasonText:request.reasonText?.trim() || undefined,reasonSource:request.reasonSource || 'unknown'}:{})};
  const events=[...history,event];
  const semantic=effectiveEvents(events).slice().sort((a,b)=>Date.parse(a.timestamp)-Date.parse(b.timestamp));
  const currentStatus=semantic.at(-1)?.to || job.applicationStatus;
  const firstApplied=semantic.find(e=>e.to==='APPLIED');
  let snapshot:ApplicationSnapshot|undefined=job.applicationSnapshot;
  // Existing legacy application history must never receive a current-score backfill.
  if (!snapshot && !request.correctLegacyState && to==='APPLIED' && from!==to && !effective.some(e=>e.to==='APPLIED') && !job.appliedDate) {
    const known=job.assessmentStatus==='ASSESSED' && !!job.assessmentMetadata;
    snapshot={appliedAt:timestamp,capturedAt:now,assessmentState:known?'KNOWN':'UNKNOWN',
      ...(known?{assessmentAlgorithmVersion:job.assessmentMetadata.algorithmVersion,qualificationFit:job.qualificationFit,
        evidenceCoverage:job.evidenceCoverage,applicationPriority:job.applicationPriority,recommendation:job.fit?.recommendation || job.fit?.verdict,
        roleFamily:job.primaryRoleFamily,assessmentFingerprint:fingerprint({metadata:job.assessmentMetadata,fit:job.fit,roleFamily:job.primaryRoleFamily,modifiers:job.roleModifiers})}:{}),
      modifiers:known?[...new Set<string>(job.roleModifiers || [])]:[],freshnessBand:applicationFreshness(job.publishedAt,timestamp),
      verificationStatus:job.verificationStatus || 'UNKNOWN',sourceChannel:job.sourceChannel || 'UNKNOWN',atsProvider:job.atsProvider || 'unknown',applicationChannel:request.applicationChannel || 'UNKNOWN'};
  }
  const legacySubmission = !snapshot && !effective.some(e=>e.to==='APPLIED') && job.appliedDate &&
    (rank[currentStatus]>=3 || ['REJECTED','WITHDRAWN','ARCHIVED'].includes(currentStatus)) ? job.appliedDate : undefined;
  return {...job,applicationStatus:currentStatus,statusHistory:events,appliedDate:firstApplied?.timestamp || legacySubmission,
    applicationSnapshot:snapshot};
}
