import { computeOutcomeAnalytics } from '../src/utils/outcomeAnalytics';
import { Router, type RequestHandler } from 'express';
import { requireWorkspaceOwner } from './auth';
import { workspaceRepository, WorkspaceConflict, WorkspaceValidationError } from './workspaceRepository';

export function createWorkspaceRouter(repository: Pick<typeof workspaceRepository, 'read' | 'save' | 'import'> & Partial<Pick<typeof workspaceRepository, 'transition'>> = workspaceRepository, guard: RequestHandler = requireWorkspaceOwner) {
  const router = Router();
  router.use(guard);
  router.use((_req, res, next) => { res.set('Cache-Control', 'private, no-store'); next(); });
  const respond = (operation: (req: any, owner: string) => Promise<any>) => async (req: any, res: any) => {
    try {
      const { revision, ...data } = await operation(req, res.locals.ownerId);
      res.json({ data, revision });
    } catch (error) {
      const status = error instanceof WorkspaceConflict ? 409 : error instanceof WorkspaceValidationError ? 400 : 503;
      res.status(status).json({ error: status === 503 ? 'Private storage unavailable' : (error as Error).message });
    }
  };
  router.post('/application-transition', respond((req, owner) => {
    if (!repository.transition) throw new WorkspaceValidationError('Application transitions unavailable');
    return repository.transition(owner, req.body);
  }));
  router.get('/analytics', async (_req, res) => {
    try { res.json(computeOutcomeAnalytics((await repository.read(res.locals.ownerId)).jobs)); }
    catch { res.status(503).json({error:'Private storage unavailable'}); }
  });
  router.get('/data', respond((_req, owner) => repository.read(owner)));
  router.post('/data', respond(async (req, owner) => {
    const current=await repository.read(owner);
    for(const job of req.body?.data?.jobs || []) if(!current.jobs.some((j:any)=>j.id===job.id) &&
      (job.statusHistory?.length || job.applicationSnapshot || job.appliedDate || !['DISCOVERED','SHORTLISTED','TAILORED'].includes(job.applicationStatus)))
      throw new WorkspaceValidationError('New application history requires explicit owner import or a server transition');
    return repository.save(owner, req.body?.data, req.body?.revision);
  }));
  router.post('/import', respond((req, owner) => repository.import(owner, req.body?.data, req.body?.revision)));
  router.get('/export', respond((_req, owner) => repository.read(owner)));
  router.get('/audit-log', async (_req, res) => {
    try { res.json({ logs: (await repository.read(res.locals.ownerId)).auditLog }); }
    catch { res.status(503).json({ error: 'Private storage unavailable' }); }
  });
  return router;
}
