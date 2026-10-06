import { APICallError, NoObjectGeneratedError, NoOutputGeneratedError } from 'ai';

export type AiGatewayFailureCode =
  | 'AI_AUTH_INVALID'
  | 'AI_REQUEST_INVALID'
  | 'AI_MODEL_NOT_FOUND'
  | 'AI_PAYMENT_REQUIRED'
  | 'AI_RATE_LIMITED'
  | 'AI_TIMEOUT'
  | 'AI_UNAVAILABLE'
  | 'AI_INVALID_OUTPUT'
  | 'AI_UNKNOWN';

export interface AiGatewayFailure {
  code: AiGatewayFailureCode;
  httpStatus: number;
  message: string;
}

const TIMEOUT_CODES = new Set(['ETIMEDOUT', 'ECONNABORTED', 'UND_ERR_CONNECT_TIMEOUT', 'UND_ERR_HEADERS_TIMEOUT', 'UND_ERR_BODY_TIMEOUT']);
const NETWORK_CODES = new Set(['ENOTFOUND', 'EAI_AGAIN', 'ECONNREFUSED', 'ECONNRESET', 'EHOSTUNREACH', 'ENETUNREACH', 'EPIPE', 'UND_ERR_SOCKET']);

function statusCode(error: unknown): number | undefined {
  const value = APICallError.isInstance(error)
    ? error.statusCode
    : error && typeof error === 'object' ? (error as { statusCode?: unknown }).statusCode : undefined;
  return typeof value === 'number' && Number.isInteger(value) && value >= 100 && value <= 599 ? value : undefined;
}

function errorName(error: unknown): string | undefined {
  const value = error && typeof error === 'object' ? (error as { name?: unknown }).name : undefined;
  return typeof value === 'string' && value.length <= 80 ? value : undefined;
}

function causeCode(error: unknown): string | undefined {
  const cause = error && typeof error === 'object' ? (error as { cause?: unknown }).cause : undefined;
  const value = cause && typeof cause === 'object' ? (cause as { code?: unknown }).code : undefined;
  return typeof value === 'string' && (TIMEOUT_CODES.has(value) || NETWORK_CODES.has(value)) ? value : undefined;
}

/** Finite structural classification only. Never retain or return provider content. */
export function classifyAiGatewayError(error: unknown): AiGatewayFailure {
  if (NoObjectGeneratedError.isInstance(error) || NoOutputGeneratedError.isInstance(error)) {
    return { code: 'AI_INVALID_OUTPUT', httpStatus: 502, message: 'AI Gateway returned invalid structured output.' };
  }
  const status = statusCode(error);
  if (status === 400 || status === 422) return { code: 'AI_REQUEST_INVALID', httpStatus: 502, message: 'AI Gateway rejected this request.' };
  if (status === 401 || status === 403) return { code: 'AI_AUTH_INVALID', httpStatus: 502, message: 'AI Gateway authentication was rejected.' };
  if (status === 402) return { code: 'AI_PAYMENT_REQUIRED', httpStatus: 502, message: 'AI Gateway billing is required for this request.' };
  if (status === 404) return { code: 'AI_MODEL_NOT_FOUND', httpStatus: 502, message: 'The configured AI Gateway model was not found.' };
  if (status === 408) return { code: 'AI_TIMEOUT', httpStatus: 504, message: 'AI Gateway request timed out; retry later.' };
  if (status === 429) return { code: 'AI_RATE_LIMITED', httpStatus: 429, message: 'AI Gateway is rate limited; retry later.' };
  if (status !== undefined && status >= 500) return { code: 'AI_UNAVAILABLE', httpStatus: 503, message: 'AI Gateway is temporarily unavailable; retry later.' };

  const name = errorName(error);
  const code = causeCode(error);
  if (name === 'AbortError' || name === 'TimeoutError' || code && TIMEOUT_CODES.has(code)) {
    return { code: 'AI_TIMEOUT', httpStatus: 504, message: 'AI Gateway request timed out; retry later.' };
  }
  if (code && NETWORK_CODES.has(code)) {
    return { code: 'AI_UNAVAILABLE', httpStatus: 503, message: 'AI Gateway is temporarily unavailable; retry later.' };
  }
  return { code: 'AI_UNKNOWN', httpStatus: 502, message: 'AI Gateway request failed; retry later.' };
}
