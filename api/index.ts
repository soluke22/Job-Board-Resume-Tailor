import app from '../server';
import type { Request, Response } from 'express';
import { withRequestDatabase } from '../server/db/client';

// This seam exercises the actual adapter under synthetic providers, not a second
// routing authority. Vercel must supply the original request URL (live gate).
export function createHandler(application: typeof app = app, database = withRequestDatabase,
  timeoutMs = 290_000) {
  return async (req: Request, res: Response) => {
    await database(() => new Promise<void>((resolve, reject) => {
      let settled = false;
      const complete = (error?: unknown) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        res.off('finish', finished); res.off('close', finished);
        res.off('error', failed);
        req.off('aborted', aborted);
        error ? reject(error) : resolve();
      };
      const finished = () => complete();
      const failed = () => { complete(); res.destroy(); };
      const aborted = () => { complete(); res.destroy(); };
      // Bound waiting even when a route never produces a response. No provider
      // error objects or private request data are returned/logged.
      const timer = setTimeout(() => {
        complete();
        // Terminate transport rather than race a JSON response against an
        // uncancelled Express 4 async route's eventual response.
        res.destroy();
      }, timeoutMs);
      timer.unref();
      res.once('finish', finished); res.once('close', finished);
      res.once('error', failed);
      req.once('aborted', aborted);
      if (req.aborted || res.destroyed || res.writableFinished) { complete(); return; }
      try { application(req, res); } catch (error) { complete(error); }
    }));
  };
}
export default createHandler();
