import app from '../server';
import express from 'express';
import path from 'node:path';

if (process.env.NODE_ENV !== 'production') {
  const { createServer } = await import('vite');
  const vite = await createServer({ server: { middlewareMode: true }, appType: 'spa' });
  app.use(vite.middlewares);
} else {
  app.use(express.static(path.resolve('dist/client')));
  app.get('*', (_req, res) => res.sendFile(path.resolve('dist/client/index.html')));
}
app.listen(Number(process.env.PORT || 3000), '127.0.0.1', () => console.log('CareerOS server ready'));
