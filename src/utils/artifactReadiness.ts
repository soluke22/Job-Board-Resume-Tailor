import type { JobRecord } from '../types';

export function canCopyArtifact(artifact:any) {
  return !!artifact && artifact.provenance?.validationStatus==='READY' && !!artifact.provenance.validatedTextHash;
}
export function invalidateJobArtifacts(job:JobRecord,reason:string):JobRecord {
  const stale=(a:any)=>a?{...a,provenance:{...a.provenance,validationStatus:'STALE',issues:[reason]}}:a;
  return {...job,proofPack:stale(job.proofPack),recruiterOutreach:stale(job.recruiterOutreach),outreachDrafts:stale(job.outreachDrafts),
    referralContact:stale(job.referralContact),applicationAnswers:job.applicationAnswers?.map(stale)};
}

export function invalidateEditedArtifacts(previous:JobRecord,next:JobRecord):JobRecord {
  const content=(a:any)=>{if(!a)return a;const {provenance,...rest}=a;return rest;};
  const changed=(a:any,old:any)=>a && old && JSON.stringify(content(a))!==JSON.stringify(content(old))?
    {...a,provenance:{...old.provenance,validationStatus:'NEEDS_REVIEW',validatedTextHash:undefined,issues:['Manual edit requires fresh generation and validation']}}:a;
  return {...next,proofPack:changed(next.proofPack,previous.proofPack),recruiterOutreach:changed(next.recruiterOutreach,previous.recruiterOutreach),outreachDrafts:changed(next.outreachDrafts,previous.outreachDrafts),
    referralContact:changed(next.referralContact,previous.referralContact),applicationAnswers:next.applicationAnswers?.map(a=>changed(a,previous.applicationAnswers?.find(old=>old.id===a.id)))};
}
