import { LlmProviderFailure } from './llmProvider.js';
import { ProviderBudgetExceeded, ProviderBudgetUnavailable } from './providerBudget.js';

export function safeProviderError(error: unknown): { status: number; body: { error: string; code: string } } | undefined {
  if (error instanceof ProviderBudgetExceeded) return { status: 429, body: { error: 'AI operation budget exceeded; retry after the current window', code: 'PROVIDER_BUDGET_EXCEEDED' } };
  if (error instanceof ProviderBudgetUnavailable) return { status: 503, body: { error: 'AI operation budget is temporarily unavailable; retry later', code: 'PROVIDER_UNAVAILABLE' } };
  if (error instanceof LlmProviderFailure) {
    const status = error.code === 'OLLAMA_TIMEOUT' ? 504 : error.code === 'OLLAMA_INVALID_OUTPUT' ? 502 : 503;
    return { status, body: { error: error.message, code: error.code } };
  }
  return undefined;
}
