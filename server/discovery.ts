import { JobRecord, SearchProfile } from '../src/types/index.js';
import { detectAtsProvider, verifyPostingAts, JobVerificationResult } from './atsAdapters.js';
import { calculateFreshnessBand } from './searchEngine.js';
import { normalizedJobUrl, mergeDiscoveredJobs } from '../src/utils/jobIdentity.js';
import { randomUUID } from 'node:crypto';

export interface DiscoveryLead { url: string; title?: string; description?: string; source?: 'brave-web-search' | 'web-search'; }
export interface DiscoveryProvider { search(queries: string[]): Promise<DiscoveryLead[]>; }
export class DiscoveryProviderError extends Error {
  constructor(readonly code: 'SEARCH_TIMEOUT' | 'SEARCH_RATE_LIMITED' | 'SEARCH_PROVIDER_UNAVAILABLE' | 'DISCOVERY_FAILED', message: string) { super(message); }
}

const values = (items: string[] | undefined, count: number) => (items || []).map(item => item.trim()).filter(Boolean).slice(0, count);
const searchValues = (items: string[] | undefined, count: number) => values(items, count).map(item => item.replace(/"/g, '').slice(0, 80).trim()).filter(Boolean);
const quoted = (value: string) => `"${value.replace(/"/g, '').trim()}"`;
const ROLE_TERMS: Record<string, string[]> = {
  'frontend-product': ['frontend engineer', 'product engineer'],
  'ui-platform-design-systems': ['design systems engineer', 'UI platform engineer'],
  'frontend-heavy-fullstack': ['full stack engineer', 'product engineer'],
  'production-support-frontend': ['frontend engineer', 'production engineer'],
  'forward-deployed-software': ['forward deployed software engineer']
};
const MODIFIER_TERMS: Record<string, string> = {
  AI_PRODUCT: 'AI product', ACCESSIBILITY: 'accessibility', DEVELOPER_TOOLING: 'developer experience',
  DESIGN_SYSTEMS: 'design systems', INTERNAL_TOOLS: 'internal tools', PRODUCTION_SUPPORT: 'production support'
};
const leadText = (value: unknown, maximum: number) => typeof value === 'string' ? value.trim().slice(0, maximum) || undefined : undefined;

export function validateDiscoveryInput(profile: SearchProfile, budget: number) {
  if (!profile || !Array.isArray(profile.preferredRoleFamilies) || !Array.isArray(profile.technologyStrengths)) throw new Error('Configure valid search preferences first.');
  if (!Number.isInteger(budget) || budget < 1 || budget > 10) throw new Error('Query budget must be 1-10.');
  for (const field of ['preferredRoleFamilies','preferredModifiers','technologyStrengths','targetSeniority','allowedEmploymentTypes','excludedEmploymentTypes','hybridLocations','excludedRolePatterns','companyExclusions'] as const) {
    const value = profile[field];
    if (value !== undefined && (!Array.isArray(value) || value.length > 100 || value.some(item => typeof item !== 'string' || item.length > 500))) throw new Error('Invalid search preference array.');
  }
  for (const field of ['remotePreference','maximumOnsiteFrequency','clearancePolicy'] as const) if (profile[field] !== undefined && (typeof profile[field] !== 'string' || profile[field].length > 100)) throw new Error('Invalid search preference.');
  if (profile.relocationAllowed !== undefined && typeof profile.relocationAllowed !== 'boolean') throw new Error('Invalid relocation preference.');
  for (const value of [profile.salaryPreference?.minTarget, profile.salaryPreference?.minimumAcceptable])
    if (value !== undefined && (typeof value !== 'number' || !Number.isFinite(value))) throw new Error('Invalid salary preference.');
}

/** Bounded search terms only: exclusions are filtering preferences, never positive searches. */
export function buildDiscoveryQueries(profile: SearchProfile, budget: number): string[] {
  validateDiscoveryInput(profile, budget);
  const roleTerms = [...new Set(values(profile.preferredRoleFamilies, 5).flatMap(value => ROLE_TERMS[value] || []))];
  if (!roleTerms.length) roleTerms.push('software engineer');
  const modifierTerms = values(profile.preferredModifiers, 3).map(value => MODIFIER_TERMS[value]).filter(Boolean);
  const technologies = searchValues(profile.technologyStrengths, 3);
  const seniority = searchValues(profile.targetSeniority, 2);
  const locations = profile.remotePreference === 'remote_only' ? ['remote'] : searchValues(profile.hybridLocations, 2);
  const role = (index: number) => [seniority[index % Math.max(1, seniority.length)], modifierTerms[index % Math.max(1, modifierTerms.length)], roleTerms[index % roleTerms.length]].filter(Boolean).join(' ');
  const strengths = technologies.slice(0, 2).map(quoted).join(' ');
  const location = locations[0] ? quoted(locations[0]) : '';
  const candidates = [
    ...['jobs.ashbyhq.com', 'job-boards.greenhouse.io', 'jobs.lever.co'].map((domain, index) =>
      `site:${domain} ${quoted(role(index))} ${strengths}`.trim()),
    ...roleTerms.map((_, index) => `${quoted(role(index))} ${strengths} ${location}`.trim()),
    ...modifierTerms.map(term => `${quoted(term)} ${technologies[0] ? quoted(technologies[0]) : ''} ${location}`.trim())
  ];
  return [...new Set(candidates.map(query => query.replace(/\s+/g, ' ').trim()).filter(Boolean))].slice(0, Math.min(10, budget));
}

export function createBraveSearchProvider(apiKey = process.env.BRAVE_SEARCH_API_KEY, fetchImpl: typeof fetch = fetch): DiscoveryProvider | null {
  if (!apiKey?.trim()) return null;
  return { async search(queries) {
    const batches = await Promise.all(queries.map(async query => {
      let response: Response;
      try {
        response = await fetchImpl(`https://api.search.brave.com/res/v1/web/search?${new URLSearchParams({ q: query, count: '6' })}`, { method: 'GET', headers: { Accept: 'application/json', 'X-Subscription-Token': apiKey }, redirect: 'error', signal: AbortSignal.timeout(8000) });
      } catch (error: any) {
        if (error?.name === 'TimeoutError' || error?.name === 'AbortError') throw new DiscoveryProviderError('SEARCH_TIMEOUT', 'Search request timed out; retry later.');
        throw new DiscoveryProviderError('SEARCH_PROVIDER_UNAVAILABLE', 'Search provider is temporarily unavailable; retry later.');
      }
      if (response.status === 429) { await response.body?.cancel(); throw new DiscoveryProviderError('SEARCH_RATE_LIMITED', 'Search provider is rate limited; retry later.'); }
      if (!response.ok) { await response.body?.cancel(); throw new DiscoveryProviderError('SEARCH_PROVIDER_UNAVAILABLE', 'Search provider is temporarily unavailable; retry later.'); }
      if (!/application\/json/i.test(response.headers.get('content-type') || '')) { await response.body?.cancel(); throw new DiscoveryProviderError('DISCOVERY_FAILED', 'Search provider returned an invalid response.'); }
      let data: any;
      try {
        const reader = response.body?.getReader(); if (!reader) throw new Error('missing body');
        const chunks: Uint8Array[] = []; let size = 0;
        try { while (true) { const { done, value } = await reader.read(); if (done) break; size += value.length; if (size > 1024 * 1024) throw new Error('too large'); chunks.push(value); } } finally { await reader.cancel(); }
        data = JSON.parse(Buffer.concat(chunks).toString('utf8'));
      } catch { throw new DiscoveryProviderError('DISCOVERY_FAILED', 'Search provider returned an invalid response.'); }
      if (!Array.isArray(data?.web?.results)) throw new DiscoveryProviderError('DISCOVERY_FAILED', 'Search provider returned an invalid response.');
      return data.web.results.slice(0, 6).flatMap((item: any) => {
        const url = leadText(item?.url, 4000);
        return url ? [{ url, title: leadText(item.title, 500), description: leadText(item.description, 5000), source: 'brave-web-search' as const }] : [];
      });
    }));
    return batches.flat();
  } };
}

export async function executeDiscoveryRequest(provider: DiscoveryProvider, profile: SearchProfile, budget: number, verify = verifyPostingAts) {
  const queries = buildDiscoveryQueries(profile, budget);
  return executeDiscoveryQueries(provider, queries, verify);
}

export async function executeDiscoveryQueries(provider: DiscoveryProvider, queries: string[], verify = verifyPostingAts) {
  const leads = await provider.search(queries);
  return { jobs: await buildDiscoveredJobs(leads, queries, verify), discoveryRequestsUsed: queries.length, queryBudgetUsed: queries.length, queryBudgetUnit: 'web_search_queries' as const };
}

export async function buildDiscoveredJobs(leads: DiscoveryLead[], queries: string[], verify = verifyPostingAts): Promise<JobRecord[]> {
  const records = (await Promise.all(leads.slice(0, 12).map(async lead => {
    if (!normalizedJobUrl(lead?.url)) return undefined;
    const url = lead.url, detected = detectAtsProvider(url);
    let verification: JobVerificationResult = { status: 'UNKNOWN', isListed: false, lastVerifiedAt: new Date().toISOString() };
    try { verification = await verify(url, detected.provider, detected.board, detected.jobId); } catch { /* uncertainty survives */ }
    const details = ['LISTED', 'UNLISTED'].includes(verification.status) ? verification.rawDetails || {} : {};
    const provider = details.atsProvider || detected.provider;
    const text = typeof details.rawContent === 'string' ? details.rawContent : '';
    return {
      id: `job-disc-${randomUUID()}`, atsProvider: provider, atsBoard: details.atsBoard || detected.board, atsJobId: details.atsJobId || detected.jobId,
      company: '', title: details.title || lead.title || '', canonicalUrl: verification.canonicalUrl || '', applyUrl: verification.applyUrl || '', discoveryUrl: url,
      discoveryTitle: lead.title, discoverySummary: lead.description, discoverySourceUrls: [url], discoveryAliases: [url], description: text, rawDescription: text,
      canonicalContentStatus: text ? 'AVAILABLE' : verification.status === 'UNSUPPORTED' ? 'UNSUPPORTED' : 'UNAVAILABLE', canonicalContentSource: text ? verification.verificationSource || verification.canonicalUrl : undefined, canonicalMetadata: details.providerMetadata,
      location: details.location || '', secondaryLocations: details.secondaryLocations, remoteStatus: details.remoteStatus || 'unknown', workplaceType: details.workplaceType, employmentType: details.employmentType || '', compensation: details.compensation, department: details.department, team: details.team, publishedAt: details.publishedAt, updatedAt: details.updatedAt,
      publicationDateSource: details.publishedAt ? `${provider}:${provider === 'greenhouse' ? 'first_published' : provider === 'lever' ? 'createdAt (creation, optional public v0 field)' : 'publishedAt (last published)'}` : undefined,
      firstSeenAt: new Date().toISOString(), lastVerifiedAt: verification.lastVerifiedAt, verificationStatus: verification.status, isCurrentlyListed: verification.status === 'LISTED', freshnessBand: calculateFreshnessBand(details.publishedAt),
      sourceChannel: lead.source === 'brave-web-search' ? 'Brave Web Search' : 'Web Search Lead', searchQuery: queries.join('\n'), primaryRoleFamily: undefined, roleModifiers: [], seniority: 'Unspecified',
      hardRequirements: [], preferredRequirements: [], technologies: [], responsibilities: [], hiringSignals: [], hardBlockers: [], softGaps: [], assessmentStatus: 'UNASSESSED', applicationPriority: 'UNASSESSED', priorityReason: 'Not assessed; Phase 4 deferred.', applicationStatus: 'DISCOVERED'
    } as JobRecord;
  }))).filter((record): record is JobRecord => !!record);
  return mergeDiscoveredJobs([], records).newJobs;
}
