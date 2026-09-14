import type { EvidenceItem } from '../types/index';

// Enabled and server review metadata do not change the meaning of a claim.
export const evidenceClaimFields = ['rawEvidence', 'employer', 'role', 'period', 'technologies',
  'responsibilities', 'outcomes', 'supportedVerbs', 'supportedMetrics', 'context',
  'sourceType', 'sourceLocation', 'source', 'notes', 'strength', 'roleFamilyRelevance'] as const;
export function evidenceReviewContent(item: EvidenceItem): string {
  return JSON.stringify(evidenceClaimFields.map(field => [field, item[field] ?? null]));
}
export function isEvidenceReviewed(item: EvidenceItem): boolean {
  return item.verificationStatus === 'verified' && item.requiresUserReview !== true;
}
export function evidenceReviewStatus(item: EvidenceItem): string {
  return !item.enabled ? 'Disabled' : isEvidenceReviewed(item) ? 'Verified' : 'Needs review';
}
export function unreviewedEvidence(item: EvidenceItem): EvidenceItem {
  const { lastVerifiedAt: _lastVerifiedAt, ...record } = item;
  return { ...record, verificationStatus: 'session-unreviewed', requiresUserReview: true };
}
export function preserveEvidenceReview(item: EvidenceItem, previous?: EvidenceItem): EvidenceItem {
  if (!previous) return unreviewedEvidence(item);
  if (evidenceReviewContent(item) !== evidenceReviewContent(previous)) {
    return { ...unreviewedEvidence(item), verificationStatus: 'requires-review' };
  }
  if (isEvidenceReviewed(previous) && (item.verificationStatus !== 'verified' || item.requiresUserReview === true)) {
    return { ...unreviewedEvidence(item), verificationStatus: item.verificationStatus === 'verified' ? 'requires-review' : item.verificationStatus };
  }
  return { ...item, verificationStatus: previous.verificationStatus,
    requiresUserReview: previous.requiresUserReview, lastVerifiedAt: previous.lastVerifiedAt };
}
