import app from '../server';
import express from 'express';
import path from 'node:path';
import { closeDb } from './db/client';

if (process.env.NODE_ENV !== 'production') {
  const { createServer } = await import('vite');
  const vite = await createServer({ server: { middlewareMode: true }, appType: 'spa' });
  app.use(vite.middlewares);
} else {
  app.use(express.static(path.resolve('dist/client')));
  app.get('*', (_req, res) => res.sendFile(path.resolve('dist/client/index.html')));
}
const server = app.listen(Number(process.env.PORT || 3000), '127.0.0.1', () => console.log('CareerOS server ready'));
let shuttingDown = false;
const shutdown = () => {
  if (shuttingDown) return;
  shuttingDown = true;
  server.close(() => { void closeDb().catch(() => { console.error('Database shutdown failed'); process.exitCode = 1; }); });
};
process.once('SIGTERM', shutdown); process.once('SIGINT', shutdown);
