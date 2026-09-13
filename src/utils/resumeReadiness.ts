import type { TailoredResume } from '../types';

// Client fence supplements server inspection. Never treats a stale assessment or
// a changed visible sentence as ready just because an old evaluation says so.
export function canExportFinal(resume:TailoredResume,assessmentStatus?:string) {
  if(resume.readiness!=='READY' || assessmentStatus!=='ASSESSED' || !resume.basis || !resume.claimLedger)return false;
  const texts=[...(resume.professionalSummary?[{id:'summary',text:resume.professionalSummary}]:[]),...[...resume.experience,...resume.projects].flatMap(b=>b.bullets.filter(c=>c.enabled!==false).map(c=>({id:c.id,text:c.text})))];
  if(![...resume.experience,...resume.projects].some(b=>b.bullets.some(c=>c.enabled!==false)))return false;
  const valid=(c:NonNullable<TailoredResume['claimLedger']>[number])=>c.validationStatus==='verified' && c.validatedTextHash===c.textHash && c.supportingEvidenceIds.length>0 && c.artifactId===resume.id;
  return texts.every(f=>resume.claimLedger!.some(c=>c.claimId===f.id && c.text===f.text && valid(c))) &&
    resume.skills.every(g=>g.skills.every(text=>resume.claimLedger!.some(c=>c.claimType==='skill' && c.text===text && valid(c)))) &&
    resume.projects.every(p=>p.technologies.every(text=>resume.claimLedger!.some(c=>c.claimType==='project-technology' && c.scopeId===p.id && c.text===text && valid(c))));
}
export const canonicalResume = (value:any):string => JSON.stringify((function stable(v:any):any {return Array.isArray(v)?v.map(stable):v && typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,stable(v[k])])):v;})(value));
export function invalidateEditedResume(previous:TailoredResume,resume:TailoredResume):TailoredResume {
  const texts=new Map([['summary',resume.professionalSummary],...[...resume.experience,...resume.projects].flatMap(b=>b.bullets.map(c=>[c.id,c.text] as [string,string]))]);
  let changed=false;
  if(canonicalResume({header:resume.header,education:resume.education,skills:resume.skills,experience:resume.experience.map(({bullets,...b})=>b),projects:resume.projects.map(({bullets,...b})=>b),jobId:resume.jobId,roleFamily:resume.roleFamily})!==canonicalResume({header:previous.header,education:previous.education,skills:previous.skills,experience:previous.experience.map(({bullets,...b})=>b),projects:previous.projects.map(({bullets,...b})=>b),jobId:previous.jobId,roleFamily:previous.roleFamily}))changed=true;
  const ledger=(previous.claimLedger || []).map(c=>{
    const text=texts.get(c.claimId);
    if(text!==undefined && text!==c.text){changed=true;return {...c,text,textHash:'pending-server-hash',sourceKind:'manual' as const,generationMode:'manual' as const,validationStatus:'manual-edit-unvalidated' as const,validatedTextHash:undefined,validatedAt:undefined,issues:['Edited text requires validation']};}
    return c;
  });
  const updated={...resume,claimLedger:ledger,readiness:changed?'NEEDS_VALIDATION' as const:previous.readiness,readinessIssues:changed?['Manual edits await validation']:previous.readinessIssues};
  for(const block of [...updated.experience,...updated.projects])for(const bullet of block.bullets){const claim=ledger.find(c=>c.claimId===bullet.id);if(claim){bullet.provenanceStatus=claim.validationStatus==='unsupported'?'requires-review':claim.validationStatus;bullet.isManualEdit=claim.generationMode==='manual';}}
  return updated;
}
