import type { Request } from 'express';
import { generateText, gateway, Output } from 'ai';
import { z } from 'zod';
import type { StructuredModel } from './assessment.js';
import { classifyAiGatewayError, type AiGatewayFailureCode } from './aiGatewayDiagnostics.js';

export type LlmProviderName = 'gateway' | 'ollama';
export type LlmProviderFailureCode =
  | AiGatewayFailureCode
  | 'OLLAMA_TIMEOUT'
  | 'OLLAMA_UNAVAILABLE'
  | 'OLLAMA_MODEL_NOT_FOUND'
  | 'OLLAMA_INVALID_OUTPUT';

export class LlmProviderFailure extends Error {
  constructor(readonly code: LlmProviderFailureCode, message: string) { super(message); }
}

export type StructuredOutputFailureCode = 'EMPTY_RESPONSE' | 'INVALID_JSON' | 'SCHEMA_INVALID';
/** Safe structural failure only. Never retain provider text or schema issues. */
export class StructuredOutputFailure extends Error {
  constructor(readonly code: StructuredOutputFailureCode) {
    super('Structured model output failed validation.');
  }
}

export interface LlmProviderDependencies {
  fetchImpl?: typeof fetch;
  reserveAiCall: (ownerId: string) => Promise<void>;
  gatewayGenerate?: (options: Record<string, unknown>) => Promise<{ output: unknown }>;
  environment?: NodeJS.ProcessEnv;
}

const OLLAMA_GENERATE_URL = 'http://127.0.0.1:11434/api/generate';
const MAX_OLLAMA_RESPONSE_BYTES = 1024 * 1024;

export function selectedLlmProvider(environment: NodeJS.ProcessEnv = process.env): LlmProviderName {
  const configured = (environment.AI_PROVIDER || environment.LLM_PROVIDER)?.trim().toLowerCase();
  return configured === 'ollama' ? 'ollama' : 'gateway';
}

const DEFAULT_GATEWAY_MODEL = 'anthropic/claude-haiku-4.5';
const GATEWAY_MODEL_PATTERN = /^[a-z0-9][a-z0-9._-]{0,79}\/[a-z0-9][a-z0-9._:-]{0,119}$/i;
export function gatewayModel(environment: NodeJS.ProcessEnv = process.env): string {
  const configured = environment.AI_GATEWAY_MODEL?.trim();
  if (!configured) return DEFAULT_GATEWAY_MODEL;
  if (!GATEWAY_MODEL_PATTERN.test(configured)) throw new LlmProviderFailure('AI_MODEL_NOT_FOUND', 'The configured AI Gateway model was not found.');
  return configured;
}

export function ollamaModel(environment: NodeJS.ProcessEnv = process.env): string {
  const configured = environment.OLLAMA_MODEL?.trim();
  return configured?.slice(0, 200) || 'qwen3:14b';
}

function jsonSchema(schema: z.ZodType) {
  const { ['$schema']: _dialect, ...result } = z.toJSONSchema(schema);
  return result;
}

async function boundedText(response: Response): Promise<string> {
  const reader = response.body?.getReader();
  if (!reader) throw new LlmProviderFailure('OLLAMA_INVALID_OUTPUT', 'Local model returned an empty response.');
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_OLLAMA_RESPONSE_BYTES) throw new LlmProviderFailure('OLLAMA_INVALID_OUTPUT', 'Local model returned an invalid response.');
      chunks.push(value);
    }
  } finally { await reader.cancel().catch(() => {}); }
  return Buffer.concat(chunks).toString('utf8');
}

function ollamaFailure(error: unknown): LlmProviderFailure {
  if (error instanceof LlmProviderFailure) return error;
  const name = error && typeof error === 'object' ? (error as { name?: unknown }).name : undefined;
  return name === 'AbortError' || name === 'TimeoutError'
    ? new LlmProviderFailure('OLLAMA_TIMEOUT', 'Local model request timed out; retry later.')
    : new LlmProviderFailure('OLLAMA_UNAVAILABLE', 'Local model could not be reached; retry later.');
}

async function ollamaStructured(
  schema: z.ZodType, system: string, data: unknown, model: string,
  fetchImpl: typeof fetch, reserveAiCall: () => Promise<void>
): Promise<unknown> {
  await reserveAiCall();
  let response: Response;
  try {
    response = await fetchImpl(OLLAMA_GENERATE_URL, {
      method: 'POST', redirect: 'error', signal: AbortSignal.timeout(30_000),
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ model, system, prompt: JSON.stringify(data), format: jsonSchema(schema), stream: false, options: { temperature: 0 } })
    });
  } catch (error) { throw ollamaFailure(error); }
  if (!response.ok) {
    await response.body?.cancel().catch(() => {});
    if (response.status === 404) throw new LlmProviderFailure('OLLAMA_MODEL_NOT_FOUND', 'Configured local model was not found.');
    throw new LlmProviderFailure('OLLAMA_UNAVAILABLE', 'Local model is temporarily unavailable; retry later.');
  }
  let parsed: unknown;
  try { parsed = JSON.parse(await boundedText(response)); }
  catch (error) {
    if (error instanceof LlmProviderFailure) throw error;
    const name = error && typeof error === 'object' ? (error as { name?: unknown }).name : undefined;
    if (name === 'AbortError' || name === 'TimeoutError') throw ollamaFailure(error);
    throw new LlmProviderFailure('OLLAMA_INVALID_OUTPUT', 'Local model returned invalid structured output.');
  }
  const text = parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? (parsed as { response?: unknown }).response : undefined;
  if (typeof text !== 'string' || text.length > MAX_OLLAMA_RESPONSE_BYTES) throw new LlmProviderFailure('OLLAMA_INVALID_OUTPUT', 'Local model returned invalid structured output.');
  try { return schema.parse(JSON.parse(text)); }
  catch { throw new LlmProviderFailure('OLLAMA_INVALID_OUTPUT', 'Local model returned invalid structured output.'); }
}

/** The sole structured-model selection point. No failure ever crosses providers. */
export function createStructuredModel(req: Request, dependencies: LlmProviderDependencies): StructuredModel {
  const environment = dependencies.environment || process.env;
  const ownerId = req.res!.locals.ownerId as string;
  if (selectedLlmProvider(environment) === 'ollama') {
    const fetchImpl = dependencies.fetchImpl || fetch;
    const model = ollamaModel(environment);
    return (schema, system, data) => ollamaStructured(schema, system, data, model, fetchImpl, () => dependencies.reserveAiCall(ownerId));
  }
  const model = gatewayModel(environment);
  const provider = model.split('/', 1)[0];
  const run = dependencies.gatewayGenerate || (generateText as unknown as (options: Record<string, unknown>) => Promise<{ output: unknown }>);
  return async (schema, system, data) => {
    await dependencies.reserveAiCall(ownerId);
    let output: unknown;
    try {
      const result = await run({
        model: gateway(model), system, prompt: JSON.stringify(data),
        output: Output.object({ schema }), temperature: 0, maxRetries: 0, timeout: 30_000,
        providerOptions: { gateway: { only: [provider], has: ['structured-output'] } },
      });
      output = result.output;
    } catch (error) {
      if (error instanceof LlmProviderFailure) throw error;
      const failure = classifyAiGatewayError(error);
      throw new LlmProviderFailure(failure.code, failure.message);
    }
    const parsed = schema.safeParse(output);
    if (!parsed.success) throw new LlmProviderFailure('AI_INVALID_OUTPUT', 'AI Gateway returned invalid structured output.');
    return parsed.data;
  };
}
