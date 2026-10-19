import { useEffect, useState } from 'react';
import type { ApplicationStatus, CompensationDetails, CompensationRange, JobRecord } from '../types';
import { currentFit, assessmentDisplay } from './assessmentView';
import { normalizedJobUrl, sameJob, supportedAtsIdentityKey } from './jobIdentity';

export type ShortlistWindow = 'daily' | 'recent' | 'unknown';
export type ShortlistDecision = 'pursue' | 'dismiss';
export const DAILY_SHORTLIST_LIMIT = 10;
const DAY = 24 * 60 * 60 * 1000;
const REVIEWABLE_STATUSES: ApplicationStatus[] = ['DISCOVERED', 'SHORTLISTED'];

export type ShortlistResult = {
  daily: JobRecord[];
  recent: JobRecord[];
  unknown: JobRecord[];
  counts: Record<ShortlistWindow, number>;
  available: number;
  verificationNeeded: number;
};

/** Keeps time-window labels current without fetching or changing workspace data. */
export function useShortlistClock(refreshMs = 60_000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const refresh = () => setNow(Date.now());
    const interval = window.setInterval(refresh, refreshMs);
    const onVisibility = () => { if (document.visibilityState === 'visible') refresh(); };
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [refreshMs]);
  return now;
}

export function formatScanStatus(scannedAt?: string | null, now = Date.now()) {
  const stamp = scannedAt ? Date.parse(scannedAt) : NaN;
  if (!Number.isFinite(stamp) || stamp > now) return 'Discovery has not been refreshed.';
  const actual = new Date(stamp).toLocaleString();
  const hours = Math.floor((now - stamp) / (60 * 60 * 1000));
  return hours >= 24 ? `Last discovery: ${actual} (${hours}h ago; results may be stale).` : `Last discovery: ${actual}.`;
}

const parseDate = (value?: string) => {
  if (!value) return undefined;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

export function shortlistIdentity(job: JobRecord): string {
  return supportedAtsIdentityKey(job) || normalizedJobUrl(job.canonicalUrl || job.applyUrl || job.sourceUrl) || `record:${job.id}`;
}

export function isReviewableForShortlist(job: JobRecord): boolean {
  const fit = currentFit(job);
  return REVIEWABLE_STATUSES.includes(job.applicationStatus) &&
    job.verificationStatus !== 'NOT_LISTED' && job.verificationStatus !== 'UNLISTED' &&
    fit?.applicationPriority !== 'SKIP' && fit?.verdict !== 'Skip';
}

function priority(job: JobRecord) {
  const fit = currentFit(job);
  if (!fit) return 0;
  return fit.applicationPriority === 'APPLY FIRST' ? 4
    : fit.applicationPriority === 'STRONG WITH GAP' ? 3
    : fit.applicationPriority === 'STRONG' ? 2
    : fit.applicationPriority === 'CALIBRATED STRETCH' ? 1 : 0;
}

export function compareShortlistJobs(a: JobRecord, b: JobRecord): number {
  const aFit = currentFit(a), bFit = currentFit(b);
  return priority(b) - priority(a)
    || (bFit?.qualificationFit ?? -1) - (aFit?.qualificationFit ?? -1)
    || (parseDate(b.publishedAt) ?? -1) - (parseDate(a.publishedAt) ?? -1)
    || shortlistIdentity(a).localeCompare(shortlistIdentity(b))
    || a.id.localeCompare(b.id);
}

function dedupe(jobs: JobRecord[]) {
  const unique: JobRecord[] = [];
  for (const job of [...jobs].sort(compareShortlistJobs)) {
    if (!unique.some(existing => sameJob(existing, job))) unique.push(job);
  }
  return unique;
}

export function selectDailyShortlist(jobs: JobRecord[], now = Date.now()): ShortlistResult {
  const base = dedupe(jobs.filter(isReviewableForShortlist));
  const lower = now - DAY;
  const daily: JobRecord[] = [], recent: JobRecord[] = [], unknown: JobRecord[] = [];
  for (const job of base) {
    const published = parseDate(job.publishedAt);
    if (published === undefined) unknown.push(job);
    else if (published > now) continue;
    else if (published >= lower) daily.push(job);
    else if (published >= now - 14 * DAY) recent.push(job);
  }
  const visible = [...daily, ...recent, ...unknown];
  return {
    daily: daily.slice(0, DAILY_SHORTLIST_LIMIT),
    recent: recent.slice(0, DAILY_SHORTLIST_LIMIT),
    unknown: unknown.slice(0, DAILY_SHORTLIST_LIMIT),
    counts: { daily: daily.length, recent: recent.length, unknown: unknown.length },
    available: visible.length,
    verificationNeeded: visible.filter(job => shortlistVerification(job).length > 0).length
  };
}

const humanAmount = (amount?: number) => amount === undefined ? undefined : amount.toLocaleString('en-US', { maximumFractionDigits: 4 });
export function formatCompensationRange(range: CompensationRange): string {
  const component = range.kind === 'unknown' ? 'Compensation' : range.kind[0].toUpperCase() + range.kind.slice(1);
  const amount = range.min !== undefined && range.max !== undefined
    ? range.min === range.max ? humanAmount(range.min) : `${humanAmount(range.min)}–${humanAmount(range.max)}`
    : range.min !== undefined ? `from ${humanAmount(range.min)}` : range.max !== undefined ? `up to ${humanAmount(range.max)}` : 'amount unavailable';
  const money = range.unit === 'percent' ? `${amount}%` : `${range.currency ? `${range.currency} ` : 'currency unknown '}${amount}`;
  return `${range.applicability ? `${range.applicability}: ` : ''}${component} ${money}${range.interval ? ` / ${range.interval}` : range.unit === 'percent' ? '' : ' · period unknown'}`;
}

export function compensationSummary(compensation?: CompensationDetails): { lines: string[]; uncertainty?: string } {
  if (!compensation || compensation.status === 'unavailable') return { lines: [], uncertainty: 'Compensation was not disclosed.' };
  if (compensation.ranges?.length) {
    const uncertainty = compensation.status === 'malformed' ? 'Compensation needs confirmation.'
      : compensation.status === 'ambiguous' || compensation.ranges.some(range => range.kind === 'unknown' || (range.unit !== 'percent' && !range.currency) || (!range.interval && range.unit !== 'percent') || !!range.applicability)
        ? 'Compensation has an unresolved component, currency, period, or regional applicability.' : undefined;
    return { lines: compensation.ranges.map(formatCompensationRange), uncertainty };
  }
  if (compensation.min !== undefined || compensation.max !== undefined) {
    return { lines: [formatCompensationRange({ min: compensation.min, max: compensation.max, currency: compensation.currency, interval: compensation.interval, kind: 'base', source: 'structured' })], uncertainty: 'Legacy compensation fields need confirmation.' };
  }
  return { lines: [], uncertainty: compensation.status === 'malformed' ? 'Compensation needs confirmation.' : 'Compensation is ambiguous or unavailable.' };
}

export function shortlistRelevance(job: JobRecord): string {
  const display = assessmentDisplay(job);
  if (display.state === 'current') return display.strongestMatch || display.summary;
  if (!job.primaryRoleFamily) return display.summary;
  const origin = display.state === 'stale' ? 'Previous assessment role family' : 'Recorded role family (unverified)';
  return `${origin}: ${job.primaryRoleFamily}; ${display.summary}`;
}

export function shortlistVerification(job: JobRecord): string[] {
  const issues: string[] = [];
  if (job.verificationStatus === 'UNKNOWN' || job.verificationStatus === 'UNSUPPORTED') issues.push('Posting availability needs verification.');
  if (job.assessmentStatus === 'STALE') issues.push('Assessment is stale; reassess before applying.');
  if (!currentFit(job)) issues.push('Candidate fit has not been assessed.');
  if (job.remoteStatus === 'unknown') issues.push('Confirm the workplace arrangement and attendance expectations.');
  if (job.remoteStatus === 'hybrid' || job.remoteStatus === 'onsite') issues.push('Confirm location and attendance compatibility before applying.');
  if (job.remoteStatus !== 'remote' && !job.location) issues.push('Location details need confirmation.');
  const compensationConcern = compensationSummary(job.compensation).uncertainty;
  if (compensationConcern) issues.push(compensationConcern);
  for (const constraint of currentFit(job)?.unknownConstraints?.slice(0, 3) || []) issues.push(`Confirm: ${constraint}`);
  for (const blocker of job.hardBlockers.slice(0, 3)) issues.push(`Known concern: ${blocker}`);
  return issues;
}

export async function performShortlistDecision(jobId: string, decision: ShortlistDecision, logOutcome: (id: string, status: ApplicationStatus) => Promise<void>) {
  await logOutcome(jobId, decision === 'pursue' ? 'SHORTLISTED' : 'ARCHIVED');
}
