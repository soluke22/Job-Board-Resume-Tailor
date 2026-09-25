import { JobRecord } from '../types/index.js';

export function normalizedJobUrl(input?: string): string | undefined {
  try {
    const u = new URL(input || '');
    if (!['http:', 'https:'].includes(u.protocol)) return undefined;
    u.hash = '';
    for (const key of [...u.searchParams.keys()])
      if (/^(utm_.+|gclid|fbclid|source|ref|referrer|lever-source|lever-origin)$/i.test(key)) u.searchParams.delete(key);
    if (u.hostname === 'boards.greenhouse.io') u.hostname = 'job-boards.greenhouse.io';
    u.pathname = u.pathname.replace(/\/+$/, '') || '/';
    u.searchParams.sort();
    return u.href;
  } catch { return undefined; }
}
function atsKey(j: Partial<JobRecord>) {
  return j.atsJobId && j.atsBoard && ['ashby', 'greenhouse', 'lever'].includes(j.atsProvider || '')
    ? `${j.atsProvider}:${j.atsBoard}:${j.atsJobId}` : undefined;
}
const normalize = (s?: string) => s?.trim().toLowerCase().replace(/\s+/g, ' ');
function urlSet(job: Partial<JobRecord>): Set<string> {
  return new Set([job.canonicalUrl, job.sourceUrl, job.discoveryUrl, ...(job.discoveryAliases || [])]
    .map(normalizedJobUrl).filter((url): url is string => !!url));
}
export function sameJob(a: Partial<JobRecord>, b: Partial<JobRecord>): boolean {
  const ak = atsKey(a), bk = atsKey(b);
  if (ak && bk) return ak === bk; // Different requisitions are never title-merged.
  const aUrls = urlSet(a), bUrls = urlSet(b);
  if ([...aUrls].some(url => bUrls.has(url))) return true;
  // Fallback only without conflicting strong identities/URLs and with known location.
  if (ak || bk || aUrls.size && bUrls.size) return false;
  return !!a.company && !!a.title && !!a.location && !!b.location &&
    normalize(a.company) === normalize(b.company) && normalize(a.title) === normalize(b.title) && normalize(a.location) === normalize(b.location);
}
const verifiedFields = ['atsProvider','atsBoard','atsJobId','title','canonicalUrl','applyUrl','description','rawDescription','location','secondaryLocations','remoteStatus','workplaceType','employmentType','compensation','department','team','publishedAt','publicationDateSource','updatedAt','lastVerifiedAt','verificationStatus','isCurrentlyListed','freshnessBand','canonicalContentStatus','canonicalContentSource','canonicalMetadata'] as const;
export function refreshJob(existing: JobRecord, incoming: JobRecord): JobRecord {
  const merged = {...existing};
  if (incoming.jdSource === 'user-provided' && (incoming.rawDescription || incoming.description)) {
    merged.description = incoming.description;
    merged.rawDescription = incoming.rawDescription;
    merged.jdSource = 'user-provided';
  }
  if (['LISTED', 'UNLISTED'].includes(incoming.verificationStatus)) {
    for (const key of verifiedFields) if ((incoming as any)[key] !== undefined && (incoming as any)[key] !== '') (merged as any)[key] = (incoming as any)[key];
  } else {
    merged.verificationStatus = incoming.verificationStatus;
    merged.isCurrentlyListed = incoming.isCurrentlyListed;
    merged.lastVerifiedAt = incoming.lastVerifiedAt;
  }
  merged.discoveryAliases = [...new Set([...(existing.discoveryAliases || []), ...(incoming.discoveryAliases || []), incoming.discoveryUrl].filter(Boolean))];
  merged.discoverySourceUrls = [...new Set([...(existing.discoverySourceUrls || []), ...(incoming.discoverySourceUrls || [])])];
  if (existing.fit && (merged.description !== existing.description || merged.verificationStatus !== existing.verificationStatus || merged.publishedAt !== existing.publishedAt || merged.freshnessBand !== existing.freshnessBand || JSON.stringify(merged.compensation) !== JSON.stringify(existing.compensation))) merged.assessmentStatus = 'STALE';
  // IDs, firstSeenAt, assessment, notes, lifecycle and every application attachment survive.
  return merged;
}
export function mergeDiscoveredJobs(existing: JobRecord[], incoming: JobRecord[]) {
  const jobs = [...existing]; const newJobs: JobRecord[] = []; const refreshedJobs: JobRecord[] = [];
  for (const candidate of incoming) {
    const index = jobs.findIndex(j => sameJob(j, candidate));
    if (index >= 0) {
      jobs[index] = refreshJob(jobs[index], candidate);
      const ni = newJobs.findIndex(j => j.id === jobs[index].id);
      if (ni >= 0) newJobs[ni] = jobs[index];
      else { const ri = refreshedJobs.findIndex(j => j.id === jobs[index].id); if (ri >= 0) refreshedJobs[ri] = jobs[index]; else refreshedJobs.push(jobs[index]); }
    } else { jobs.push(candidate); newJobs.push(candidate); }
  }
  return {jobs, newJobs, refreshedJobs};
}
