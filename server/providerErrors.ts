import { LlmProviderFailure } from './llmProvider.js';
import { ProviderBudgetExceeded, ProviderBudgetUnavailable } from './providerBudget.js';

export function safeProviderError(error: unknown): { status: number; body: { error: string; code: string } } | undefined {
  if (error instanceof ProviderBudgetExceeded) return { status: 429, body: { error: 'AI operation budget exceeded; retry after the current window', code: 'PROVIDER_BUDGET_EXCEEDED' } };
  if (error instanceof ProviderBudgetUnavailable) return { status: 503, body: { error: 'AI operation budget is temporarily unavailable; retry later', code: 'PROVIDER_UNAVAILABLE' } };
  if (error instanceof LlmProviderFailure) {
    const status = error.code === 'OLLAMA_TIMEOUT' || error.code === 'AI_TIMEOUT' ? 504
      : error.code === 'AI_RATE_LIMITED' ? 429
      : error.code === 'AI_UNAVAILABLE' || error.code === 'OLLAMA_UNAVAILABLE' ? 503
      : 502;
    return { status, body: { error: error.message, code: error.code } };
  }
  return undefined;
}
