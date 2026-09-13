import type { Request, Response } from 'express';
import { z } from 'zod';
import { assessJob, AssessmentError, type StructuredModel } from './assessment.js';
import { workspaceRepository, WorkspaceConflict } from './workspaceRepository.js';
import type { JobRecord } from '../src/types/index.js';

const requestSchema=z.object({jobId:z.string().min(1).max(200)}).strict();
export function createAssessmentHandler(modelForRequest:(req:Request)=>StructuredModel, repository=workspaceRepository) {
  return async (req:Request,res:Response):Promise<void>=>{
    res.set('Cache-Control','private, no-store');
    const request=requestSchema.safeParse(req.body);
    if(!request.success){res.status(400).json({error:'Only a persisted jobId is accepted'});return;}
    try {
      const workspace=await repository.read(res.locals.ownerId);
      const job=workspace.jobs.find((j:JobRecord)=>j.id===request.data.jobId);
      if(!job){res.status(404).json({error:'Job not found in owner workspace'});return;}
      const result=await assessJob(job,workspace.evidence,workspace.searchProfile,modelForRequest(req),workspace.profile);
      const updated={...job,status:'Fit Checked',company:result.parsed.company || job.company,title:result.parsed.roleTitle || job.title,parsed:result.parsed,fit:result.fit,evidenceMatches:result.matches,requirements:result.requirements,assessmentMetadata:result.metadata,assessmentFacts:result.facts || job.assessmentFacts,assessmentStatus:'ASSESSED',qualificationFit:result.fit.qualificationFit,evidenceCoverage:result.fit.evidenceCoverage,applicationPriority:result.fit.applicationPriority,priorityReason:result.fit.verdictReason,primaryRoleFamily:result.parsed.roleFamily,roleModifiers:result.modifiers,hardRequirements:result.parsed.hardRequirements,preferredRequirements:result.parsed.preferredRequirements,technologies:result.parsed.primaryTechnologies,responsibilities:result.parsed.coreResponsibilities,hiringSignals:result.parsed.recruiterScreeningSignals,hardBlockers:result.fit.blockers,softGaps:result.fit.unsupportedRequirements};
      // Commit under the original revision: concurrent JD/evidence/profile writes cause 409.
      if(!result.reused) await repository.saveAssessment(res.locals.ownerId,{jobs:workspace.jobs.map((j:JobRecord)=>j.id===job.id?updated:j)},workspace.revision,job.id);
      res.json({...result,job:updated});
    } catch(error) {
      if(error instanceof WorkspaceConflict){res.status(409).json({error:'Workspace changed during assessment; reload and retry'});return;}
      res.status(422).json({error:error instanceof AssessmentError?error.message:'Assessment failed validation or service unavailable; no new assessment produced'});
    }
  };
}
