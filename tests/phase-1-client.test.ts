import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { storageService } from '../src/services/storage';
import { apiService, workspaceRequest, invalidatePrivateRequests, setBeforePrivateRequest, signOutPrivateWorkspace } from '../src/services/api';

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

test('401/403/503 and network outage clear private access and never return demo records', async () => {
  const original = globalThis.fetch;
  try {
    for (const status of [401, 403, 503]) {
      authenticate();
      globalThis.fetch = async (_path, init) => {
        assert.equal(init?.credentials, 'same-origin'); assert.equal(init?.cache, 'no-store');
        return Response.json({ error: 'Synthetic unavailable' }, { status });
      };
      await assert.rejects(workspaceRequest('/api/workspace/data'), /Synthetic unavailable/);
      assert.equal(storageService.getAuthSession().isAuthenticated, false);
      assert.deepEqual(storageService.getEvidence('PRIVATE_WORKSPACE'), []);
    }
    authenticate(); globalThis.fetch = async () => { throw new TypeError('Synthetic network outage'); };
    await assert.rejects(workspaceRequest('/api/workspace/data'), /network outage/);
    assert.equal(storageService.getAuthSession().isAuthenticated, false);
    authenticate(); globalThis.fetch = async () => new Response('Synthetic proxy unavailable', { status: 503 });
    await assert.rejects(workspaceRequest('/api/workspace/data'));
    assert.equal(storageService.getAuthSession().isAuthenticated, false);
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
      requests++;
      return Response.json(requests === 1 ? { error: 'Synthetic revocation unavailable' } : { success: true }, { status: requests === 1 ? 503 : 200 });
    };
    authenticate();
    await assert.rejects(signOutPrivateWorkspace(loseAccess), /revocation unavailable/);
    await signOutPrivateWorkspace(loseAccess);
    assert.equal(requests, 2);
  } finally { globalThis.fetch = original; localStorage.setItem = write; loseAccess(); }
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
