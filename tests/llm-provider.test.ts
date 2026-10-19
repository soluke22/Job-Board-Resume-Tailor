import test from 'node:test';
import assert from 'node:assert/strict';
import { z } from 'zod';
import { extractionSchema, semanticMatchesSchema } from '../src/types/assessment';
import { classifyAiGatewayError } from '../server/aiGatewayDiagnostics';
import { createStructuredModel, gatewayModel, LlmProviderFailure, ollamaModel, selectedLlmProvider } from '../server/llmProvider';
import { safeProviderError } from '../server/providerErrors';
import { ProviderBudgetExceeded, ProviderBudgetUnavailable } from '../server/providerBudget';

const schema = z.object({ answer: z.string().max(20) }).strict();
const req = { res: { locals: { ownerId: 'synthetic-owner' } } } as any;
const ollamaEnv = { AI_PROVIDER: 'ollama', OLLAMA_MODEL: 'synthetic-local-model' } as NodeJS.ProcessEnv;

test('deployed/default provider is Gateway and Ollama is explicit only', () => {
  assert.equal(selectedLlmProvider({} as NodeJS.ProcessEnv), 'gateway');
  assert.equal(selectedLlmProvider({ AI_PROVIDER: 'gateway' } as NodeJS.ProcessEnv), 'gateway');
  assert.equal(selectedLlmProvider({ AI_PROVIDER: 'gemini' } as NodeJS.ProcessEnv), 'gateway');
  assert.equal(selectedLlmProvider({ LLM_PROVIDER: 'OLLAMA' } as NodeJS.ProcessEnv), 'ollama');
  assert.equal(gatewayModel({} as NodeJS.ProcessEnv), 'anthropic/claude-haiku-4.5');
  assert.equal(gatewayModel({ AI_GATEWAY_MODEL: 'openai/gpt-5-mini' } as NodeJS.ProcessEnv), 'openai/gpt-5-mini');
  assert.equal(ollamaModel({} as NodeJS.ProcessEnv), 'qwen3:14b');
});

test('Gateway uses schema-constrained output with one reservation, zero retries, and no fallback', async () => {
  let calls = 0, reserved = 0, request: any;
  const model = createStructuredModel(req, {
    environment: { AI_PROVIDER: 'gateway', AI_GATEWAY_MODEL: 'anthropic/claude-haiku-4.5' } as NodeJS.ProcessEnv,
    reserveAiCall: async owner => { reserved++; assert.equal(owner, 'synthetic-owner'); },
    fetchImpl: async () => { throw new Error('Ollama fallback must not occur'); },
    gatewayGenerate: async options => { calls++; request = options; return { output: { answer: 'grounded' } }; },
  });
  assert.deepEqual(await model(schema, 'system instruction', { safe: 'input' }), { answer: 'grounded' });
  assert.equal(calls, 1);
  assert.equal(reserved, 1);
  assert.equal(request.model.modelId, 'anthropic/claude-haiku-4.5');
  assert.equal(request.system, 'system instruction');
  assert.equal(request.prompt, '{"safe":"input"}');
  assert.equal(request.temperature, 0);
  assert.equal(request.maxRetries, 0);
  assert.equal(request.timeout, 30_000);
  assert.deepEqual(request.providerOptions, { gateway: { only: ['anthropic'], has: ['structured-output'] } });
  assert.ok(request.output, 'AI SDK structured Output.object configuration is supplied');
});

test('Gateway accepts strict extraction and semantic schemas', async () => {
  const extraction = {
    roleFamily: 'frontend-heavy-fullstack', modifiers: ['B2B_SAAS'], facts: [],
    requirements: [{ kind: 'hard', excerpt: 'Build accessible React applications', centrality: 'core', centralityExcerpt: 'Build accessible React applications' }],
  };
  const semantic = { matches: [{ requirementId: 'r1', strength: 'Strong', relationship: 'direct', evidenceIds: ['e1'] }] };
  const outputs = [extraction, semantic];
  let calls = 0, reserved = 0;
  const model = createStructuredModel(req, {
    environment: {} as NodeJS.ProcessEnv,
    reserveAiCall: async () => { reserved++; },
    gatewayGenerate: async () => ({ output: outputs[calls++] }),
  });
  assert.deepEqual(await model(extractionSchema, 'extract', { jd: 'synthetic' }), extraction);
  assert.deepEqual(await model(semanticMatchesSchema, 'match', { evidence: [] }), semantic);
  assert.equal(calls, 2);
  assert.equal(reserved, 2);
});

for (const [name, output] of [
  ['schema-invalid', { answer: 5, private: 'raw output' }],
  ['empty', undefined],
  ['malformed', '{private malformed output'],
] as const) {
  test(`Gateway ${name} output fails closed without output disclosure`, async () => {
    let calls = 0, reserved = 0;
    const model = createStructuredModel(req, {
      environment: {} as NodeJS.ProcessEnv,
      reserveAiCall: async () => { reserved++; },
      gatewayGenerate: async () => { calls++; return { output }; },
    });
    await assert.rejects(model(schema, 'private prompt', { private: 'payload' }), (error: unknown) => {
      assert.ok(error instanceof LlmProviderFailure);
      assert.equal(error.code, 'AI_INVALID_OUTPUT');
      assert.doesNotMatch(error.message, /private|payload|raw output|malformed/i);
      return true;
    });
    assert.equal(calls, 1, 'no automatic retry');
    assert.equal(reserved, 1, 'one reservation for the one attempted request');
  });
}

for (const [name, error, code] of [
  ['auth', { statusCode: 401, message: 'private auth body' }, 'AI_AUTH_INVALID'],
  ['request', { statusCode: 422, message: 'private request body' }, 'AI_REQUEST_INVALID'],
  ['model not found', { statusCode: 404, message: 'private model body' }, 'AI_MODEL_NOT_FOUND'],
  ['rate limit', { statusCode: 429, message: 'private rate body' }, 'AI_RATE_LIMITED'],
  ['timeout', new DOMException('private timeout body', 'TimeoutError'), 'AI_TIMEOUT'],
  ['unavailable', { statusCode: 503, message: 'private outage body' }, 'AI_UNAVAILABLE'],
  ['unknown', new Error('private unknown body'), 'AI_UNKNOWN'],
] as const) {
  test(`Gateway ${name} failure is safe and performs no retry or fallback`, async () => {
    let calls = 0, reserved = 0;
    const model = createStructuredModel(req, {
      environment: {} as NodeJS.ProcessEnv,
      reserveAiCall: async () => { reserved++; },
      fetchImpl: async () => { throw new Error('Ollama fallback must not occur'); },
      gatewayGenerate: async () => { calls++; throw error; },
    });
    await assert.rejects(model(schema, 'private prompt', { private: 'payload' }), (failure: unknown) => {
      assert.ok(failure instanceof LlmProviderFailure);
      assert.equal(failure.code, code);
      assert.doesNotMatch(failure.message, /private|payload|body/i);
      const safe = safeProviderError(failure);
      assert.ok(safe);
      assert.doesNotMatch(JSON.stringify(safe), /private|payload/i);
      return true;
    });
    assert.equal(calls, 1);
    assert.equal(reserved, 1);
  });
}

test('Gateway diagnostics use finite structural classification only', () => {
  assert.equal(classifyAiGatewayError({ statusCode: 402, message: 'private' }).code, 'AI_PAYMENT_REQUIRED');
  assert.equal(classifyAiGatewayError({ cause: { code: 'ECONNREFUSED' }, message: 'private' }).code, 'AI_UNAVAILABLE');
  assert.equal(classifyAiGatewayError({ cause: { code: 'ETIMEDOUT' }, message: 'private' }).code, 'AI_TIMEOUT');
  assert.equal(classifyAiGatewayError({ cause: { code: 'UNTRUSTED_PRIVATE_CODE' }, message: 'private' }).code, 'AI_UNKNOWN');
});

test('explicit Ollama uses fixed loopback generate request, schema output, and one AI reservation', async () => {
  let calls = 0, reserved = 0, request: any;
  const model = createStructuredModel(req, {
    environment: ollamaEnv,
    reserveAiCall: async owner => { reserved++; assert.equal(owner, 'synthetic-owner'); },
    gatewayGenerate: async () => { throw new Error('Gateway fallback must not occur'); },
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
      environment: ollamaEnv, reserveAiCall: async () => { reserved++; },
      gatewayGenerate: async () => { throw new Error('Gateway fallback must not occur'); }, fetchImpl: response as any
    });
    await assert.rejects(model(schema, 'private system prompt', { private: 'payload' }), (error: unknown) => {
      assert.ok(error instanceof LlmProviderFailure); assert.equal(error.code, code);
      assert.doesNotMatch(error.message, /private|payload|upstream|connection detail|timeout detail/i);
      return true;
    });
    assert.equal(reserved, 1);
  });
}

test('Ollama reader abort is classified as a timeout without response diagnostics', async () => {
  const stream = new ReadableStream<Uint8Array>({ start(controller) { controller.error(new DOMException('private body detail', 'AbortError')); } });
  const model = createStructuredModel(req, { environment: ollamaEnv, reserveAiCall: async () => {}, fetchImpl: async () => new Response(stream, { status: 200 }) });
  await assert.rejects(model(schema, 'private', { private: 'payload' }), (error: unknown) => error instanceof LlmProviderFailure && error.code === 'OLLAMA_TIMEOUT' && !/private|payload/i.test(error.message));
});

test('safe provider mapper exposes only approved codes and messages', () => {
  assert.deepEqual(safeProviderError(new LlmProviderFailure('AI_INVALID_OUTPUT', 'AI Gateway returned invalid structured output.')), {status:502,body:{error:'AI Gateway returned invalid structured output.',code:'AI_INVALID_OUTPUT'}});
  assert.deepEqual(safeProviderError(new LlmProviderFailure('AI_RATE_LIMITED', 'AI Gateway is rate limited; retry later.')), {status:429,body:{error:'AI Gateway is rate limited; retry later.',code:'AI_RATE_LIMITED'}});
  assert.deepEqual(safeProviderError(new ProviderBudgetExceeded('private')), {status:429,body:{error:'AI operation budget exceeded; retry after the current window',code:'PROVIDER_BUDGET_EXCEEDED'}});
  assert.deepEqual(safeProviderError(new ProviderBudgetUnavailable('private')), {status:503,body:{error:'AI operation budget is temporarily unavailable; retry later',code:'PROVIDER_UNAVAILABLE'}});
});
