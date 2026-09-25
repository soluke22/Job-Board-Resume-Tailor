import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { EventEmitter } from 'node:events';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHandler } from '../api/index';
import { createDatabaseBoundary, getDb, withRequestDatabase } from '../server/db/client';
import { MAX_PRIVATE_FILE_BYTES, validateUpload, installPrivateFiles } from '../server/privateFiles';
import defaultHandler from '../api/index';
import { createAuthOptions } from '../server/auth';

function boundary() {
  let ended = 0;
  const instance = createDatabaseBoundary(() => 'postgres://synthetic.invalid/test', () => ({ on() {}, async end() { ended++; } }) as any);
  return { instance, ended: () => ended };
}
function response() {
  const res = new EventEmitter() as any;
  res.destroy = () => { res.destroyed = true; res.emit('close'); };
  res.status = (status: number) => { res.statusCode = status; return res; };
  res.json = (body: unknown) => { res.body = body; res.emit('finish'); };
  return res;
}
test('adapter closes exactly once on finish, close, abort, thrown error and bounded timeout', async () => {
  for (const event of ['finish', 'close', 'error', 'abort', 'throw', 'timeout']) {
    const b = boundary(), req = new EventEmitter() as any, res = response();
    const application = ((_req: any, _res: any) => {
      getDb();
      if (event === 'throw') throw Error('synthetic');
      if (event === 'abort') req.emit('aborted');
      else if (event !== 'timeout') { res.emit(event, event === 'error' ? Error('synthetic stream error') : undefined); res.emit('close'); }
    }) as any;
    const keepAlive = setTimeout(() => {}, 1000);
    try {
      const run = createHandler(application, fn => withRequestDatabase(fn, b.instance), 10)(req, res);
      if (event === 'throw') await assert.rejects(run, /synthetic/); else await run;
      assert.equal(b.ended(), 1);
      assert.equal(res.listenerCount('finish'), 0); assert.equal(res.listenerCount('close'), 0);
      assert.equal(req.listenerCount('aborted'), 0);
      assert.throws(() => b.instance.getDb(), /closed/);
      if (event === 'timeout') { assert.equal(res.destroyed, true); assert.equal(res.body, undefined); }
    } finally { clearTimeout(keepAlive); }
  }
});
test('adapter interleaves request-local DB, owner/data/errors and rejects late continuation', async () => {
  const a = boundary(), b = boundary();
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  const seen: any[] = [], late: Promise<void>[] = [];
  const application = ((req: any, res: any) => {
    const db = getDb(); res.locals = { ownerId: req.owner };
    late.push(gate.then(() => {
      seen.push({ owner: res.locals.ownerId, data: req.data, db: getDb() });
      if (req.owner === 'b') res.json({ error: 'synthetic b failure' }); else res.json({ artifact: req.data });
    }));
    assert.equal(getDb(), db);
  }) as any;
  const req = (owner: string) => Object.assign(new EventEmitter(), { owner, data: `synthetic-${owner}` }) as any;
  const ra = response(), rb = response();
  const runs = [createHandler(application, fn => withRequestDatabase(fn, a.instance))(req('a'), ra), createHandler(application, fn => withRequestDatabase(fn, b.instance))(req('b'), rb)];
  release(); await Promise.all(runs); await Promise.all(late);
  assert.notEqual(seen[0].db, seen[1].db);
  assert.deepEqual(seen.map(x => [x.owner, x.data]), [['a', 'synthetic-a'], ['b', 'synthetic-b']]);
  assert.deepEqual(ra.body, { artifact: 'synthetic-a' }); assert.deepEqual(rb.body, { error: 'synthetic b failure' });
  assert.equal(a.ended(), 1); assert.equal(b.ended(), 1);
  const c = boundary(); let resume!: () => void; let continuation!: Promise<void>;
  await createHandler(((_req: any, res: any) => {
    getDb(); continuation = new Promise<void>(resolve => { resume = resolve; }).then(() => { assert.throws(getDb, /closed/); });
    res.emit('close');
  }) as any, fn => withRequestDatabase(fn, c.instance))(req('c'), response());
  resume(); await continuation; assert.equal(c.ended(), 1);
});

test('a stuck pool close is bounded, never reopened and never ended twice', async () => {
  let ends = 0;
  const b = createDatabaseBoundary(() => 'postgres://synthetic.invalid/test', () => ({ on() {}, end() { ends++; return new Promise(() => {}); } }) as any, 10);
  b.getDb(); const keepAlive = setTimeout(() => {}, 1000);
  try { await assert.rejects(b.close(), /cleanup timed out/); await b.close(); assert.equal(ends, 1); assert.throws(b.getDb, /closed/); }
  finally { clearTimeout(keepAlive); }
});

test('installed Blob 2.8 resolves OIDC/store without static token and retains local fallback', async () => {
  const directory = 'node_modules/@vercel/blob/dist';
  const chunk = readdirSync(directory).find(name => name.endsWith('.js') && readFileSync(`${directory}/${name}`, 'utf8').includes('async function resolveBlobAuth('));
  assert(chunk);
  // Installed SDK resolver only: no provider calls, network or resource writes.
  const { resolveBlobAuth } = await import(pathToFileURL(resolve(directory, chunk)).href);
  const keys = ['VERCEL_OIDC_TOKEN','BLOB_STORE_ID','BLOB_READ_WRITE_TOKEN'];
  const saved = keys.map(key => process.env[key]);
  try {
    const syntheticJwt = [Buffer.from('{}').toString('base64url'), Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url'), 'synthetic'].join('.');
    Object.assign(process.env, { VERCEL_OIDC_TOKEN: syntheticJwt, BLOB_STORE_ID: 'store_synthetic', BLOB_READ_WRITE_TOKEN: 'vercel_blob_rw_synthetic_static' });
    const oidc = await resolveBlobAuth({}); assert.equal(oidc.kind, 'oidc'); assert.equal(oidc.storeId, 'synthetic');
    delete process.env.BLOB_READ_WRITE_TOKEN; assert.equal((await resolveBlobAuth({})).kind, 'oidc');
    delete process.env.VERCEL_OIDC_TOKEN; delete process.env.BLOB_STORE_ID;
    process.env.BLOB_READ_WRITE_TOKEN = 'vercel_blob_rw_synthetic_static';
    assert.equal((await resolveBlobAuth({})).kind, 'readWrite');
    delete process.env.BLOB_READ_WRITE_TOKEN; await assert.rejects(resolveBlobAuth({}), /No blob credentials/);
  } finally { keys.forEach((key, i) => { if (saved[i] === undefined) delete process.env[key]; else process.env[key] = saved[i]; }); }
});

test('production auth remains canonical, host-only and disables raw library provider logging', () => {
  const config = { OWNER_EMAIL: 'synthetic@example.invalid', DATABASE_URL: 'postgres://synthetic.invalid/test', BETTER_AUTH_SECRET: 'synthetic-secret-long-enough-for-authentication', BETTER_AUTH_URL: 'https://staging.example.invalid', GOOGLE_CLIENT_ID: 'synthetic', GOOGLE_CLIENT_SECRET: 'synthetic', NODE_ENV: 'production' };
  const keys = Object.keys(config), saved = keys.map(key => process.env[key]);
  try {
    Object.assign(process.env, config);
    const options = createAuthOptions({} as any, async () => undefined);
    assert.equal(options.baseURL, config.BETTER_AUTH_URL); assert.deepEqual(options.trustedOrigins, [config.BETTER_AUTH_URL]);
    assert.deepEqual(options.logger, { disabled: true });
    assert.equal(options.advanced?.useSecureCookies, true); assert.equal(options.advanced?.defaultCookieAttributes?.httpOnly, true);
    assert.equal(options.advanced?.defaultCookieAttributes?.sameSite, 'lax'); assert(!options.advanced?.crossSubDomainCookies?.enabled);
  } finally { keys.forEach((key, i) => { if (saved[i] === undefined) delete process.env[key]; else process.env[key] = saved[i]; }); }
});

test('original nested methods/paths reach Express unchanged; adapter no-config errors are JSON', async () => {
  const application = express();
  application.all('/api/*', (req, res) => res.json({ method: req.method, url: req.originalUrl }));
  const outer = express(); outer.use((req, res, next) => { void createHandler(application)(req, res).catch(next); });
  const server = outer.listen(0, '127.0.0.1'); await new Promise<void>(r => server.once('listening', r));
  const url = `http://127.0.0.1:${(server.address() as any).port}`;
  try {
    for (const [method, path] of [['GET','health'],['GET','auth/session'],['POST','auth/sign-in/social'],['GET','workspace/data'],['GET','private/files'],['POST','private/files/reconcile'],['DELETE','private/files/synthetic'],['POST','analyze-job'],['POST','generate-resume'],['POST','generate-proof-pack'],['POST','workspace/application-transition']]) {
      const route = `/api/${path}?synthetic=1`;
      assert.deepEqual(await (await fetch(url + route, { method })).json(), { method, url: route });
    }
  } finally { server.closeAllConnections(); await new Promise<void>(r => server.close(() => r())); }
  // This proves the adapter, not the external Vercel rewrite implementation.
});

test('encoded 2 MiB upload fits app and provider body budgets', () => {
  const input = { originalFilename: 'synthetic.txt', mimeType: 'text/plain', purpose: 'evidence', sourceType: 'user-upload', contentBase64: Buffer.alloc(MAX_PRIVATE_FILE_BYTES, 65).toString('base64') };
  assert.equal(validateUpload(input).content.length, MAX_PRIVATE_FILE_BYTES);
  assert(Buffer.byteLength(JSON.stringify(input)) < 3 * 1024 * 1024);
  assert(3 * 1024 * 1024 < 4.5 * 1000 * 1000);
});

test('real adapter no-config startup preserves health, nested private/auth errors and headers', async () => {
  const keys = ['DATABASE_URL','OWNER_EMAIL','BETTER_AUTH_SECRET','BETTER_AUTH_URL','GOOGLE_CLIENT_ID','GOOGLE_CLIENT_SECRET','BLOB_STORE_ID','BLOB_READ_WRITE_TOKEN','VERCEL_OIDC_TOKEN','GEMINI_API_KEY'];
  const saved = keys.map(key => process.env[key]); keys.forEach(key => { delete process.env[key]; });
  const outer = express(); outer.disable('x-powered-by'); outer.use((req, res, next) => { void defaultHandler(req, res).catch(next); });
  const server = outer.listen(0, '127.0.0.1'); await new Promise<void>(r => server.once('listening', r));
  const url = `http://127.0.0.1:${(server.address() as any).port}`;
  try {
    assert.deepEqual(await (await fetch(url + '/api/health')).json(), { status: 'ok' });
    for (const path of ['/api/auth/session','/api/workspace/data','/api/private/files','/api/unknown']) {
      const res = await fetch(url + path); assert.equal(res.status, 503);
      assert.match(res.headers.get('content-type')!, /json/); assert.match(res.headers.get('cache-control')!, /private.*no-store/);
      assert.equal(res.headers.get('x-content-type-options'), 'nosniff'); assert.equal(res.headers.get('x-frame-options'), 'DENY');
      assert.equal(res.headers.get('referrer-policy'), 'no-referrer'); assert(!res.headers.has('x-powered-by'));
      assert.deepEqual(await res.json(), { error: 'Private authentication is unavailable', code: 'AUTH_UNAVAILABLE' });
    }
    const malformed = await fetch(url + '/api/analyze-job', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{bad' });
    assert.equal(malformed.status, 400); assert.deepEqual(await malformed.json(), { error: 'Invalid request' });
    const oversized = await fetch(url + '/api/analyze-job', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ synthetic: 'a'.repeat(3 * 1024 * 1024) }) });
    assert.equal(oversized.status, 413); assert.deepEqual(await oversized.json(), { error: 'Invalid request' });
  } finally { server.closeAllConnections(); await new Promise<void>(r => server.close(() => r())); keys.forEach((key, i) => { if (saved[i] === undefined) delete process.env[key]; else process.env[key] = saved[i]; }); }
});

test('private 2 MiB streaming, provider failure and client disconnect close adapter boundaries', async () => {
  let mode = 'normal', cancelled = 0;
  const boundaries: ReturnType<typeof boundary>[] = [];
  const application = express();
  installPrivateFiles(application, {
    budget: async () => {},
    guard: (_req, res, next) => { getDb(); res.locals.ownerId = 'synthetic-owner'; next(); },
    repository: { find: async () => ({ id: 'synthetic', ownerId: 'synthetic-owner', blobPath: 'private/synthetic', originalFilename: 'synthetic.txt', mimeType: 'text/plain', size: MAX_PRIVATE_FILE_BYTES }) } as any,
    blobs: { get: async (_path: string, options: any) => {
      assert.equal(options.access, 'private'); assert.equal(options.useCache, false);
      const current = mode;
      return { statusCode: 200, stream: new ReadableStream({
        start(controller) { controller.enqueue(new Uint8Array(current === 'normal' ? MAX_PRIVATE_FILE_BYTES : 1024)); if (current === 'normal') controller.close(); else if (current === 'error') setTimeout(() => controller.error(Error('synthetic provider failure')), 10); },
        cancel() { cancelled++; },
      }) };
    } } as any,
  });
  const outer = express(); outer.use((req, res, next) => {
    const b = boundary(); boundaries.push(b); void createHandler(application, fn => withRequestDatabase(fn, b.instance))(req, res).catch(next);
  });
  const server = outer.listen(0, '127.0.0.1'); await new Promise<void>(r => server.once('listening', r));
  const url = `http://127.0.0.1:${(server.address() as any).port}/api/private/files/synthetic`;
  try {
    const normal = await fetch(url); assert.equal((await normal.arrayBuffer()).byteLength, MAX_PRIVATE_FILE_BYTES);
    assert.match(normal.headers.get('content-disposition')!, /attachment/);
    mode = 'error'; const failed = await fetch(url); await assert.rejects(failed.arrayBuffer());
    mode = 'disconnect'; const abort = new AbortController(); const disconnected = await fetch(url, { signal: abort.signal });
    await disconnected.body!.getReader().read(); abort.abort();
    // Yield until socket close/stream cancellation has propagated, bounded.
    for (let i = 0; i < 50 && boundaries.some(b => b.ended() !== 1); i++) await new Promise(r => setTimeout(r, 10));
    assert(boundaries.every(b => b.ended() === 1)); assert(cancelled >= 1);
  } finally { server.closeAllConnections(); await new Promise<void>(r => server.close(() => r())); }
});

test('deployment pins validated package manager, Node major and static build output', () => {
  const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
  const config = JSON.parse(readFileSync('vercel.json', 'utf8'));
  assert.equal(pkg.engines.node, '24.x'); assert.equal(Number(process.versions.node.split('.')[0]), 24);
  assert(existsSync('package-lock.json')); assert(!existsSync('bun.lock')); assert(!existsSync('bun.lockb'));
  assert.equal(config.framework, 'vite'); assert.equal(config.outputDirectory, 'dist/client');
  assert.equal(config.installCommand, 'npm ci');
  assert.equal(config.functions['api/index.ts'].maxDuration, 300);
  const spa = new RegExp(`^${config.rewrites[1].source}$`);
  for (const path of ['/', '/dashboard', '/other/client/route']) assert(spa.test(path));
  for (const path of ['/api', '/api/health', '/api/private/files/reconcile', '/assets/synthetic.js']) assert(!spa.test(path));
});
