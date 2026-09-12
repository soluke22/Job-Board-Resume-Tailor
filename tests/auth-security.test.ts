import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { betterAuth } from 'better-auth';
import { memoryAdapter } from 'better-auth/adapters/memory';
import { createOwnerGuard, authConfiguration, isOwnerIdentity } from '../server/auth';
import { installPrivateFiles, validateUpload } from '../server/privateFiles';

Object.assign(process.env, { OWNER_EMAIL: 'owner@example.invalid', DATABASE_URL: 'postgres://unused', BETTER_AUTH_SECRET: 'test-only-secret-at-least-thirty-two-characters', BETTER_AUTH_URL: 'http://localhost:3000', GOOGLE_CLIENT_ID: 'test', GOOGLE_CLIENT_SECRET: 'test' });
const identity = { id: 'owner', email: 'owner@example.invalid', emailVerified: true };
const session = { user: identity, session: { expiresAt: new Date(Date.now() + 60000) } };
async function serve(app: express.Express, run: (url: string) => Promise<void>) {
  const server = app.listen(0, '127.0.0.1'); await new Promise<void>(r => server.once('listening', r));
  try { await run(`http://127.0.0.1:${(server.address() as any).port}`); } finally { server.closeAllConnections(); await new Promise<void>(r => server.close(() => r())); }
}
test('owner authorization requires verified identity; missing configuration fails closed', async () => {
  assert.equal(isOwnerIdentity({ email: identity.email, emailVerified: false }), false);
  const owner = process.env.OWNER_EMAIL; delete process.env.OWNER_EMAIL;
  assert.equal(isOwnerIdentity(identity), false); assert.throws(authConfiguration);
  process.env.OWNER_EMAIL = owner;
});
test('anonymous/email-only, non-owner, unverified, expired and revoked requests denied; owner allowed', async () => {
  let current: typeof session | null = null;
  const app = express(); app.all('/private', createOwnerGuard(async () => current), (_req, res) => res.json({ owner: res.locals.ownerId }));
  await serve(app, async url => {
    assert.equal((await fetch(url + '/private', { headers: { Authorization: `Bearer ${identity.email}` } })).status, 401);
    current = { ...session, user: { ...identity, email: 'other@example.invalid' } }; assert.equal((await fetch(url + '/private')).status, 403);
    current = { ...session, user: { ...identity, emailVerified: false } }; assert.equal((await fetch(url + '/private')).status, 403);
    current = { ...session, session: { expiresAt: new Date(0) } }; assert.equal((await fetch(url + '/private')).status, 401);
    current = session; const valid = await fetch(url + '/private'); assert.equal(valid.status, 200); assert.match(valid.headers.get('cache-control')!, /no-store/);
    assert.equal((await fetch(url + '/private', { method: 'POST', headers: { Origin: 'https://evil.invalid' } })).status, 403);
    assert.equal((await fetch(url + '/private', { method: 'POST', headers: { Origin: 'http://localhost:3000' } })).status, 200);
    current = null; assert.equal((await fetch(url + '/private')).status, 401);
  });
});
test('private files enforce ownership and proxy data without permanent URLs', async () => {
  let current: typeof session | null = null;
  const records: any[] = []; let reads = 0;
  const app = express(); installPrivateFiles(app, {
    guard: createOwnerGuard(async () => current),
    repository: { list: async owner => records.filter(r => r.ownerId === owner), find: async (owner,id) => records.find(r => r.ownerId === owner && r.id === id), insert: async record => { records.push(record); return record as any; }, remove: async () => {}, upload: async (record, write) => { await write(); records.push(record); return record as any; }, reconcile: async () => 0 },
    blobs: { put: async (path: string) => ({ pathname: path }), get: async () => { reads++; return { statusCode: 200, stream: new ReadableStream({ start(c) { c.enqueue(new TextEncoder().encode('private')); c.close(); } }) }; }, del: async () => {} } as any,
  });
  await serve(app, async url => {
    assert.equal((await fetch(url + '/api/private/files/known')).status, 401); assert.equal(reads, 0);
    current = session;
    records.push({ id: 'other', ownerId: 'someone-else', blobPath: 'hidden' });
    assert.equal((await fetch(url + '/api/private/files/other')).status, 404); assert.equal(reads, 0);
    const upload = await fetch(url + '/api/private/files', { method:'POST', headers:{ 'Content-Type':'application/json', Origin:'http://localhost:3000' }, body:JSON.stringify({ originalFilename:'resume.txt', mimeType:'text/plain', purpose:'master-resume', sourceType:'user-upload', contentBase64:Buffer.from('private').toString('base64') }) });
    assert.equal(upload.status,201); const meta = await upload.json(); assert.equal(meta.blobPath,undefined); assert.equal(meta.ownerId,undefined);
    const download = await fetch(url + '/api/private/files/' + meta.id); assert.equal(download.status,200); assert.equal(await download.text(),'private'); assert.match(download.headers.get('content-disposition')!,/attachment/);
    current = null; assert.equal((await fetch(url + '/api/private/files/' + meta.id)).status,401);
  });
});
test('uploads reject spoofed PDF, binary text, invalid JSON, unsafe filename and oversize', () => {
  const base = { originalFilename:'file.txt', mimeType:'text/plain', purpose:'evidence', sourceType:'user-upload', contentBase64:Buffer.from('text').toString('base64') };
  assert.throws(() => validateUpload({...base,mimeType:'application/pdf'}));
  assert.throws(() => validateUpload({...base,mimeType:'application/json'}));
  assert.throws(() => validateUpload({...base,originalFilename:'../file'}));
  assert.throws(() => validateUpload({...base,contentBase64:Buffer.from([0]).toString('base64')}));
  assert.throws(() => validateUpload({...base,contentBase64:Buffer.alloc(2*1024*1024+1).toString('base64')}));
});

test('Better Auth persisted sessions are revoked on sign-out (isolated memory database adapter)', async () => {
  // Password sign-up is enabled ONLY in this isolated library fixture to issue a session
  // without a real Google account. Production disables it and only permits owner OAuth.
  const auth = betterAuth({ baseURL:'http://localhost:3000', secret:process.env.BETTER_AUTH_SECRET,
    database:memoryAdapter({ user:[], session:[], account:[], verification:[] }),
    emailAndPassword:{enabled:true}, session:{cookieCache:{enabled:false}},
  });
  const response = await auth.api.signUpEmail({ body:{ email:'fixture@example.invalid', password:'fixture-only-password', name:'Synthetic Test' }, asResponse:true });
  assert.equal(response.status,200);
  const cookie = response.headers.getSetCookie().map(value => value.split(';')[0]).join('; ');
  const headers = new Headers({ cookie, origin:'http://localhost:3000' });
  assert.ok(await auth.api.getSession({ headers }));
  await auth.api.signOut({ headers });
  assert.equal(await auth.api.getSession({ headers }),null);
});

