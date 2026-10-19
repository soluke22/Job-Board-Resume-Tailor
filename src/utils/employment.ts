import type { CanonicalEmploymentType } from '../types/index.js';

const token = (value: unknown) => typeof value === 'string'
  ? value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '')
  : '';

/**
 * Canonicalize only provider representations with unambiguous employment meaning.
 * Missing and unfamiliar values stay unknown; they are never promoted to full-time.
 */
export function normalizeEmploymentType(value: unknown): CanonicalEmploymentType {
  switch (token(value)) {
    case 'fulltime':
    case 'regular':
    case 'permanent':
      return 'full-time';
    case 'parttime':
      return 'part-time';
    case 'contract':
    case 'contractor':
    case 'freelance':
      return 'contract';
    case 'intern':
    case 'internship':
      return 'internship';
    case 'temporary':
    case 'temp':
    case 'fixedterm':
      return 'temporary';
    default:
      return 'unknown';
  }
}

/** Read only explicitly named provider fields, never arbitrary metadata prose. */
export function providerMetadataValues(metadata: unknown, names: readonly string[]): unknown[] {
  if (!Array.isArray(metadata)) return [];
  const accepted = new Set(names.map(token));
  return metadata.filter(field => field && typeof field === 'object' && accepted.has(token(field.name)))
    .flatMap(field => Array.isArray(field.value) ? field.value : [field.value]);
}

export function normalizeProviderEmploymentType(value: unknown, metadata?: unknown): CanonicalEmploymentType {
  const types = new Set([value, ...providerMetadataValues(metadata, ['employment type', 'job type', 'commitment'])]
    .map(normalizeEmploymentType).filter(type => type !== 'unknown'));
  // An explicit internship cannot be hidden behind a generic FullTime label.
  if (types.has('internship')) return 'internship';
  return types.size === 1 ? [...types][0] : 'unknown';
}

export function employmentTypeAllowed(
  providerValue: unknown,
  allowedValues: readonly string[] = [],
  excludedValues: readonly string[] = []
): { eligible: boolean; employmentType: CanonicalEmploymentType; reason?: 'EMPLOYMENT_EXCLUDED' | 'EMPLOYMENT_NOT_ALLOWED' } {
  const employmentType = normalizeEmploymentType(providerValue);
  if (employmentType === 'unknown') return { eligible: true, employmentType };
  const excluded = new Set(excludedValues.map(normalizeEmploymentType).filter(value => value !== 'unknown'));
  if (excluded.has(employmentType)) return { eligible: false, employmentType, reason: 'EMPLOYMENT_EXCLUDED' };
  const allowed = new Set(allowedValues.map(normalizeEmploymentType).filter(value => value !== 'unknown'));
  if (allowed.size && !allowed.has(employmentType)) return { eligible: false, employmentType, reason: 'EMPLOYMENT_NOT_ALLOWED' };
  return { eligible: true, employmentType };
}
