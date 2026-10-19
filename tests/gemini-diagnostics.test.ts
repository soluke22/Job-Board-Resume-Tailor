import test from 'node:test';
import assert from 'node:assert/strict';
import { ApiError } from '@google/genai';
import { classifyGeminiError } from '../server/geminiDiagnostics';

test('Gemini classifier keeps later AI failures safe and distinct from authentication', () => {
  const nestedCause = (code: string) => {
    const error: any = new TypeError('fetch failed');
    error.cause = Object.assign(new Error('private transport text'), { code });
    return error;
  };
  const cases: Array<[unknown, string, number]> = [
    [new ApiError({ status: 401, message: 'private provider text' }), 'GEMINI_AUTH_INVALID', 502],
    [new ApiError({ status: 429, message: 'private provider text' }), 'GEMINI_RATE_LIMITED', 429],
    [nestedCause('UND_ERR_HEADERS_TIMEOUT'), 'GEMINI_TIMEOUT', 504],
    [new Error('private provider text'), 'GEMINI_UNKNOWN', 502]
  ];
  for (const [error, code, status] of cases) {
    const failure = classifyGeminiError(error);
    assert.equal(failure.code, code); assert.equal(failure.httpStatus, status);
    assert.doesNotMatch(failure.message, /private provider text/);
  }
});
