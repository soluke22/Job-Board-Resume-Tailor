import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import express from 'express';
import { betterAuth } from 'better-auth';
import { memoryAdapter } from 'better-auth/adapters/memory';
import { fromNodeHeaders } from 'better-auth/node';
import { authConfiguration, createAuthOptions, createOwnerGuard, installAuth } from '../server/auth';
import { createWorkspaceRouter } from '../server/workspaceRoutes';

const config = { OWNER_EMAIL: 'owner@example.invalid', DATABASE_URL: 'postgres://unused', BETTER_AUTH_SECRET: 'synthetic-test-secret-with-at-least-32-characters', BETTER_AUTH_URL: 'http://localhost:3000', GOOGLE_CLIENT_ID: 'synthetic', GOOGLE_CLIENT_SECRET: 'synthetic', NODE_ENV: 'test' };
Object.assign(process.env, config);
async function serve(app: express.Express, run: (url: string) => Promise<void>) {
  const server = app.listen(0, '127.0.0.1'); await new Promise<void>(resolve => server.once('listening', resolve));
  try { await run(`http://127.0.0.1:${(server.address() as any).port}`); }
  finally { server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())); }
}
function fixture() {
  const records: Record<string, any[]> = { user: [], session: [], account: [], verification: [] };
  const options = createAuthOptions(memoryAdapter(records), async id => records.user.find(user => user.id === id));
  const auth = betterAuth(options);
  return { records, options, auth };
}
function cookie(token: string, name = 'better-auth.session_token') {
  return `${name}=${encodeURIComponent(token + '.' + createHmac('sha256', config.BETTER_AUTH_SECRET).update(token).digest('base64'))}`;
}

test('required auth configuration, canonical origin, production HTTPS and secret fail closed', () => {
  try {
    for (const name of Object.keys(config).filter(name => name !== 'NODE_ENV')) {
      delete process.env[name]; assert.throws(authConfiguration, name); Object.assign(process.env, config);
    }
    for (const url of ['https://example.invalid/path', 'https://user@example.invalid', 'https://example.invalid/?token=x', 'http://example.invalid', 'file:///']) {
      process.env.BETTER_AUTH_URL = url; assert.throws(authConfiguration, url);
    }
    Object.assign(process.env, config, { BETTER_AUTH_SECRET: 'short' }); assert.throws(authConfiguration);
    Object.assign(process.env, config, { NODE_ENV: 'production' }); assert.throws(authConfiguration);
    process.env.BETTER_AUTH_URL = 'https://preview.example.invalid'; assert.equal(authConfiguration().origin, 'https://preview.example.invalid');
  } finally { Object.assign(process.env, config); }
});

test('exact production options reject public signup, current non-owner Google profile, and session minting', async () => {
  const { auth, options, records } = fixture();
  const context = await auth.$context;
  assert.deepEqual(Object.keys(options.socialProviders!), ['google']);
  assert.equal(options.emailAndPassword?.enabled, false);
  assert.equal(options.account?.accountLinking?.enabled, false);
  assert.equal(options.session?.cookieCache?.enabled, false);
  assert.equal(options.session?.expiresIn, 86400);
  const map = (options.socialProviders!.google! as { mapProfileToUser: (profile: any) => unknown }).mapProfileToUser;
  assert.throws(() => map({ email: config.OWNER_EMAIL, email_verified: false } as any));
  assert.throws(() => map({ email: 'other@example.invalid', email_verified: true } as any));
  assert.deepEqual(map({ email: config.OWNER_EMAIL, email_verified: true } as any), {});
  for (const user of [{ email: 'other@example.invalid', emailVerified: true }, { email: config.OWNER_EMAIL, emailVerified: false }]) {
    await assert.rejects(context.internalAdapter.createUser({ ...user, name: 'Synthetic' }, undefined));
  }
  assert.equal(records.user.length, 0);
  // Simulate a legacy/non-owner database row: the actual session-create hook
  // must reject it independently of user creation and browser state.
  records.user.push({ id: 'legacy', email: 'other@example.invalid', emailVerified: true });
  await assert.rejects(context.internalAdapter.createSession('legacy'));
  assert.equal(records.session.length, 0);
  const signup = await auth.handler(new Request(config.BETTER_AUTH_URL + '/api/auth/sign-up/email', { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: config.BETTER_AUTH_URL }, body: JSON.stringify({ email: config.OWNER_EMAIL, password: 'synthetic-password', name: 'Synthetic' }) }));
  assert.notEqual(signup.status, 200);
  assert.equal(records.session.length, 0);
});

test('real signed cookies and production hooks: owner access, expiry, forged access, logout and outage', async () => {
  const { auth, records } = fixture();
  const context = await auth.$context;
  const user = await context.internalAdapter.createUser({ email: config.OWNER_EMAIL, emailVerified: true, name: 'Synthetic Owner' }, undefined);
  const session = await context.internalAdapter.createSession(user.id);
  assert.ok(session);
  const headers = { Cookie: cookie(session.token) };
  const app = express(); installAuth(app, () => auth);
  app.all('/private', createOwnerGuard(req => auth.api.getSession({ headers: fromNodeHeaders(req.headers), query: { disableCookieCache: true } })), (_req, res) => res.json({ owner: res.locals.ownerId }));
  await serve(app, async url => {
    for (const init of [{}, { headers: { Authorization: `Bearer ${config.OWNER_EMAIL}` } }, { headers: { Cookie: cookie('forged') } }]) {
      assert.equal((await fetch(url + '/private?token=' + config.OWNER_EMAIL, init)).status, 401);
    }
    const accepted = await fetch(url + '/private', { headers }); assert.equal(accepted.status, 200);
    assert.match(accepted.headers.get('cache-control')!, /private.*no-store/);
    const state = await fetch(url + '/api/auth/session', { headers }); assert.equal((await state.json()).authenticated, true);
    assert.match(state.headers.get('cache-control')!, /private.*no-store/);
    assert.equal((await fetch(url + '/private', { method: 'POST', headers: { ...headers, Origin: 'https://evil.invalid' } })).status, 403);
    assert.equal((await fetch(url + '/private', { method: 'POST', headers: { ...headers, Origin: config.BETTER_AUTH_URL } })).status, 200);
    assert.equal((await fetch(url + '/private', { method: 'POST', headers })).status, 403);
    const find = context.internalAdapter.findSession;
    context.internalAdapter.findSession = async () => { throw new Error('synthetic session database outage'); };
    assert.equal((await fetch(url + '/private', { headers })).status, 503);
    assert.equal((await fetch(url + '/api/auth/session', { headers })).status, 503);
    context.internalAdapter.findSession = find;
    // Better Auth's real adapter revocation path fails, rather than replacing
    // the signOut API itself. The production hook must surface this failure.
    const remove = context.internalAdapter.deleteSession;
    context.internalAdapter.deleteSession = async () => { throw new Error('synthetic database outage'); };
    const failed = await fetch(url + '/api/auth/sign-out', { method: 'POST', headers: { ...headers, Origin: config.BETTER_AUTH_URL, 'Content-Type': 'application/json' }, body: '{}' });
    assert.equal(failed.status, 503); assert.equal(records.session.length, 1);
    context.internalAdapter.deleteSession = remove;
    const signedOut = await fetch(url + '/api/auth/sign-out', { method: 'POST', headers: { ...headers, Origin: config.BETTER_AUTH_URL, 'Content-Type': 'application/json' }, body: '{}' });
    assert.equal(signedOut.status, 200); assert.equal(records.session.length, 0);
    assert.equal((await fetch(url + '/private', { headers })).status, 401);
    const expiring = await context.internalAdapter.createSession(user.id);
    records.session.find(record => record.token === expiring!.token).expiresAt = new Date(0);
    assert.equal((await fetch(url + '/private', { headers: { Cookie: cookie(expiring!.token) } })).status, 401);
  });
});

test('invalid session expiry and auth service failure deny handler access', async () => {
  let calls = 0;
  const app = express();
  app.get('/invalid', createOwnerGuard(async () => ({ user: { id: 'owner', email: config.OWNER_EMAIL, emailVerified: true }, session: { expiresAt: new Date(NaN) } })), (_req, res) => { calls++; res.json({}); });
  app.get('/outage', createOwnerGuard(async () => { throw new Error('synthetic outage'); }), (_req, res) => { calls++; res.json({}); });
  app.post('/forbidden', createOwnerGuard(async () => ({ user: { id: 'other', email: 'other@example.invalid', emailVerified: true }, session: { expiresAt: new Date(Date.now() + 60_000) } })), (_req, res) => { calls++; res.json({}); });
  await serve(app, async url => {
    const invalid = await fetch(url + '/invalid'); assert.equal(invalid.status, 401);
    assert.deepEqual(await invalid.json(), { error: 'Authentication required', code: 'AUTH_REQUIRED' });
    const outage = await fetch(url + '/outage'); assert.equal(outage.status, 503);
    assert.deepEqual(await outage.json(), { error: 'Private authentication is unavailable', code: 'AUTH_UNAVAILABLE' });
    const forbidden = await fetch(url + '/forbidden', { method: 'POST', headers: { Origin: config.BETTER_AUTH_URL } }); assert.equal(forbidden.status, 403);
    assert.deepEqual(await forbidden.json(), { error: 'Private workspace access denied', code: 'AUTH_FORBIDDEN' });
    assert.equal(calls, 0);
  });
});

test('real owner session reaches scoped workspace operations; repository outages never substitute demo', async () => {
  const { auth } = fixture();
  const context = await auth.$context;
  const user = await context.internalAdapter.createUser({ email: config.OWNER_EMAIL, emailVerified: true, name: 'Synthetic Owner' }, undefined);
  const session = await context.internalAdapter.createSession(user.id);
  let unavailable = false;
  const calls: string[] = [];
  const operation = async (owner: string) => {
    assert.equal(owner, user.id); calls.push(owner);
    if (unavailable) throw new Error('Synthetic storage outage');
    return { revision: 0, profile: null, evidence: [], jobs: [], auditLog: [] };
  };
  const app = express(); app.use(express.json());
  app.use('/api/workspace', createWorkspaceRouter({ read: operation, save: operation, import: operation, transition: operation } as any,
    createOwnerGuard(req => auth.api.getSession({ headers: fromNodeHeaders(req.headers), query: { disableCookieCache: true } }))));
  await serve(app, async url => {
    const headers = { Cookie: cookie(session!.token), Origin: config.BETTER_AUTH_URL, 'Content-Type': 'application/json' };
    for (const [method, path] of [['GET', 'data'], ['POST', 'data'], ['POST', 'import'], ['GET', 'export'], ['GET', 'audit-log'], ['GET', 'analytics'], ['POST', 'application-transition']]) {
      const response = await fetch(url + '/api/workspace/' + path, { method, headers });
      assert.equal(response.status, 200); assert.match(response.headers.get('cache-control')!, /private.*no-store/);
      assert.doesNotMatch(await response.text(), /Jordan Taylor/);
    }
    assert.equal(calls.length, 8, 'includes pre-save owner read, analytics and transition authority');
    unavailable = true;
    for (const path of ['data', 'export', 'audit-log', 'analytics']) {
      const response = await fetch(url + '/api/workspace/' + path, { headers });
      assert.equal(response.status, 503); assert.deepEqual(await response.json(), { error: 'Private storage unavailable' });
    }
  });
});

test('production HTTPS cookies and OAuth callbacks use the configured canonical origin', async () => {
  try {
    Object.assign(process.env, { BETTER_AUTH_URL: 'https://preview.example.invalid', NODE_ENV: 'production' });
    const { auth, options } = fixture();
    const context = await auth.$context;
    const attributes = context.authCookies.sessionToken.attributes;
    assert.equal(attributes.httpOnly, true); assert.equal(attributes.secure, true); assert.equal(attributes.sameSite, 'lax');
    assert.deepEqual(options.trustedOrigins, ['https://preview.example.invalid']);
    const response = await auth.handler(new Request('https://preview.example.invalid/api/auth/sign-in/social', { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'https://preview.example.invalid' }, body: JSON.stringify({ provider: 'google', callbackURL: 'https://evil.invalid' }) }));
    assert.equal(response.status, 403);
    const valid = await auth.handler(new Request('https://preview.example.invalid/api/auth/sign-in/social', { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'https://preview.example.invalid' }, body: JSON.stringify({ provider: 'google', callbackURL: 'https://preview.example.invalid/?workspace=private' }) }));
    assert.equal(valid.status, 200);
    const oauth = new URL((await valid.json()).url);
    assert.equal(oauth.searchParams.get('redirect_uri'), 'https://preview.example.invalid/api/auth/callback/google');
    assert.ok(oauth.searchParams.get('state'));
    assert.match(valid.headers.get('set-cookie')!, /HttpOnly/i); assert.match(valid.headers.get('set-cookie')!, /Secure/i);
  } finally { Object.assign(process.env, config); }
});

test('actual installed route inventory protects all application, workspace and private-file operations', async () => {
  // Import the production app, inspect its installed Express stack and make
  // actual denied HTTP requests. No injected guard or handler bypass here.
  const { app } = await import('../server');
  const routes = app._router.stack.filter((layer: any) => layer.route).flatMap((layer: any) => Object.keys(layer.route.methods).map(method => ({ method, path: layer.route.path })));
  const privateRoutes = routes.filter((route: any) => route.path.startsWith('/api/') && !route.path.startsWith('/api/auth/') && route.path !== '/api/health');
  assert.equal(privateRoutes.length, 22); // 16 application APIs + 6 guarded file methods; temporary Gemini probes were removed
  assert.ok(privateRoutes.some((route:any)=>route.path==='/api/validate-resume'));
  await serve(app, async url => {
    for (const route of [...privateRoutes, { method: 'post', path: '/api/workspace/data' }, { method: 'post', path: '/api/workspace/evidence-approval' }, ...['data', 'import', 'export', 'audit-log'].map(path => ({ method: path === 'import' ? 'post' : 'get', path: '/api/workspace/' + path }))]) {
      const response = await fetch(url + route.path.replace(':id', 'synthetic'), { method: route.method.toUpperCase(), headers: { Origin: config.BETTER_AUTH_URL } });
      assert.equal(response.status, 401, route.path);
      assert.match(response.headers.get('cache-control')!, /private.*no-store/);
      assert.deepEqual(await response.json(), { error: 'Authentication required', code: 'AUTH_REQUIRED' });
    }
    assert.equal((await fetch(url + '/api/health')).status, 200);
    delete process.env.DATABASE_URL;
    const outage = await fetch(url + '/api/workspace/data'); assert.equal(outage.status, 503);
    assert.deepEqual(await outage.json(), { error: 'Private authentication is unavailable', code: 'AUTH_UNAVAILABLE' });
    Object.assign(process.env, config);
  });
  const source = await readFile('server.ts', 'utf8');
  assert.ok(source.indexOf("app.use('/api', requireWorkspaceOwner)") < source.indexOf("app.post('/api/fetch-job-url'"));
});
