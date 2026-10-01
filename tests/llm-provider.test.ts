import test from 'node:test';
import assert from 'node:assert/strict';
import { z } from 'zod';
import { createStructuredModel, LlmProviderFailure, ollamaModel, selectedLlmProvider } from '../server/llmProvider';
import { safeProviderError } from '../server/providerErrors';
import { ProviderBudgetExceeded, ProviderBudgetUnavailable } from '../server/providerBudget';

const schema = z.object({ answer: z.string().max(20) }).strict();
const req = { res: { locals: { ownerId: 'synthetic-owner' } } } as any;
const env = { LLM_PROVIDER: 'ollama', OLLAMA_MODEL: 'synthetic-local-model' } as NodeJS.ProcessEnv;

test('explicit Ollama uses fixed loopback generate request, schema output, and one AI reservation', async () => {
  let calls = 0, reserved = 0, request: any;
  const model = createStructuredModel(req, {
    environment: env,
    reserveAiCall: async owner => { reserved++; assert.equal(owner, 'synthetic-owner'); },
    geminiClient: () => { throw new Error('Gemini fallback must not occur'); },
    fetchImpl: async (url, init) => {
      calls++; request = { url, init };
      return new Response(JSON.stringify({ response: JSON.stringify({ answer: 'grounded' }) }), { status: 200, headers: { 'content-type': 'application/json' } });
    }
  });
  assert.deepEqual(await model(schema, 'system instruction', { safe: 'input' }), { answer: 'grounded' });
  assert.equal(calls, 1); assert.equal(reserved, 1);
  assert.equal(request.url, 'http://127.0.0.1:11434/api/generate');
  assert.equal(request.init.method, 'POST'); assert.equal(request.init.redirect, 'error');
  const body = JSON.parse(request.init.body);
  assert.deepEqual(body, { model: 'synthetic-local-model', system: 'system instruction', prompt: '{"safe":"input"}', format: body.format, stream: false, options: { temperature: 0 } });
  assert.equal(body.format.type, 'object'); assert.equal(body.format.properties.answer.type, 'string');
});

for (const [name, response, code] of [
  ['schema-invalid output', async () => new Response(JSON.stringify({ response: JSON.stringify({ answer: 5 }) }), { status: 200 }), 'OLLAMA_INVALID_OUTPUT'],
  ['malformed output', async () => new Response('{not-json', { status: 200 }), 'OLLAMA_INVALID_OUTPUT'],
  ['missing model', async () => new Response('private upstream body', { status: 404 }), 'OLLAMA_MODEL_NOT_FOUND'],
  ['connection refusal', async () => { throw Object.assign(new Error('private connection detail'), { cause: { code: 'ECONNREFUSED' } }); }, 'OLLAMA_UNAVAILABLE'],
  ['timeout', async () => { throw new DOMException('private timeout detail', 'AbortError'); }, 'OLLAMA_TIMEOUT']
] as const) {
  test(`Ollama ${name} is safe, classified, and never falls back`, async () => {
    let reserved = 0;
    const model = createStructuredModel(req, {
      environment: env, reserveAiCall: async () => { reserved++; },
      geminiClient: () => { throw new Error('Gemini fallback must not occur'); }, fetchImpl: response as any
    });
    await assert.rejects(model(schema, 'private system prompt', { private: 'payload' }), (error: unknown) => {
      assert.ok(error instanceof LlmProviderFailure); assert.equal(error.code, code);
      assert.doesNotMatch(error.message, /private|payload|upstream|connection detail|timeout detail/i);
      return true;
    });
    assert.equal(reserved, 1);
  });
}

test('provider selection defaults to Gemini and local model default stays in configuration boundary', () => {
  assert.equal(selectedLlmProvider({} as NodeJS.ProcessEnv), 'gemini');
  assert.equal(selectedLlmProvider({ LLM_PROVIDER: 'OLLAMA' } as NodeJS.ProcessEnv), 'ollama');
  assert.equal(ollamaModel({} as NodeJS.ProcessEnv), 'qwen3:14b');
});

test('Ollama reader abort is classified as a timeout without response diagnostics', async () => {
  const stream = new ReadableStream<Uint8Array>({ start(controller) { controller.error(new DOMException('private body detail', 'AbortError')); } });
  const model = createStructuredModel(req, { environment: env, reserveAiCall: async () => {}, fetchImpl: async () => new Response(stream, { status: 200 }) });
  await assert.rejects(model(schema, 'private', { private: 'payload' }), (error: unknown) => error instanceof LlmProviderFailure && error.code === 'OLLAMA_TIMEOUT' && !/private|payload/i.test(error.message));
});

test('safe structured provider mapper exposes only approved codes and messages', () => {
  assert.deepEqual(safeProviderError(new LlmProviderFailure('OLLAMA_INVALID_OUTPUT', 'Local model returned invalid structured output.')), {status:502,body:{error:'Local model returned invalid structured output.',code:'OLLAMA_INVALID_OUTPUT'}});
  assert.deepEqual(safeProviderError(new ProviderBudgetExceeded('private')), {status:429,body:{error:'AI operation budget exceeded; retry after the current window',code:'PROVIDER_BUDGET_EXCEEDED'}});
  assert.deepEqual(safeProviderError(new ProviderBudgetUnavailable('private')), {status:503,body:{error:'AI operation budget is temporarily unavailable; retry later',code:'PROVIDER_UNAVAILABLE'}});
});
