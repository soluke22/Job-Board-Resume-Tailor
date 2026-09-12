import app from '../server';
import type { Request, Response } from 'express';
import { withRequestDatabase } from '../server/db/client';

export default async function handler(req: Request, res: Response) {
  await withRequestDatabase(() => new Promise<void>((resolve, reject) => {
    res.once('finish', resolve); res.once('close', resolve);
    try { app(req, res); } catch (error) { reject(error); }
  }));
}
