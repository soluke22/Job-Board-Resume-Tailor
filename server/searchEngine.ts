import type { FreshnessBand } from '../src/types';

export function calculateFreshnessBand(
  publishedAt?: string,
  firstSeenAt?: string
): FreshnessBand {
  if (!publishedAt || !Number.isFinite(Date.parse(publishedAt)) || Date.parse(publishedAt) > Date.now()) return 'UNKNOWN';
  const referenceDate = new Date(publishedAt);
  const diffDays = Math.max(0, Math.floor((Date.now() - referenceDate.getTime()) / (1000 * 60 * 60 * 24)));

  if (diffDays <= 7) return 'NEW';
  if (diffDays <= 21) return 'RECENT';
  if (diffDays <= 45) return 'ESTABLISHED';
  return 'OLD';
}
