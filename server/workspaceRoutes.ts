import { Router } from 'express';
import { requireWorkspaceOwner } from './auth';
import { workspaceRepository, WorkspaceConflict, WorkspaceValidationError } from './workspaceRepository';

export function createWorkspaceRouter(repository = workspaceRepository) {
  const router = Router();
  router.use(requireWorkspaceOwner);
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
  router.get('/data', respond((_req, owner) => repository.read(owner)));
  router.post('/data', respond((req, owner) => repository.save(owner, req.body?.data, req.body?.revision)));
  router.post('/import', respond((req, owner) => repository.import(owner, req.body?.data, req.body?.revision)));
  router.get('/export', respond((_req, owner) => repository.read(owner)));
  router.get('/audit-log', async (_req, res) => {
    try { res.json({ logs: (await repository.read(res.locals.ownerId)).auditLog }); }
    catch { res.status(503).json({ error: 'Private storage unavailable' }); }
  });
  return router;
}
