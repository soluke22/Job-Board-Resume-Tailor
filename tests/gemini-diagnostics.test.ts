import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { ApiError } from '@google/genai';
import { classifyGeminiError, logGeminiFailure } from '../server/geminiDiagnostics';

test('Gemini classifier uses installed SDK status, allowlisted reason and real transport shapes without exposing provider text', () => {
  const nestedCause = (code: string) => {
    const error: any = new TypeError('fetch failed'); error.cause = Object.assign(new Error('private transport text'), { code }); return error;
  };
  const apiKeyInvalid = new ApiError({ status: 400, message: JSON.stringify({ error: { details: [{ reason: 'API_KEY_INVALID', metadata: { private: 'must not appear' } }] } }) });
  const ordinary400 = new ApiError({ status: 400, message: JSON.stringify({ error: { details: [{ reason: 'UNAPPROVED_REASON' }] } }) });
  const cases: Array<[unknown, string, number, number | undefined, string | undefined]> = [
    [new ApiError({ status: 401, message: 'private provider text' }), 'GEMINI_AUTH_INVALID', 502, 401, undefined],
    [new ApiError({ status: 403, message: 'private provider text' }), 'GEMINI_PERMISSION_DENIED', 502, 403, undefined],
    [ordinary400, 'GEMINI_REQUEST_INVALID', 502, 400, undefined],
    [apiKeyInvalid, 'GEMINI_AUTH_INVALID', 502, 400, 'API_KEY_INVALID'],
    [new ApiError({ status: 404, message: 'private provider text' }), 'GEMINI_MODEL_NOT_FOUND', 502, 404, undefined],
    [new ApiError({ status: 402, message: 'private provider text' }), 'GEMINI_PAYMENT_REQUIRED', 502, 402, undefined],
    [new ApiError({ status: 429, message: 'private provider text' }), 'GEMINI_RATE_LIMITED', 429, 429, undefined],
    [new ApiError({ status: 503, message: 'private provider text' }), 'GEMINI_UNAVAILABLE', 503, 503, undefined],
    [{ name: 'RequestTimeoutError' }, 'GEMINI_TIMEOUT', 504, undefined, undefined],
    [nestedCause('UND_ERR_HEADERS_TIMEOUT'), 'GEMINI_TIMEOUT', 504, undefined, 'UND_ERR_HEADERS_TIMEOUT'],
    [nestedCause('ENOTFOUND'), 'GEMINI_NETWORK_ERROR', 503, undefined, 'ENOTFOUND'],
    [new Error('private provider text'), 'GEMINI_UNKNOWN', 502, undefined, undefined]
  ];
  for (const [error, code, httpStatus, status, reason] of cases) {
    const failure = classifyGeminiError(error);
    assert.equal(failure.code, code);
    assert.equal(failure.httpStatus, httpStatus);
    assert.equal(failure.status, status);
    assert.equal(failure.reason, reason);
    assert.doesNotMatch(failure.message, /private provider text/);
  }
});

test('Gemini failure logs contain category/status/phase only', () => {
  const warnings: string[] = [];
  const original = console.warn;
  console.warn = (value: unknown) => warnings.push(String(value));
  try {
    const error = new ApiError({ status: 400, message: JSON.stringify({ error: { details: [{ reason: 'API_KEY_REVOKED', metadata: { candidate: 'must not appear' } }] } }) });
    logGeminiFailure(classifyGeminiError(error), 'discovery');
  } finally { console.warn = original; }
  assert.deepEqual(warnings, ['Gemini request failed: category=GEMINI_AUTH_INVALID status=400 reason=API_KEY_REVOKED phase=discovery']);
  assert.doesNotMatch(warnings.join('\n'), /candidate data/);
});

test('authenticated-only Gemini probe emits static minimal/search requests and safe errors', async () => {
  const { createGeminiProbeHandler, geminiProbePageHandler, isDevOrPreviewRuntime } = await import('../server');
  const environment = { NODE_ENV: process.env.NODE_ENV, VERCEL_ENV: process.env.VERCEL_ENV };
  try {
    Object.assign(process.env, { NODE_ENV: 'production', VERCEL_ENV: 'production' });
    assert.equal(isDevOrPreviewRuntime(), false);
    Object.assign(process.env, { NODE_ENV: 'development', VERCEL_ENV: 'production' });
    assert.equal(isDevOrPreviewRuntime(), false);
    Object.assign(process.env, { NODE_ENV: 'production', VERCEL_ENV: 'preview' });
    assert.equal(isDevOrPreviewRuntime(), true);
    delete process.env.VERCEL_ENV;
    process.env.NODE_ENV = 'production';
    assert.equal(isDevOrPreviewRuntime(), false);
    process.env.NODE_ENV = 'development';
    assert.equal(isDevOrPreviewRuntime(), true);
  } finally {
    if (environment.NODE_ENV === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = environment.NODE_ENV;
    if (environment.VERCEL_ENV === undefined) delete process.env.VERCEL_ENV; else process.env.VERCEL_ENV = environment.VERCEL_ENV;
  }
  const requests: any[] = [];
  const ai = { models: { generateContent: async (params: any) => { requests.push(params); return { text: 'OK' }; } } } as any;
  const app = express();
  app.use(express.json());
  app.get('/api/internal/gemini-probe', geminiProbePageHandler);
  app.post('/api/internal/gemini-probe', createGeminiProbeHandler(() => ai));
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server.once('listening', resolve));
  const url = `http://127.0.0.1:${(server.address() as any).port}/api/internal/gemini-probe`;
  try {
    const page = await fetch(url);
    assert.equal(page.status, 200);
    assert.match(page.headers.get('content-type') || '', /^text\/html/);
    const html = await page.text();
    assert.match(html, /Static Preview-only probes/);
    assert.doesNotMatch(html, /candidateProfile|existingJobs|evidenceItems/);
    for (const mode of ['minimal', 'search']) {
      const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mode }) });
      assert.equal(response.status, 200);
      assert.deepEqual(await response.json(), { ok: true });
    }
    assert.equal(requests.length, 2);
    assert.deepEqual(requests[0], { model: 'gemini-3.8-flash', contents: [{ text: 'Return the word OK.' }], config: undefined });
    assert.deepEqual(requests[1], { model: 'gemini-3.8-flash', contents: [{ text: 'Return the word OK.' }], config: { tools: [{ googleSearch: {} }] } });
    const rejected = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mode: 'minimal', candidateData: 'must not reach Gemini' }) });
    assert.equal(rejected.status, 400);
    assert.deepEqual(await rejected.json(), { error: 'Invalid Gemini diagnostic probe.' });
    assert.equal(requests.length, 2);

    const providerError = new ApiError({ status: 403, message: 'raw provider response must not reach browser' });
    const errorApp = express(); errorApp.use(express.json());
    errorApp.post('/probe', createGeminiProbeHandler(() => ({ models: { generateContent: async () => { throw providerError; } } } as any)));
    const errorServer = errorApp.listen(0, '127.0.0.1'); await new Promise<void>(resolve => errorServer.once('listening', resolve));
    try {
      const warnings: string[] = [], original = console.warn;
      console.warn = (value: unknown) => warnings.push(String(value));
      try {
        for (const mode of ['minimal', 'search']) {
          const response = await fetch(`http://127.0.0.1:${(errorServer.address() as any).port}/probe`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mode }) });
          assert.equal(response.status, 502);
          assert.deepEqual(await response.json(), { error: 'Gemini permission was denied.', code: 'GEMINI_PERMISSION_DENIED' });
        }
      } finally { console.warn = original; }
      assert.deepEqual(warnings, [
        'Gemini request failed: category=GEMINI_PERMISSION_DENIED status=403 phase=probe-minimal',
        'Gemini request failed: category=GEMINI_PERMISSION_DENIED status=403 phase=probe-search'
      ]);
    } finally { errorServer.closeAllConnections(); await new Promise<void>(resolve => errorServer.close(() => resolve())); }
  } finally { server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())); }
});
