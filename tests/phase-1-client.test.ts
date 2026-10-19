import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { extname, resolve, sep } from 'node:path';
import { DEMO_JOBS } from '../src/data/syntheticDemoData';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { AppProvider } from '../src/context/AppContext';
import { ResumePaper } from '../src/components/ResumePaper';
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

const utilityTokens = (classes: string) => new Set(classes.trim().split(/\s+/));
const invalidPrimaryColors = (classes: string) => {
  const tokens = utilityTokens(classes);
  return tokens.has('bg-emerald-600') && tokens.has('text-white');
};
const readableDarkSecondary = (tokens: Set<string>, decorativeSeparator: boolean) =>
  tokens.has('dark:text-slate-500') ? decorativeSeparator : tokens.has('dark:text-slate-400') || tokens.has('dark:text-slate-300');

const studioBrowserOptions = {
  skip: !process.env.CAREEROS_TEST_APP_DIST
    ? 'Set CAREEROS_TEST_APP_DIST plus existing Playwright/Chromium paths for built-application UI acceptance'
    : false,
};

// Exercise the real built App and AppProvider in an isolated PUBLIC_DEMO browser.
// The tiny loopback server supplies assets and an unauthenticated session only.
async function withDemoStudio(jobs: typeof DEMO_JOBS, check: (page: any, requests: string[]) => Promise<void>) {
  assert.ok(process.env.CAREEROS_TEST_PLAYWRIGHT);
  assert.ok(process.env.CAREEROS_TEST_CHROMIUM);
  assert.ok(process.env.CAREEROS_TEST_APP_DIST);
  const root = resolve(process.env.CAREEROS_TEST_APP_DIST);
  const requests: string[] = [];
  const server = createServer(async (req, res) => {
    const path = new URL(req.url || '/', 'http://127.0.0.1').pathname;
    requests.push(path);
    if (path.startsWith('/api/')) {
      res.writeHead(path === '/api/auth/session' ? 200 : 503, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
      res.end(JSON.stringify(path === '/api/auth/session' ? { authenticated: false } : { error: 'Synthetic Demo service unavailable' }));
      return;
    }
    const file = resolve(root, path === '/' ? 'index.html' : '.' + path);
    if (!file.startsWith(root + sep)) { res.writeHead(403).end(); return; }
    try {
      const body = await readFile(file);
      const types: Record<string, string> = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };
      res.writeHead(200, { 'Content-Type': types[extname(file)] || 'application/octet-stream' }); res.end(body);
    } catch { res.writeHead(404).end(); }
  });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  const origin = `http://127.0.0.1:${address.port}`;
  const { chromium } = createRequire(import.meta.url)(process.env.CAREEROS_TEST_PLAYWRIGHT);
  let instance: any;
  try {
    instance = await chromium.launch({ executablePath: process.env.CAREEROS_TEST_CHROMIUM, headless: true, chromiumSandbox: true });
    const context = await instance.newContext({ serviceWorkers: 'block', viewport: { width: 1280, height: 1000 } });
    await context.route('**/*', (route: any) => new URL(route.request().url()).origin === origin ? route.continue() : route.abort('blockedbyclient'));
    await context.addInitScript((records: typeof DEMO_JOBS) => localStorage.setItem('caos_demo_jobs', JSON.stringify(records)), jobs);
    const page = await context.newPage();
    await page.goto(origin, { waitUntil: 'networkidle' });
    await check(page, requests);
  } finally {
    if (instance) await instance.close();
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  }
}

test('Frontend Product filter keeps canonical and legacy jobs without admitting other families', studioBrowserOptions, async () => {
  const families = ['frontend-product', 'frontend-product-engineer', 'ui-platform-design-systems', 'internal-tools-fullstack-frontend', 'production-support-frontend', 'frontend-product-unrelated'];
  const jobs = families.map((family, i) => ({ ...structuredClone(DEMO_JOBS[0]), id: `synthetic-filter-${i}`, company: `Synthetic Filter ${i}`, parsed: { ...DEMO_JOBS[0].parsed!, classifiedFamily: family as any } }));
  await withDemoStudio(jobs, async page => {
    await page.getByRole('button', { name: 'Studio', exact: true }).click();
    await page.getByTitle('Back to Job Analysis', { exact: true }).click();
    await page.getByRole('button', { name: 'Back to All Jobs', exact: true }).click();
    const expectVisible = async (indices: number[]) => {
      await page.waitForFunction(({ all, visible }: { all: string[]; visible: string[] }) => {
        const lines = document.querySelector('main')!.innerText.split('\n').map(line => line.trim());
        return all.every(name => lines.includes(name) === visible.includes(name));
      }, { all: jobs.map(job => job.company), visible: indices.map(i => jobs[i].company) }, { timeout: 2000 });
      for (let i = 0; i < jobs.length; i++) assert.equal(await page.locator('main').getByText(`Synthetic Filter ${i}`, { exact: true }).count(), indices.includes(i) ? 1 : 0);
    };
    await page.getByRole('button', { name: 'Frontend Product', exact: true }).click();
    await expectVisible([0, 1]);
    for (const [label, index] of [['UI Platform & Systems', 2], ['Internal Tools', 3], ['Production Support', 4]] as const) {
      await page.getByRole('button', { name: label, exact: true }).click(); await expectVisible([index]);
    }
    await page.getByRole('button', { name: 'All Families', exact: true }).click(); await expectVisible([0, 1, 2, 3, 4, 5]);
  });
});

// Opt in with existing local tools; the default synthetic suite needs no browser
// download. This exercises Chromium pagination, not the spelling of CSS rules.
test('resume print flow excludes Studio layout and retains natural multi-page content', {
  skip: !process.env.CAREEROS_TEST_PLAYWRIGHT && !process.env.CAREEROS_TEST_CHROMIUM
    ? 'Set CAREEROS_TEST_PLAYWRIGHT and CAREEROS_TEST_CHROMIUM to existing local tools for PDF acceptance'
    : false,
}, async () => {
  assert.ok(process.env.CAREEROS_TEST_PLAYWRIGHT);
  assert.ok(process.env.CAREEROS_TEST_CHROMIUM);
  const { chromium } = createRequire(import.meta.url)(process.env.CAREEROS_TEST_PLAYWRIGHT);
  const printCss = (await readFile('src/index.css', 'utf8')).replace(/^@import[^;]+;/m, '');
  const instance = await chromium.launch({ executablePath: process.env.CAREEROS_TEST_CHROMIUM, headless: true, chromiumSandbox: true });
  try {
    const context = await instance.newContext({ serviceWorkers: 'block', viewport: { width: 1280, height: 1000 } });
    await context.route('**/*', (route: any) => route.abort('blockedbyclient'));
    const page = await context.newPage();
    for (const target of ['resume-printable-area', 'cover-letter-printable-area']) {
      for (const paragraphs of [1, 80]) {
        await page.setContent(`<style>
          * { box-sizing: border-box; } body { margin: 0; font: 13px/1.5 Arial; }
          #root { min-height: 1000px; } main { padding-bottom: 64px; }
          .studio { display: grid; grid-template-columns: 300px 1fr; gap: 24px; min-height: 1359px; }
          aside { height: 1359px; } article { min-height: 1056px; padding: 40px; }
          .print-draft-warning { display: none; }
          ${printCss}
        </style><div id="root"><nav>Navigation</nav><main><div class="studio">
          <aside>Editing controls</aside><div><article id="${target}">
          <p class="print-draft-warning">DRAFT / NOT VALIDATED FOR SUBMISSION</p>
          <h1>Synthetic Candidate</h1>${Array.from({ length: paragraphs }, (_, i) => `<p>Approved synthetic statement ${i + 1}: Built accessible interface components using React and TypeScript.</p>`).join('')}
          </article></div></div></main><footer>Studio footer</footer></div>`);
        const pdf = await page.pdf({ preferCSSPageSize: true, printBackground: true });
        const pages = (pdf.toString('latin1').match(/\/Type\s*\/Page\b/g) ?? []).length;
        if (paragraphs === 1) assert.equal(pages, 1, `${target}: short output must not inherit blank Studio pages`);
        else assert.ok(pages > 1, `${target}: long output must not be scaled or truncated to one page`);
        await page.emulateMedia({ media: 'print' });
        assert.equal(await page.locator(`#${target} p:not(.print-draft-warning)`).count(), paragraphs);
        if (target === 'resume-printable-area') {
          assert.equal(await page.locator('.print-draft-warning').isVisible(), true, 'native print remains draft');
          await page.evaluate(() => { document.body.dataset.resumeFinalPrint = 'true'; });
          assert.equal(await page.locator('.print-draft-warning').isVisible(), false, 'confirmed final print retains its presentation');
        }
        await page.emulateMedia({ media: null });
      }
    }
  } finally { await instance.close(); }
});

test('Studio toolbar keeps its selector, modes and export controls inside each viewport', studioBrowserOptions, async t => {
  const first = structuredClone(DEMO_JOBS[0]);
  first.company = 'Synthetic Interface Labs'; first.title = 'Frontend Product Engineer';
  const second = { ...structuredClone(first), id: 'synthetic-second-studio', company: 'Synthetic Interface Labs with a deliberately long selection label' };
  await withDemoStudio([first, second], async page => {
    await page.getByRole('button', { name: 'Studio', exact: true }).click();
    const selector = page.locator('main select').first();
    const toolbar = page.getByTitle('Back to Job Analysis', { exact: true }).locator('../..');
    for (const width of [390, 1024, 1280]) {
      await page.setViewportSize({ width, height: 1000 });
      for (const mode of ['Tailored Cover Letter', 'Tailored Resume']) {
        await page.getByRole('button', { name: mode, exact: true }).click();
        if (mode === 'Tailored Resume') await page.locator('#resume-printable-area').waitFor();
        else await page.getByText('No cover letter available for preview.', { exact: true }).waitFor();
        const geometry = await toolbar.evaluate((element: HTMLElement) => ({
          viewport: innerWidth, document: document.documentElement.scrollWidth,
          controls: [...element.querySelectorAll('button,select')].map(control => {
            const rect = control.getBoundingClientRect(); return { left: rect.left, right: rect.right, width: rect.width, height: rect.height };
          }),
        }));
        t.diagnostic(JSON.stringify({ mode, ...geometry }));
        assert.ok(geometry.document <= width, `Studio document ${geometry.document}px exceeds ${width}px`);
        assert.ok(geometry.controls.every((rect: any) => rect.left >= 0 && rect.right <= width && rect.width > 0 && rect.height > 0));
      }
      await selector.selectOption(second.id);
      assert.equal(await selector.inputValue(), second.id);
      await selector.selectOption(first.id);
      await page.getByRole('button', { name: 'Export Options', exact: true }).click();
      await page.getByRole('heading', { name: 'Export Tailored Resume', exact: true }).waitFor();
      await page.getByRole('button', { name: 'Close', exact: true }).click();
    }
  });
});

test('analysis actions promise only a resume and preserve the Demo generation fence', studioBrowserOptions, async () => {
  await withDemoStudio([structuredClone(DEMO_JOBS[0])], async (page, requests) => {
    await page.getByRole('button', { name: 'Studio', exact: true }).click();
    await page.getByTitle('Back to Job Analysis', { exact: true }).click();
    const actions = page.getByRole('button', { name: 'Tailor Resume', exact: true });
    assert.equal(await actions.count(), 2, 'both generation actions must describe the available artifact');
    assert.equal(await page.getByRole('button', { name: /Tailor.*Cover Letter/ }).count(), 0);
    await actions.first().click();
    await page.getByText('Sign in to the private workspace to use this action. Demo records remain synthetic.', { exact: true }).waitFor();
    assert.equal(requests.some(path => /generate-cover-letter|generate-resume/.test(path)), false, 'Demo must not gain access to generation endpoints');
  });
});

test('resume contact separators appear only between nonempty values and preserve link semantics', () => {
  const link = { label: 'Portfolio', url: 'https://portfolio.example.invalid' };
  const cases = [
    { location: 'Baltimore, MD', email: 'synthetic@example.invalid', phone: '555-0100', links: [link], expected: 'Baltimore, MD•synthetic@example.invalid•555-0100•Portfolio: portfolio.example.invalid' },
    { location: 'Baltimore, MD', email: 'synthetic@example.invalid', phone: '', links: [link], expected: 'Baltimore, MD•synthetic@example.invalid•Portfolio: portfolio.example.invalid' },
    { location: '', email: '', phone: '555-0100', links: [link], expected: '555-0100•Portfolio: portfolio.example.invalid' },
    { location: '  ', email: '', phone: '', links: [{ label: 'Empty', url: ' ' }], expected: '' },
    { location: '', email: '', phone: '', links: [{ label: '', url: link.url }, { label: 'Code', url: 'https://code.example.invalid' }], expected: 'portfolio.example.invalid•Code: code.example.invalid' },
  ];
  for (const { expected, ...contacts } of cases) {
    const resume = structuredClone(DEMO_JOBS[0].tailoredResume!);
    resume.header = { ...resume.header, ...contacts };
    const html = renderToStaticMarkup(createElement(AppProvider, null, createElement(ResumePaper, { resume })));
    const header = html.match(/<header\b[\s\S]*?<\/header>/)?.[0];
    assert.ok(header);
    const text = header.replace(/<h1\b[\s\S]*?<\/h1>/, '').replace(/<[^>]+>/g, '').replace(/\s*•\s*/g, '•').trim();
    assert.equal(text, expected);
    assert.equal((header.match(/href="mailto:/g) || []).length, contacts.email.trim() ? 1 : 0);
    assert.equal((header.match(/target="_blank" rel="noreferrer"/g) || []).length, contacts.links.filter(item => item.url.trim()).length);
    assert.equal((text.match(/•/g) || []).length, expected ? expected.split('•').length - 1 : 0);
  }
});

test('primary contrast contract rejects equivalent invalid token orders', () => {
  for (const classes of ['bg-emerald-600 text-white', 'text-white bg-emerald-600', 'px-4 text-white rounded-xl bg-emerald-600']) {
    assert.equal(invalidPrimaryColors(classes), true, classes);
  }
  assert.equal(invalidPrimaryColors('text-white bg-emerald-700'), false);
  assert.equal(invalidPrimaryColors('bg-white text-emerald-600'), false);
});

test('dark secondary contrast contract limits the low-contrast exception to the decorative separator', () => {
  for (const classes of ['text-slate-500 dark:text-slate-500', 'dark:text-slate-500 text-slate-500']) {
    assert.equal(readableDarkSecondary(utilityTokens(classes), false), false, 'ordinary secondary copy must not receive the separator exception');
    assert.equal(readableDarkSecondary(utilityTokens(classes), true), true);
  }
  assert.equal(readableDarkSecondary(utilityTokens('text-slate-500 dark:text-slate-400'), false), true);
  assert.equal(readableDarkSecondary(utilityTokens('text-slate-500 dark:text-slate-400 dark:text-slate-500'), false), false, 'a conflicting readable token cannot excuse ordinary slate-500 text');
});

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
      { status: 401, code: 'SEARCH_PROVIDER_UNAVAILABLE', losesAccess: false },
      { status: 429, code: 'SEARCH_RATE_LIMITED', losesAccess: false },
    ]) {
      authenticate();
      globalThis.fetch = async (_path, init) => {
        assert.equal(init?.credentials, 'same-origin'); assert.equal(init?.cache, 'no-store');
        return Response.json({ error: `Synthetic ${code.toLowerCase()} error`, code }, { status });
      };
      await assert.rejects(apiService.discoverJobs('WATCHLIST'), new RegExp(`Synthetic ${code.toLowerCase()} error`));
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

test('private discovery outcomes clear across transitions and never render in public mode', async () => {
  const context = await readFile('src/context/AppContext.tsx', 'utf8');
  const view = await readFile('src/views/DiscoverView.tsx', 'utf8');
  const discovery = context.slice(context.indexOf('const discoverJobs'), context.indexOf('const verifyAtsStatus'));
  assert.match(discovery, /setDiscoverySourceResults\(\[\]\);/);
  assert.match(discovery, /const startedEpoch = epoch\.current;/);
  assert.match(discovery, /await apiService\.discoverJobs\(scope, windowDays\);\s*if \(startedEpoch !== epoch\.current\) return;/);
  assert.match(discovery, /catch \(err: any\) \{\s*if \(startedEpoch !== epoch\.current\) return;\s*setDiscoverySourceResults\(\[\]\);/);
  assert.match(discovery, /finally \{\s*if \(startedEpoch === epoch\.current\) setIsDiscovering\(false\);/);
  const modeSwitch = context.slice(context.indexOf('const setWorkspaceMode'), context.indexOf('// Auth actions'));
  assert.match(modeSwitch, /setLatestDiscoverySession\(null\);/);
  assert.match(modeSwitch, /setIsDiscovering\(false\);/);
  const app = await readFile('src/App.tsx', 'utf8');
  assert.match(app, /<main key=\{`main-workspace-\$\{workspaceMode\}-\$\{workspaceEpoch\}`\}/);
  assert.match(context.slice(context.indexOf('const reloadDataForMode'), context.indexOf('const setWorkspaceMode')), /setDiscoverySourceResults\(\[\]\);/);
  assert.match(view, /workspaceMode === 'PRIVATE_WORKSPACE' && authSession\.isAuthenticated && discoverySourceResults\.length > 0/);
});

test('discovery actions wrap within the mobile viewport without clipping the scan control', async () => {
  const source = await readFile('src/views/DiscoverView.tsx', 'utf8');
  const firstAction = source.indexOf('onClick={() => setIsProfileModalOpen(true)}');
  const actionRegion = source.slice(source.lastIndexOf('<div className="', firstAction), source.indexOf("workspaceMode === 'PRIVATE_WORKSPACE'"));
  const actionClasses = actionRegion.match(/<div className="([^"]+)">/)?.[1] ?? '';
  const scanClasses = actionRegion.slice(actionRegion.indexOf("discoverJobs('ALL_ENABLED'")).match(/className="([^"]+)"/)?.[1] ?? '';
  assert.ok(actionClasses.split(/\s+/).includes('flex-wrap'));
  assert.ok(actionClasses.split(/\s+/).includes('w-full'));
  assert.ok(scanClasses.split(/\s+/).includes('w-full'));
  assert.doesNotMatch(source, /overflow-x-hidden/);
});

test('discovery surfaces follow the existing light and dark theme contract', async () => {
  const source = await readFile('src/views/DiscoverView.tsx', 'utf8');
  const tokens = (fragment: string) => new Set((fragment.match(/className="([^"]+)"/)?.[1] ?? '').split(/\s+/));
  const topBanner = tokens(source.slice(source.indexOf('{/* Top Banner'), source.indexOf('Discover & Verify')));
  const searchInput = tokens(source.slice(source.lastIndexOf('<input', source.indexOf('Search company, title, or skills')), source.indexOf('/>', source.indexOf('Search company, title, or skills'))));
  const sourceCard = tokens(source.slice(source.lastIndexOf('<section', source.indexOf('aria-labelledby="discovery-sources-title"')), source.indexOf('aria-labelledby="discovery-sources-title"') + 50));
  const jobCard = tokens(source.slice(source.indexOf('key={job.id}', source.indexOf('filteredJobs.map')), source.indexOf('{/* Header Row */}')));
  for (const surface of [topBanner, sourceCard, jobCard]) {
    assert.ok(surface.has('bg-white'));
    assert.ok(surface.has('dark:bg-slate-900'));
    assert.ok(surface.has('border-slate-200'));
    assert.ok(surface.has('dark:border-slate-800'));
  }
  assert.ok(searchInput.has('bg-white'));
  assert.ok(searchInput.has('text-slate-900'));
  assert.ok(searchInput.has('dark:bg-slate-950'));
  assert.ok(searchInput.has('dark:text-white'));
});

test('discovery hard-blocker text and meaningful icon have light and dark contrast tokens', async () => {
  const source = await readFile('src/views/DiscoverView.tsx', 'utf8');
  const blocker = source.slice(source.indexOf('{hasBlockers ? ('), source.indexOf('job.hardBlockers[0]'));
  const groups = [...blocker.matchAll(/className="([^"]+)"/g)].map(match => new Set(match[1].split(/\s+/)));
  assert.equal(groups.length, 2);
  assert.ok(groups[0].has('text-red-700'), 'ordinary blocker text needs an AA-capable light foreground');
  assert.ok(groups[0].has('dark:text-red-300'));
  assert.ok(groups[1].has('text-red-600'), 'meaningful blocker icon needs a contrasting light foreground');
  assert.ok(groups[1].has('dark:text-red-400'));
});

test('source and manual-entry placeholders use readable light colors and retain dark opacity', async () => {
  const source = await readFile('src/views/DiscoverView.tsx', 'utf8');
  const names = ['Company label', 'Board URL or greenhouse:board', 'e.g. Linear', 'e.g. Frontend Engineer', 'https://jobs.ashbyhq.com/...', 'Paste full job description here...'];
  const fields = [...source.matchAll(/<(?:input|textarea)\b[\s\S]*?\/>/g)].map(match => match[0]);
  for (const name of names) {
    const field = fields.find(field => field.includes(`placeholder="${name}"`));
    assert.ok(field, `missing field ${name}`);
    const tokens = new Set((field.match(/className="([^"]+)"/)?.[1] ?? '').split(/\s+/));
    assert.ok(tokens.has('placeholder-slate-500'), `${name}: readable light placeholder`);
    assert.ok(tokens.has('dark:placeholder-white/50'), `${name}: preserve former dark placeholder`);
  }
});

test('discovery search placeholder has a readable dark foreground', async () => {
  const source = await readFile('src/views/DiscoverView.tsx', 'utf8');
  const fields = [...source.matchAll(/<input\b[\s\S]*?\/>/g)].map(match => match[0]);
  const search = fields.find(field => field.includes('placeholder="Search company, title, or skills..."'));
  assert.ok(search);
  const tokens = utilityTokens(search.match(/className="([^"]+)"/)?.[1] ?? '');
  assert.ok(tokens.has('placeholder-slate-500'));
  assert.ok(tokens.has('dark:placeholder-slate-400'));
});

test('search profile excluded-pattern badges pair readable light colors with original dark colors', async () => {
  const source = await readFile('src/views/DiscoverView.tsx', 'utf8');
  const badges = source.slice(source.indexOf('searchProfile.excludedRolePatterns.map'), source.indexOf('{pat}'));
  const tokens = new Set((badges.match(/className="([^"]+)"/)?.[1] ?? '').split(/\s+/));
  for (const token of ['bg-red-50', 'text-red-800', 'border-red-300', 'dark:bg-red-950/50', 'dark:text-red-300', 'dark:border-red-800']) {
    assert.ok(tokens.has(token), `excluded-pattern badge missing ${token}`);
  }
});

test('light theme uses AA contrast tokens for muted copy, status text, and primary controls', async () => {
  const [dashboard, shortlist, discovery] = await Promise.all([
    readFile('src/components/DashboardView.tsx', 'utf8'),
    readFile('src/components/DailyShortlistView.tsx', 'utf8'),
    readFile('src/views/DiscoverView.tsx', 'utf8'),
  ]);
  for (const match of dashboard.matchAll(/className="([^"]+)"/g)) {
    assert.equal(utilityTokens(match[1]).has('text-slate-400'), false);
  }
  for (const source of [dashboard, shortlist, discovery]) {
    for (const match of source.matchAll(/className="([^"]+)"/g)) {
      assert.equal(invalidPrimaryColors(match[1]), false, match[1]);
    }
  }
  const selectedShortlistTokens = new Set((shortlist.match(/window === key \? '([^']+)'/)?.[1] ?? '').split(/\s+/));
  assert.ok(selectedShortlistTokens.has('bg-emerald-700'));
  for (const token of ['text-emerald-700', 'text-amber-700', 'text-rose-700']) {
    assert.ok(dashboard.includes(token));
  }
});

test('dashboard secondary text remains readable in dark mode', async () => {
  const dashboard = await readFile('src/components/DashboardView.tsx', 'utf8');
  const separators = [...dashboard.matchAll(/<span\b[^>]*className="([^"]+)"[^>]*>·<\/span>/g)];
  assert.equal(separators.length, 1, 'only the existing decorative midpoint is exempt');
  const separator = separators[0];
  const separatorClassIndex = separator.index! + separator[0].indexOf('className=');
  const secondaryClasses = [...dashboard.matchAll(/className="([^"]+)"/g)].filter(match => utilityTokens(match[1]).has('text-slate-500'));
  assert.ok(secondaryClasses.length > 1);
  for (const match of secondaryClasses) {
    assert.ok(readableDarkSecondary(utilityTokens(match[1]), match.index === separatorClassIndex), match[1]);
  }
  const separatorClasses = utilityTokens(separator[1]);
  assert.ok(separatorClasses.has('text-slate-500'));
  assert.ok(separatorClasses.has('dark:text-slate-500'));
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
