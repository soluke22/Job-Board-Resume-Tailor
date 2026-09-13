import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import express from 'express';
import handler from '../api/index';

const privateConfiguration = ['DATABASE_URL', 'BLOB_READ_WRITE_TOKEN', 'OWNER_EMAIL', 'BETTER_AUTH_SECRET', 'BETTER_AUTH_URL', 'GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET'];

test('production Node shell and source Node serverless adapter work without private configuration', { timeout: 20_000 }, async () => {
  const reservation = createServer(); reservation.listen(0, '127.0.0.1');
  await new Promise<void>(resolve => reservation.once('listening', resolve));
  const port = (reservation.address() as any).port;
  await new Promise<void>(resolve => reservation.close(() => resolve()));
  const env = { ...process.env, NODE_ENV: 'production', PORT: String(port) };
  for (const name of privateConfiguration) { delete env[name]; delete process.env[name]; }
  const child = spawn(process.execPath, ['dist/server.mjs'], { env, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
  try {
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Production startup timeout')), 10_000);
      child.once('error', error => { clearTimeout(timer); reject(error); });
      child.once('exit', () => { clearTimeout(timer); reject(new Error('Production server exited before smoke')); });
      child.stdout!.on('data', chunk => { if (String(chunk).includes('CareerOS server ready')) { clearTimeout(timer); resolve(); } });
    });
    const url = `http://127.0.0.1:${port}`;
    assert.equal((await fetch(`${url}/api/health`)).status, 200);
    const shell = await fetch(url); assert.equal(shell.status, 200);
    const html = await shell.text(); const asset = html.match(/src="([^"]+\/assets\/[^\"]+\.js)"/)?.[1] ?? html.match(/src="(\/assets\/[^\"]+\.js)"/)?.[1];
    assert(asset, 'production shell references built client'); assert.equal((await fetch(url + asset)).status, 200);
    for (const path of ['/api/workspace/data', '/api/private/files']) {
      const response = await fetch(url + path); assert.equal(response.status, 503);
      assert.match(response.headers.get('cache-control')!, /private.*no-store/);
      assert.deepEqual(await response.json(), { error: 'Private authentication is unavailable' });
    }
  } finally {
    if (child.exitCode === null) { const exited = new Promise<void>(resolve => child.once('exit', () => resolve())); child.kill(); await exited; }
  }
  const app = express(); app.use((req, res, next) => { void handler(req, res).catch(next); });
  const server = app.listen(0, '127.0.0.1'); await new Promise<void>(resolve => server.once('listening', resolve));
  try {
    const url = `http://127.0.0.1:${(server.address() as any).port}`;
    assert.equal((await fetch(`${url}/api/health`)).status, 200);
    assert.equal((await fetch(`${url}/api/private/files`)).status, 503);
  } finally { server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())); }
});
