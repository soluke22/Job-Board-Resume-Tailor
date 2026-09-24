import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { storageService } from '../src/services/storage';
import { apiService, workspaceRequest, invalidatePrivateRequests, setBeforePrivateRequest, signOutPrivateWorkspace, privateSignInFailureNotice, clearPrivateSignInIntent } from '../src/services/api';
import { shouldDismissAuthModal } from '../src/components/AuthModal';

const browser = new EventTarget();
const values = new Map<string, string>();
Object.assign(globalThis, { window: browser, localStorage: { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value), removeItem: (key: string) => values.delete(key) } });
function authenticate() {
  storageService.saveAuthSession({ isAuthenticated: true, isOwner: true, mode: 'PRIVATE_WORKSPACE', userEmail: 'owner@example.invalid' });
  storageService.hydratePrivateWorkspace({ profile: { name: 'Synthetic Private Owner' }, evidence: [{ id: 'synthetic-private' }] });
}
function loseAccess() { invalidatePrivateRequests(); storageService.clearAuthSession(); }
browser.addEventListener('workspace-access-lost', loseAccess);

test('private cache is memory-only; clearing access preserves the separate synthetic demo and blank private setup', () => {
  authenticate();
  assert.equal(storageService.getProfile('PRIVATE_WORKSPACE').name, 'Synthetic Private Owner');
  assert.equal(values.size, 0);
  loseAccess();
  assert.equal(storageService.getAuthSession().isAuthenticated, false);
  assert.equal(storageService.getProfile('PRIVATE_WORKSPACE').name, '');
  assert.deepEqual(storageService.getEvidence('PRIVATE_WORKSPACE'), []);
  assert.notEqual(storageService.getProfile('PUBLIC_DEMO').name, 'Synthetic Private Owner');
  assert.ok(storageService.getEvidence('PUBLIC_DEMO').length > 0);
});

test('private API error codes preserve a valid session for provider failures and fail closed only for explicit auth loss', async () => {
  const original = globalThis.fetch;
  try {
    for (const { status, code, losesAccess } of [
      { status: 503, code: 'PROVIDER_UNAVAILABLE', losesAccess: false },
      { status: 503, code: 'AUTH_UNAVAILABLE', losesAccess: true },
      { status: 401, code: 'AUTH_REQUIRED', losesAccess: true },
      { status: 403, code: 'AUTH_FORBIDDEN', losesAccess: true },
      { status: 429, code: 'PROVIDER_BUDGET_EXCEEDED', losesAccess: false },
      { status: 502, code: 'GEMINI_AUTH_INVALID', losesAccess: false },
      { status: 401, code: 'GEMINI_AUTH_INVALID', losesAccess: false },
      { status: 502, code: 'GEMINI_PERMISSION_DENIED', losesAccess: false },
      { status: 502, code: 'GEMINI_REQUEST_INVALID', losesAccess: false },
      { status: 502, code: 'GEMINI_MODEL_NOT_FOUND', losesAccess: false },
      { status: 502, code: 'GEMINI_PAYMENT_REQUIRED', losesAccess: false },
    ]) {
      authenticate();
      globalThis.fetch = async (_path, init) => {
        assert.equal(init?.credentials, 'same-origin'); assert.equal(init?.cache, 'no-store');
        return Response.json({ error: `Synthetic ${code.toLowerCase()} error`, code }, { status });
      };
      await assert.rejects(apiService.discoverJobs({ preferredRoleFamilies: [], technologyStrengths: [], remotePreference: 'any' }), new RegExp(`Synthetic ${code.toLowerCase()} error`));
      assert.equal(storageService.getAuthSession().isAuthenticated, !losesAccess, code);
      assert.equal(storageService.getEvidence('PRIVATE_WORKSPACE').length, losesAccess ? 0 : 1, code);
    }
    authenticate(); globalThis.fetch = async () => { throw new TypeError('Synthetic network outage'); };
    await assert.rejects(workspaceRequest('/api/workspace/data'), /network outage/);
    assert.equal(storageService.getAuthSession().isAuthenticated, true);
    assert.equal(storageService.getEvidence('PRIVATE_WORKSPACE').length, 1);
  } finally { globalThis.fetch = original; loseAccess(); }
});

test('public demo session probing does not dispatch private access-loss events during auth outage', async () => {
  const original = globalThis.fetch;
  let lost = 0;
  const count = () => { lost++; };
  browser.addEventListener('workspace-access-lost', count);
  try {
    loseAccess();
    globalThis.fetch = async () => Response.json({ error: 'Synthetic auth unavailable' }, { status: 503 });
    await assert.rejects(apiService.getSession(), /auth unavailable/);
    assert.equal(lost, 0);
    assert.ok(storageService.getEvidence('PUBLIC_DEMO').length > 0);
  } finally { globalThis.fetch = original; browser.removeEventListener('workspace-access-lost', count); loseAccess(); }
});

test('workspace requests handle JSON and empty or non-JSON responses without exposing parser or intermediary text', async () => {
  const original = globalThis.fetch;
  try {
    globalThis.fetch = async () => Response.json({ authenticated: false, isOwner: false });
    assert.deepEqual(await apiService.getSession(), { authenticated: false, isOwner: false });

    globalThis.fetch = async () => Response.json({ error: 'Synthetic safe server error' }, { status: 409 });
    await assert.rejects(workspaceRequest('/api/workspace/data'), /Synthetic safe server error/);

    for (const body of ['', '<html>synthetic intermediary details</html>']) {
      authenticate();
      globalThis.fetch = async () => new Response(body, { status: 500, headers: { 'Content-Type': 'text/html' } });
      await assert.rejects(workspaceRequest('/api/workspace/data'), (error: Error) => {
        assert.match(error.message, /Private workspace service unavailable \(HTTP 500\)/);
        assert.doesNotMatch(error.message, /Unexpected end of JSON input|synthetic intermediary details|<html>/);
        return true;
      });
      assert.equal(storageService.getAuthSession().isAuthenticated, true);
      assert.equal(storageService.getEvidence('PRIVATE_WORKSPACE').length, 1);
    }

    authenticate();
    globalThis.fetch = async () => new Response('{broken', { status: 200, headers: { 'Content-Type': 'application/json' } });
    await assert.rejects(apiService.getSession(), (error: Error) => {
      assert.match(error.message, /Private workspace returned an invalid response \(HTTP 200\)/);
      assert.doesNotMatch(error.message, /SyntaxError|Unexpected end of JSON input/);
      return true;
    });
      assert.equal(storageService.getAuthSession().isAuthenticated, true);
      assert.equal(storageService.getEvidence('PRIVATE_WORKSPACE').length, 1);

    authenticate();
    globalThis.fetch = async () => new Response('', { status: 403 });
    await assert.rejects(workspaceRequest('/api/workspace/data'), /Private workspace service unavailable \(HTTP 403\)/);
    assert.equal(storageService.getAuthSession().isAuthenticated, true);
    assert.equal(storageService.getEvidence('PRIVATE_WORKSPACE').length, 1);
  } finally { globalThis.fetch = original; loseAccess(); }
});

test('auth modal Escape and backdrop decisions dismiss only while idle and only on the backdrop', async () => {
  assert.equal(shouldDismissAuthModal('escape', false), true);
  assert.equal(shouldDismissAuthModal('backdrop', false, true), true);
  assert.equal(shouldDismissAuthModal('backdrop', false, false), false);
  assert.equal(shouldDismissAuthModal('escape', true), false);
  assert.equal(shouldDismissAuthModal('backdrop', true, true), false);

  const source = await readFile('src/components/AuthModal.tsx', 'utf8');
  assert.match(source, /document\.addEventListener\('keydown', onKeyDown\)/);
  assert.match(source, /event\.key === 'Escape' && shouldDismissAuthModal\('escape', isBusy \|\| activeOperation\.current\)/);
  assert.match(source, /shouldDismissAuthModal\('backdrop', isBusy \|\| activeOperation\.current, event\.target === event\.currentTarget\)/);
  assert.match(source, /onClick=\{\(\) => setIsAuthModalOpen\(false\)\}/);
  assert.match(source, /role="dialog"[\s\S]*aria-modal="true"[\s\S]*aria-labelledby="auth-modal-title"/);
  const escapeHandler = source.slice(source.indexOf('const onKeyDown'), source.indexOf("document.addEventListener('keydown'"));
  const backdropHandler = source.slice(source.indexOf("shouldDismissAuthModal('backdrop'"), source.indexOf('role="dialog"'));
  for (const handler of [escapeHandler, backdropHandler]) {
    assert.match(handler, /setIsAuthModalOpen\(false\)/);
    assert.doesNotMatch(handler, /setWorkspaceMode\(|logout\(/);
  }
});

test('stale workspace save reports conflict without auto-merge, demo substitution or cache overwrite; reload adopts server state', async () => {
  const original = globalThis.fetch;
  try {
    authenticate();
    globalThis.fetch = async (_path, init) => {
      assert.deepEqual(JSON.parse(init!.body as string), { data: { evidence: [] }, revision: 1 });
      return Response.json({ error: 'Workspace changed. Reload before saving.' }, { status: 409 });
    };
    await assert.rejects(apiService.saveWorkspaceData({ evidence: [] }, 1), /Reload before saving/);
    assert.equal(storageService.getAuthSession().isAuthenticated, true);
    assert.equal(storageService.getEvidence('PRIVATE_WORKSPACE')[0].id, 'synthetic-private');
    globalThis.fetch = async () => Response.json({ revision: 2, data: { evidence: [{ id: 'server-winner' }] } });
    const result = await apiService.getWorkspaceData();
    storageService.hydratePrivateWorkspace(result.data);
    assert.equal(result.revision, 2); assert.equal(storageService.getEvidence('PRIVATE_WORKSPACE')[0].id, 'server-winner');
    const context = await readFile('src/context/AppContext.tsx', 'utf8');
    assert.match(context, /ready\.current = false; setSyncStatus\('Not saved — reload required'\)/);
  } finally { globalThis.fetch = original; loseAccess(); }
});

test('pending workspace/export and AI replies cannot return private data after access generation changes', async () => {
  const original = globalThis.fetch;
  setBeforePrivateRequest(async () => {});
  try {
    for (const action of [() => workspaceRequest('/api/workspace/data'), () => apiService.exportWorkspace(), () => apiService.generateArtifact('answers','synthetic-job',{questions:['Describe React experience']}), () => apiService.transitionApplication({jobId:'synthetic-job',targetStatus:'APPLIED',requestId:'synthetic-retry'})]) {
      authenticate();
      let release!: (response: Response) => void;
      globalThis.fetch = () => new Promise<Response>(resolve => { release = resolve; });
      const pending = action();
      await Promise.resolve(); await Promise.resolve();
      loseAccess();
      release(Response.json({ data: { profile: { name: 'Synthetic Private Owner' } } }));
      await assert.rejects(pending, /Session changed/);
      assert.equal(storageService.getProfile('PRIVATE_WORKSPACE').name, '');
    }
  } finally { globalThis.fetch = original; loseAccess(); }
});

test('an old failed request cannot clear a newly established session', async () => {
  const original = globalThis.fetch;
  try {
    authenticate();
    let reject!: (error: Error) => void;
    globalThis.fetch = () => new Promise<Response>((_resolve, fail) => { reject = fail; });
    const pending = workspaceRequest('/api/workspace/data');
    loseAccess(); authenticate();
    reject(new Error('Synthetic old outage'));
    await assert.rejects(pending);
    assert.equal(storageService.getAuthSession().isAuthenticated, true);
  } finally { globalThis.fetch = original; loseAccess(); }
});

test('browser storage errors cannot stop server logout or retry; server errors remain explicit', async () => {
  const original = globalThis.fetch;
  const write = localStorage.setItem;
  let requests = 0;
  try {
    localStorage.setItem = () => { throw new DOMException('Synthetic blocked storage', 'SecurityError'); };
    globalThis.fetch = async (path, init) => {
      assert.equal(path, '/api/auth/sign-out'); assert.equal(init?.method, 'POST');
      assert.equal(storageService.getAuthSession().isAuthenticated, false);
      assert.deepEqual(storageService.getEvidence('PRIVATE_WORKSPACE'), []);
      requests++;
      return Response.json(requests === 1 ? { error: 'Synthetic revocation unavailable' } : { success: true }, { status: requests === 1 ? 503 : 200 });
    };
    authenticate();
    await assert.rejects(signOutPrivateWorkspace(loseAccess), /revocation unavailable/);
    await signOutPrivateWorkspace(loseAccess);
    assert.equal(requests, 2);
  } finally { globalThis.fetch = original; localStorage.setItem = write; loseAccess(); }
});

test('private sign-in intent is only a failure notice, and URL cleanup preserves unrelated navigation', () => {
  const notice = 'Private sign-in was not accepted. Continue with the configured owner Google account.';
  loseAccess();
  assert.equal(privateSignInFailureNotice('?workspace=private'), notice);
  assert.equal(storageService.getAuthSession().isAuthenticated, false);
  assert.equal(storageService.getWorkspaceMode(), 'PUBLIC_DEMO');
  assert.deepEqual(storageService.getEvidence('PRIVATE_WORKSPACE'), []);

  const location = { href: 'https://preview.example.invalid/?workspace=private&view=setup#search' };
  const history = { state: { synthetic: true }, replaceState(_state: unknown, _unused: string, target?: string | URL | null) {
    location.href = new URL(String(target), location.href).href;
  } };
  assert.equal(clearPrivateSignInIntent(location, history), true);
  assert.equal(location.href, 'https://preview.example.invalid/?view=setup#search');
  assert.equal(privateSignInFailureNotice(new URL(location.href).search), null);
  assert.equal(clearPrivateSignInIntent(location, history), false);
  assert.equal(storageService.getAuthSession().isAuthenticated, false);
  assert.equal(storageService.getWorkspaceMode(), 'PUBLIC_DEMO');
  assert.ok(storageService.getEvidence('PUBLIC_DEMO').length > 0);
});

test('successful server sign-out clears stale private intent after revocation, not after a failed attempt', async () => {
  const originalFetch = globalThis.fetch;
  const previousLocation = (browser as any).location;
  const previousHistory = (browser as any).history;
  const location = { href: 'https://preview.example.invalid/?workspace=private' };
  let replacements = 0;
  const history = { state: null, replaceState(_state: unknown, _unused: string, target?: string | URL | null) {
    replacements++;
    location.href = new URL(String(target), location.href).href;
  } };
  Object.assign(browser, { location, history });
  try {
    authenticate();
    globalThis.fetch = async () => Response.json({ error: 'Synthetic revocation unavailable' }, { status: 503 });
    await assert.rejects(signOutPrivateWorkspace(loseAccess), /revocation unavailable/);
    assert.equal(location.href, 'https://preview.example.invalid/?workspace=private');
    assert.equal(replacements, 0);

    authenticate();
    globalThis.fetch = async () => Response.json({ success: true });
    await signOutPrivateWorkspace(loseAccess);
    assert.equal(location.href, 'https://preview.example.invalid/');
    assert.equal(replacements, 1);
    assert.equal(privateSignInFailureNotice(new URL(location.href).search), null);
    assert.equal(storageService.getWorkspaceMode(), 'PUBLIC_DEMO');
    assert.equal(storageService.getAuthSession().isAuthenticated, false);
    assert.deepEqual(storageService.getEvidence('PRIVATE_WORKSPACE'), []);
    assert.ok(storageService.getEvidence('PUBLIC_DEMO').length > 0);
  } finally {
    globalThis.fetch = originalFetch;
    Object.assign(browser, { location: previousLocation, history: previousHistory });
    loseAccess();
  }
});

test('client/server auth surfaces have no legacy bearer, URL token or persisted auth path', async () => {
  const sources = await Promise.all(['server/auth.ts', 'src/services/api.ts', 'src/services/storage.ts', 'src/context/AppContext.tsx', 'src/components/AuthModal.tsx'].map(path => readFile(path, 'utf8')));
  for (const source of sources) {
    assert.doesNotMatch(source, /Bearer\s|req\.query\.(?:token|auth)|[?&](?:token|access_token|auth_token)=|localStorage\.setItem\([^\n]*(?:token|SESSION)/i);
  }
  // Inspection is supplementary: request/cache behavior above runs the real
  // modules; these checks only keep lifecycle wiring from silently disappearing.
  assert.match(sources[3], /scheduleExpiry\(session\.expiresAt\)/);
  assert.match(sources[3], /visibilitychange/);
  assert.match(sources[3], /workspace-access-lost/);
});
