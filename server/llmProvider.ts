import type { Request } from 'express';
import { GoogleGenAI, ThinkingLevel } from '@google/genai';
import { z } from 'zod';
import type { StructuredModel } from './assessment.js';

export type LlmProviderName = 'gemini' | 'ollama';
export type LlmProviderFailureCode =
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
  geminiClient?: (apiKey: string) => GoogleGenAI;
  environment?: NodeJS.ProcessEnv;
}

const OLLAMA_GENERATE_URL = 'http://127.0.0.1:11434/api/generate';
const MAX_OLLAMA_RESPONSE_BYTES = 1024 * 1024;

export function selectedLlmProvider(environment: NodeJS.ProcessEnv = process.env): LlmProviderName {
  return environment.LLM_PROVIDER?.trim().toLowerCase() === 'ollama' ? 'ollama' : 'gemini';
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
  const apiKey = environment.GEMINI_API_KEY;
  if (!apiKey) return async () => { throw new Error('Gemini is not configured; no structured output produced.'); };
  const client = (dependencies.geminiClient || (key => new GoogleGenAI({ apiKey: key, httpOptions: { headers: { 'User-Agent': 'aistudio-build' } } })))(apiKey);
  return async (schema, system, data) => {
    await dependencies.reserveAiCall(ownerId);
    const response = await client.models.generateContent({ model: 'gemini-3.8-flash', contents: JSON.stringify(data), config: { systemInstruction: system, responseMimeType: 'application/json', responseJsonSchema: jsonSchema(schema), thinkingConfig: { thinkingLevel: ThinkingLevel.MEDIUM }, httpOptions: { timeout: 30_000 } } });
    const text = response.text;
    if (!text) throw new StructuredOutputFailure('EMPTY_RESPONSE');
    let decoded: unknown;
    try { decoded = JSON.parse(text); }
    catch { throw new StructuredOutputFailure('INVALID_JSON'); }
    const parsed = schema.safeParse(decoded);
    if (!parsed.success) throw new StructuredOutputFailure('SCHEMA_INVALID');
    return parsed.data;
  };
}

/** Cover letters are legacy Gemini-only. Explicit local mode must never fall back. */
export function legacyGeminiClient(environment: NodeJS.ProcessEnv = process.env): GoogleGenAI | null {
  if (selectedLlmProvider(environment) === 'ollama') return null;
  const apiKey = environment.GEMINI_API_KEY;
  return apiKey ? new GoogleGenAI({ apiKey, httpOptions: { headers: { 'User-Agent': 'aistudio-build' } } }) : null;
}
