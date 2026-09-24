export type GeminiFailureCode =
  | 'GEMINI_AUTH_INVALID'
  | 'GEMINI_PERMISSION_DENIED'
  | 'GEMINI_REQUEST_INVALID'
  | 'GEMINI_MODEL_NOT_FOUND'
  | 'GEMINI_PAYMENT_REQUIRED'
  | 'GEMINI_RATE_LIMITED'
  | 'GEMINI_UNAVAILABLE'
  | 'GEMINI_TIMEOUT'
  | 'GEMINI_NETWORK_ERROR'
  | 'GEMINI_UNKNOWN';

export interface GeminiFailure {
  code: GeminiFailureCode;
  status?: number;
  httpStatus: number;
  message: string;
  reason?: string;
}

const API_KEY_REASONS = new Set([
  'API_KEY_INVALID', 'API_KEY_EXPIRED', 'API_KEY_REVOKED', 'API_KEY_BLOCKED',
  'API_KEY_SERVICE_BLOCKED', 'API_KEY_IP_ADDRESS_BLOCKED', 'API_KEY_HTTP_REFERRER_BLOCKED'
]);
const TIMEOUT_CODES = new Set(['ETIMEDOUT', 'ECONNABORTED', 'UND_ERR_CONNECT_TIMEOUT', 'UND_ERR_HEADERS_TIMEOUT', 'UND_ERR_BODY_TIMEOUT']);
const NETWORK_CODES = new Set(['ENOTFOUND', 'EAI_AGAIN', 'ECONNREFUSED', 'ECONNRESET', 'EHOSTUNREACH', 'ENETUNREACH', 'EPIPE', 'UND_ERR_SOCKET']);

function numericStatus(error: unknown): number | undefined {
  if (!error || typeof error !== 'object') return undefined;
  const status = (error as { status?: unknown }).status;
  return typeof status === 'number' && Number.isInteger(status) && status >= 100 && status <= 599 ? status : undefined;
}

function errorName(error: unknown): string | undefined {
  if (!error || typeof error !== 'object') return undefined;
  const name = (error as { name?: unknown }).name;
  return typeof name === 'string' && name.length <= 80 ? name : undefined;
}

function approvedApiKeyReason(error: unknown, status: number | undefined): string | undefined {
  if (status !== 400 || !error || typeof error !== 'object') return undefined;
  const message = (error as { message?: unknown }).message;
  if (typeof message !== 'string' || message.length > 32_768) return undefined;
  try {
    const parsed: unknown = JSON.parse(message);
    const details = parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as { error?: { details?: unknown } }).error?.details : undefined;
    if (!Array.isArray(details)) return undefined;
    for (const detail of details) {
      const reason = detail && typeof detail === 'object' && !Array.isArray(detail)
        ? (detail as { reason?: unknown }).reason : undefined;
      if (typeof reason === 'string' && API_KEY_REASONS.has(reason)) return reason;
    }
  } catch { /* The SDK can carry non-JSON text; it is never logged or returned. */ }
  return undefined;
}

function approvedCauseCode(error: unknown): string | undefined {
  if (!error || typeof error !== 'object') return undefined;
  const cause = (error as { cause?: unknown }).cause;
  const code = cause && typeof cause === 'object' ? (cause as { code?: unknown }).code : undefined;
  return typeof code === 'string' && (TIMEOUT_CODES.has(code) || NETWORK_CODES.has(code)) ? code : undefined;
}

export function classifyGeminiError(error: unknown): GeminiFailure {
  const status = numericStatus(error);
  const apiKeyReason = approvedApiKeyReason(error, status);
  if (apiKeyReason) return { code: 'GEMINI_AUTH_INVALID', status, httpStatus: 502, message: 'Gemini authentication was rejected.', reason: apiKeyReason };
  switch (status) {
    case 400: return { code: 'GEMINI_REQUEST_INVALID', status, httpStatus: 502, message: 'Gemini rejected this request.' };
    case 401: return { code: 'GEMINI_AUTH_INVALID', status, httpStatus: 502, message: 'Gemini authentication was rejected.' };
    case 402: return { code: 'GEMINI_PAYMENT_REQUIRED', status, httpStatus: 502, message: 'Gemini billing is required for this request.' };
    case 403: return { code: 'GEMINI_PERMISSION_DENIED', status, httpStatus: 502, message: 'Gemini permission was denied.' };
    case 404: return { code: 'GEMINI_MODEL_NOT_FOUND', status, httpStatus: 502, message: 'The configured Gemini model was not found.' };
    case 429: return { code: 'GEMINI_RATE_LIMITED', status, httpStatus: 429, message: 'Gemini is rate limited; retry later.' };
  }
  if (status !== undefined && status >= 500) return { code: 'GEMINI_UNAVAILABLE', status, httpStatus: 503, message: 'Gemini is temporarily unavailable; retry later.' };

  const name = errorName(error);
  if (name === 'RequestTimeoutError' || name === 'TimeoutError' || name === 'AbortError') {
    return { code: 'GEMINI_TIMEOUT', httpStatus: 504, message: 'Gemini request timed out; retry later.' };
  }
  const causeCode = approvedCauseCode(error);
  if (causeCode && TIMEOUT_CODES.has(causeCode)) {
    return { code: 'GEMINI_TIMEOUT', httpStatus: 504, message: 'Gemini request timed out; retry later.', reason: causeCode };
  }
  if (causeCode && NETWORK_CODES.has(causeCode)) {
    return { code: 'GEMINI_NETWORK_ERROR', httpStatus: 503, message: 'Gemini could not be reached; retry later.', reason: causeCode };
  }
  if (name === 'ConnectionError' || name === 'FetchError') {
    return { code: 'GEMINI_NETWORK_ERROR', httpStatus: 503, message: 'Gemini could not be reached; retry later.' };
  }
  return { code: 'GEMINI_UNKNOWN', status, httpStatus: 502, message: 'Gemini request failed; retry later.' };
}
