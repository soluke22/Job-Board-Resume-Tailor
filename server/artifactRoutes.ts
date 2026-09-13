import { z } from 'zod';
import type { Request, Response } from 'express';
import { workspaceRepository, WorkspaceConflict } from './workspaceRepository.js';
import { ArtifactError, generateProof, generateMessage, generateAnswers, questionSchema } from './artifactProvenance.js';
import { ResumeError } from './resumeProvenance.js';
import type { StructuredModel } from './assessment.js';

const requestSchema=z.object({jobId:z.string().min(1).max(200),questions:z.array(z.union([z.string().min(1).max(2000),questionSchema])).min(1).max(20).optional(),
  contactName:z.string().max(100).optional(),relationship:z.string().max(200).optional(),overrideReason:z.string().min(1).max(1000).optional()}).strict();
export function createArtifactHandler(operation:'proof'|'outreach'|'answers'|'referral',modelForRequest:(req:Request)=>StructuredModel,repository=workspaceRepository) {
  return async(req:Request,res:Response):Promise<void>=>{
    res.set('Cache-Control','private, no-store');
    const parsed=requestSchema.safeParse(req.body);
    if(!parsed.success || operation==='answers' && !parsed.data.questions || operation!=='answers' && parsed.data.questions || operation!=='referral' && (parsed.data.contactName!==undefined || parsed.data.relationship!==undefined) || ['proof','answers'].includes(operation) && parsed.data.overrideReason!==undefined) {
      res.status(400).json({error:'Only persisted jobId and artifact-specific explicit user context are accepted'});return;
    }
    try {
      const w=await repository.read(res.locals.ownerId),job=w.jobs.find((j:any)=>j.id===parsed.data.jobId);
      if(!job){res.status(404).json({error:'Job not found in owner workspace'});return;}
      const model=modelForRequest(req);
      const artifact=operation==='proof'?await generateProof(w as any,job,model):operation==='answers'?await generateAnswers(w as any,job,parsed.data.questions!.map(q=>typeof q==='string'?{question:q}:q),model):
        await generateMessage(w as any,job,model,operation==='referral'?{contactName:parsed.data.contactName || '',relationship:parsed.data.relationship || ''}:undefined,parsed.data.overrideReason);
      const key=operation==='proof'?'proofPack':operation==='answers'?'applicationAnswers':operation==='outreach'?'recruiterOutreach':'referralContact';
      const updated={...job,[key]:artifact};
      const data=await repository.saveArtifact(res.locals.ownerId,{jobs:w.jobs.map((j:any)=>j.id===job.id?updated:j)},w.revision,job.id,key);
      res.json({data,revision:data.revision,job:data.jobs.find((j:any)=>j.id===job.id)});
    }catch(error){
      if(error instanceof WorkspaceConflict){res.status(409).json({error:'Workspace changed; reload before retrying artifact generation'});return;}
      res.status(422).json({error:error instanceof ArtifactError || error instanceof ResumeError?error.message:'Artifact failed structured validation or service unavailable; previous artifact preserved'});
    }
  };
}
