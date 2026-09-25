import { randomUUID } from 'node:crypto';
import type { JobRecord, SearchProfile } from '../src/types/index.js';
import type { DiscoverySource, PublicBoardProvider } from '../src/utils/discovery.js';
import { discoverySourcesForWorkspace } from '../src/utils/discovery.js';
import { detectAtsProvider, providerDate, verifyPostingAts, type JobVerificationResult } from './atsAdapters.js';
import { calculateFreshnessBand } from './searchEngine.js';
import { normalizedJobUrl, mergeDiscoveredJobs } from '../src/utils/jobIdentity.js';
import { safeFetchText, validatePublicUrl } from './safeFetch.js';

export interface DiscoveryLead {
  url: string;
  title?: string;
  description?: string;
  company?: string;
  location?: string;
  remoteStatus?: 'remote' | 'hybrid' | 'onsite' | 'unknown';
  employmentType?: string;
  source: 'public-board' | 'manual-web-import';
  verification?: JobVerificationResult;
}

export interface BoardScanResult {
  sourceId: string;
  status: 'SUCCESS' | 'FAILED';
  leads: number;
}

const text = (value: unknown, maximum: number) => typeof value === 'string' ? value.trim().slice(0, maximum) || undefined : undefined;
const joined = (...parts: unknown[]) => parts.filter(part => typeof part === 'string' && part.trim()).join('\n\n') || undefined;

async function providerJson(url: string, fetchImpl: typeof fetch = fetch): Promise<{ status: number; data?: any }> {
  const response = await fetchImpl(url, { redirect: 'error', signal: AbortSignal.timeout(8000), headers: { Accept: 'application/json' } });
  if (!response.ok) { await response.body?.cancel(); return { status: response.status }; }
  if (!/application\/json/i.test(response.headers.get('content-type') || '')) throw new Error('Invalid board response');
  const reader = response.body?.getReader();
  if (!reader) throw new Error('Missing board response');
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > 4 * 1024 * 1024) throw new Error('Board response too large');
      chunks.push(value);
    }
  } finally { await reader.cancel(); }
  return { status: response.status, data: JSON.parse(Buffer.concat(chunks).toString('utf8')) };
}

export function boardEndpoint(source: DiscoverySource): string {
  const board = encodeURIComponent(source.boardId);
  if (source.provider === 'ashby') return `https://api.ashbyhq.com/posting-api/job-board/${board}?includeCompensation=true`;
  if (source.provider === 'greenhouse') return `https://boards-api.greenhouse.io/v1/boards/${board}/jobs?content=true`;
  const eu = new URL(source.boardUrl).hostname === 'jobs.eu.lever.co';
  return `https://${eu ? 'api.eu.lever.co' : 'api.lever.co'}/v0/postings/${board}?mode=json`;
}

/** Fixed provider endpoints only. User-supplied arbitrary hosts never reach fetch. */
export async function scanPublicBoard(source: DiscoverySource, fetchImpl: typeof fetch = fetch): Promise<DiscoveryLead[]> {
  const endpoint = boardEndpoint(source);
  const { status, data } = await providerJson(endpoint, fetchImpl);
  if (status !== 200) throw new Error('Public board unavailable');
  const raw = source.provider === 'lever' ? data : data?.jobs;
  if (!Array.isArray(raw)) throw new Error('Invalid public board response');
  return raw.slice(0, 500).flatMap((job: any): DiscoveryLead[] => {
    const url = text(source.provider === 'ashby' ? job.jobUrl : source.provider === 'greenhouse' ? job.absolute_url : job.hostedUrl, 4000);
    const title = text(source.provider === 'lever' ? job.text : job.title, 500);
    if (!url || !title || !normalizedJobUrl(url)) return [];
    const detected = detectAtsProvider(url);
    // A row in a public feed cannot confer listing authority on a URL owned by
    // another host, ATS provider, or board.
    if (detected.provider !== source.provider || detected.board !== source.boardId || !detected.jobId) return [];
    const remote = source.provider === 'lever' && ['remote', 'hybrid', 'onsite'].includes(job.workplaceType)
      ? job.workplaceType : job.isRemote === true ? 'remote' : 'unknown';
    const canonicalUrl = url;
    const rawContent = source.provider === 'ashby' ? joined(job.descriptionPlain, job.descriptionHtml) : source.provider === 'greenhouse' ? joined(job.content) : joined(job.descriptionPlain || job.description, ...(job.lists || []).map((entry: any) => joined(entry.text, entry.content)), job.additionalPlain || job.additional);
    const publishedAt = providerDate(source.provider === 'greenhouse' ? job.first_published : source.provider === 'ashby' ? job.publishedAt : typeof job.createdAt === 'number' ? job.createdAt : undefined);
    const exactStatus = source.provider === 'ashby' ? typeof job.isListed === 'boolean' ? job.isListed ? 'LISTED' : 'UNLISTED' : 'UNKNOWN' : 'LISTED';
    const rawDetails = {
      atsProvider: source.provider, atsBoard: source.boardId, atsJobId: detected.jobId, title,
      canonicalUrl, applyUrl: text(source.provider === 'greenhouse' ? job.absolute_url : job.applyUrl, 4000),
      location: source.provider === 'greenhouse' ? job.location?.name : source.provider === 'lever' ? job.categories?.location : job.location,
      secondaryLocations: source.provider === 'ashby' ? job.secondaryLocations?.map((entry: any) => typeof entry === 'string' ? entry : entry.location) : undefined,
      remoteStatus: remote, workplaceType: job.workplaceType, employmentType: source.provider === 'lever' ? job.categories?.commitment : job.employmentType,
      department: source.provider === 'greenhouse' ? job.departments?.map((entry: any) => entry.name).join(', ') : job.department || job.categories?.department,
      team: job.team || job.categories?.team, publishedAt, updatedAt: source.provider === 'greenhouse' ? providerDate(job.updated_at) : undefined,
      rawContent, providerMetadata: { compensation: job.compensation, salaryRange: job.salaryRange, categories: job.categories, offices: job.offices, metadata: job.metadata, payInputRanges: job.pay_input_ranges, address: job.address, secondaryLocations: job.secondaryLocations, createdAt: job.createdAt },
      isCurrentlyListed: exactStatus === 'LISTED'
    };
    return [{
      url, title, company: source.company,
      description: text(rawContent, 12_000),
      location: text(source.provider === 'greenhouse' ? job.location?.name : source.provider === 'lever' ? job.categories?.location : job.location, 500),
      remoteStatus: remote, employmentType: text(source.provider === 'lever' ? job.categories?.commitment : job.employmentType, 200), source: 'public-board',
      verification: { status: exactStatus, isListed: exactStatus === 'LISTED', lastVerifiedAt: new Date().toISOString(), canonicalUrl, applyUrl: rawDetails.applyUrl, rawDetails, verificationSource: endpoint }
    }];
  });
}

const lower = (value?: string) => value?.trim().toLowerCase() || '';
export function matchesSearchProfile(lead: DiscoveryLead, profile: SearchProfile): boolean {
  const title = lower(lead.title), company = lower(lead.company), employment = lower(lead.employmentType);
  if ((profile.excludedRolePatterns || []).some(pattern => pattern.trim() && title.includes(lower(pattern)))) return false;
  if ((profile.companyExclusions || []).some(excluded => excluded.trim() && company === lower(excluded))) return false;
  if (employment && (profile.excludedEmploymentTypes || []).some(excluded => employment.includes(lower(excluded)))) return false;
  if (employment && profile.allowedEmploymentTypes?.length && !profile.allowedEmploymentTypes.some(allowed => employment.includes(lower(allowed)))) return false;
  if (profile.remotePreference === 'remote_only' && lead.remoteStatus === 'onsite') return false;
  return true;
}

export async function scanDiscoverySources(
  sources: DiscoverySource[], profile: SearchProfile,
  scan: (source: DiscoverySource) => Promise<DiscoveryLead[]> = scanPublicBoard,
  verify = verifyPostingAts
) {
  const enabled = sources.filter(source => source.enabled).slice(0, 50);
  const settled = await Promise.allSettled(enabled.map(source => scan(source)));
  const sourceResults: BoardScanResult[] = [];
  const leads: DiscoveryLead[] = [];
  settled.forEach((result, index) => {
    const source = enabled[index];
    if (result.status === 'rejected') { sourceResults.push({ sourceId: source.id, status: 'FAILED', leads: 0 }); return; }
    const matched = result.value.filter(lead => matchesSearchProfile(lead, profile));
    sourceResults.push({ sourceId: source.id, status: 'SUCCESS', leads: matched.length });
    leads.push(...matched);
  });
  return {
    jobs: await buildDiscoveredJobs(leads.slice(0, 24), verify), sourceResults,
    discoveryRequestsUsed: enabled.length, queryBudgetUsed: enabled.length, queryBudgetUnit: 'public_board_scans' as const
  };
}

export function configuredDiscoverySources(profile: SearchProfile, jobs: JobRecord[]) {
  return discoverySourcesForWorkspace(profile, jobs);
}

function sourceLabel(provider: PublicBoardProvider | string, channel: DiscoveryLead['source']) {
  if (channel === 'manual-web-import') return 'Manual Web Import';
  return provider === 'greenhouse' ? 'Greenhouse' : provider === 'ashby' ? 'Ashby' : provider === 'lever' ? 'Lever' : 'Company Careers';
}

function canonicalAshbyCompany(html: string, title: string): string | undefined {
  for (const match of html.matchAll(/<script\b(?=[^>]*\btype=["']application\/ld\+json["'])[^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const data = JSON.parse(match[1]);
      const postings = Array.isArray(data) ? data : Array.isArray(data?.['@graph']) ? data['@graph'] : [data];
      for (const posting of postings) {
        if (posting?.['@type'] !== 'JobPosting' || posting.title !== title) continue;
        const name = posting.hiringOrganization?.name;
        if (typeof name === 'string' && name.trim()) return name.trim().slice(0, 200);
      }
    } catch { /* Malformed optional metadata is not a company fact. */ }
  }
  const meta = html.match(/<meta\b(?=[^>]*\bname=["']title["'])[^>]*>/i)?.[0];
  const value = meta?.match(/\bcontent=["']([^"']+)["']/i)?.[1];
  const prefix = `${title} @ `;
  if (value?.startsWith(prefix)) return value.slice(prefix.length).trim().slice(0, 200) || undefined;
  return undefined;
}

export async function buildDiscoveredJobs(leads: DiscoveryLead[], verify = verifyPostingAts): Promise<JobRecord[]> {
  const records = (await Promise.all(leads.map(async lead => {
    if (!normalizedJobUrl(lead.url)) return undefined;
    const detected = detectAtsProvider(lead.url);
    let verification: JobVerificationResult = lead.verification || { status: 'UNKNOWN', isListed: false, lastVerifiedAt: new Date().toISOString() };
    if (!lead.verification) try { verification = await verify(lead.url, detected.provider, detected.board, detected.jobId); } catch { /* uncertainty survives */ }
    const details = ['LISTED', 'UNLISTED'].includes(verification.status) ? verification.rawDetails || {} : {};
    const provider = details.atsProvider || detected.provider;
    const canonicalText = typeof details.rawContent === 'string' ? details.rawContent : '';
    return {
      id: `job-disc-${randomUUID()}`, atsProvider: provider, atsBoard: details.atsBoard || detected.board, atsJobId: details.atsJobId || detected.jobId,
      company: lead.company || text(details.company, 200) || '', title: details.title || lead.title || '', canonicalUrl: verification.canonicalUrl || '', applyUrl: verification.applyUrl || '', discoveryUrl: lead.url,
      discoveryTitle: lead.title, discoveryCompany: lead.company, discoverySummary: lead.description, discoverySourceUrls: [lead.url], discoveryAliases: [lead.url], description: canonicalText, rawDescription: canonicalText,
      canonicalContentStatus: canonicalText ? 'AVAILABLE' : verification.status === 'UNSUPPORTED' ? 'UNSUPPORTED' : 'UNAVAILABLE', canonicalContentSource: canonicalText ? verification.verificationSource || verification.canonicalUrl : undefined, canonicalMetadata: details.providerMetadata,
      location: details.location || lead.location || '', secondaryLocations: details.secondaryLocations, remoteStatus: details.remoteStatus || lead.remoteStatus || 'unknown', workplaceType: details.workplaceType, employmentType: details.employmentType || lead.employmentType || '', compensation: details.compensation, department: details.department, team: details.team, publishedAt: details.publishedAt, updatedAt: details.updatedAt,
      publicationDateSource: details.publishedAt ? `${provider}:${provider === 'greenhouse' ? 'first_published' : provider === 'lever' ? 'createdAt (creation, optional public v0 field)' : 'publishedAt (last published)'}` : undefined,
      firstSeenAt: new Date().toISOString(), lastVerifiedAt: verification.lastVerifiedAt, verificationStatus: verification.status, isCurrentlyListed: verification.status === 'LISTED', freshnessBand: calculateFreshnessBand(details.publishedAt),
      sourceChannel: sourceLabel(provider, lead.source), primaryRoleFamily: undefined, roleModifiers: [], seniority: 'Unspecified',
      hardRequirements: [], preferredRequirements: [], technologies: [], responsibilities: [], hiringSignals: [], hardBlockers: [], softGaps: [], assessmentStatus: 'UNASSESSED', applicationPriority: 'UNASSESSED', priorityReason: 'Not assessed; explicit assessment required.', applicationStatus: 'DISCOVERED'
    } as JobRecord;
  }))).filter((record): record is JobRecord => !!record);
  return mergeDiscoveredJobs([], records).newJobs;
}

export async function buildManualImportedJob(
  input: { url: string; description?: string; company?: string; title?: string }, verify = verifyPostingAts,
  fetchPage = safeFetchText
) {
  const publicUrl = validatePublicUrl(input.url).href;
  const lead: DiscoveryLead = { url: publicUrl, company: text(input.company, 200), title: text(input.title, 500), source: 'manual-web-import' };
  const [job] = await buildDiscoveredJobs([lead], verify);
  if (!job) throw new Error('Invalid posting URL.');
  if (!job.company && job.atsProvider === 'ashby' && ['LISTED', 'UNLISTED'].includes(job.verificationStatus) && job.canonicalUrl) {
    const identity = detectAtsProvider(job.canonicalUrl);
    if (identity.provider === 'ashby' && identity.board === job.atsBoard && identity.jobId === job.atsJobId) {
      try {
        const page = await fetchPage(job.canonicalUrl);
        if (page.status === 200 && normalizedJobUrl(page.url) === normalizedJobUrl(job.canonicalUrl))
          job.company = canonicalAshbyCompany(page.text, job.title) || '';
      } catch { /* Missing page metadata does not fabricate a company. */ }
    }
  }
  const supplied = text(input.description, 200_000);
  if (supplied) {
    job.description = supplied; job.rawDescription = supplied; job.jdSource = 'user-provided';
    job.canonicalContentStatus = 'UNAVAILABLE';
    job.canonicalContentSource = undefined;
  } else if (job.canonicalContentStatus !== 'AVAILABLE') {
    try {
      const page = await fetchPage(publicUrl);
      if (page.status >= 200 && page.status < 300) {
        const fetched = page.text.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ')
          .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ')
          .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/\s+/g, ' ').trim().slice(0, 15_000);
        if (fetched) { job.description = fetched; job.rawDescription = fetched; }
      }
    } catch { /* URL remains importable with explicitly unknown content. */ }
  }
  job.sourceUrl = publicUrl; job.sourceChannel = 'Manual Web Import';
  job.company ||= text(input.company, 200) || ''; job.title ||= text(input.title, 500) || '';
  return job;
}
