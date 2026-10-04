import { randomUUID } from 'node:crypto';
import type { CompanyWatchlistEntry, DiscoveryScope, DiscoverySourceResult, JobRecord, PrimaryRoleFamily, SearchProfile, WatchlistLocationPolicy } from '../src/types/index.js';
import type { DiscoverySource, PublicBoardProvider } from '../src/utils/discovery.js';
import { discoverySourcesForWorkspace } from '../src/utils/discovery.js';
import { detectAtsProvider, providerDate, verifyPostingAts, type JobVerificationResult } from './atsAdapters.js';
import { calculateFreshnessBand } from './searchEngine.js';
import { normalizedJobUrl, normalizedJobUrls, supportedAtsIdentityKey, mergeDiscoveredJobs, sameJob } from '../src/utils/jobIdentity.js';
import { safeFetchText, validatePublicUrl } from './safeFetch.js';

export interface DiscoveryLead {
  url: string;
  title?: string;
  description?: string;
  company?: string;
  location?: string;
  remoteStatus?: 'remote' | 'hybrid' | 'onsite' | 'unknown';
  employmentType?: string;
  department?: string;
  team?: string;
  secondaryLocations?: string[];
  workplaceType?: string;
  source: 'public-board' | 'manual-web-import';
  verification?: JobVerificationResult;
}

export interface DiscoveryDedupeStats {
  candidateTraversals: number;
  atsIdentityLookups: number;
  urlIdentityLookups: number;
  fallbackSameJobComparisons: number;
  acceptedUnique: number;
}

interface DiscoveryQueue { sourceIndex: number; leads: DiscoveryLead[] }

export interface DiscoverySourceConstraint {
  roleFamilies: PrimaryRoleFamily[];
  locationPolicies: WatchlistLocationPolicy[];
}
export interface ScopedDiscoverySources {
  sources: DiscoverySource[];
  constraints: Map<string, DiscoverySourceConstraint>;
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
      secondaryLocations: rawDetails.secondaryLocations, remoteStatus: remote, workplaceType: text(rawDetails.workplaceType, 100),
      employmentType: text(source.provider === 'lever' ? job.categories?.commitment : job.employmentType, 200),
      department: text(rawDetails.department, 500), team: text(rawDetails.team, 500), source: 'public-board',
      verification: { status: exactStatus, isListed: exactStatus === 'LISTED', lastVerifiedAt: new Date().toISOString(), canonicalUrl, applyUrl: rawDetails.applyUrl, rawDetails, verificationSource: endpoint }
    }];
  });
}

const lower = (value?: string) => value?.trim().toLowerCase() || '';
const normalized = (value?: string) => lower(value).replace(/[^a-z0-9]+/g, ' ').trim();
const ALL_ROLE_FAMILIES: PrimaryRoleFamily[] = [
  'frontend-product', 'ui-platform-design-systems', 'frontend-heavy-fullstack',
  'production-support-frontend', 'forward-deployed-software'
];

function configuredFamilies(profile: SearchProfile, constraint?: DiscoverySourceConstraint) {
  const profileFamilies = profile.preferredRoleFamilies || [];
  const sourceFamilies = constraint?.roleFamilies || [];
  if (profileFamilies.length && sourceFamilies.length) {
    const sourceSet = new Set(sourceFamilies);
    return profileFamilies.filter(family => sourceSet.has(family));
  }
  return profileFamilies.length ? profileFamilies : sourceFamilies.length ? sourceFamilies : ALL_ROLE_FAMILIES;
}

/** Positive, deterministic target-family classification; no job-description inference. */
export function roleEligibility(lead: DiscoveryLead, profile: SearchProfile, constraint?: DiscoverySourceConstraint) {
  const title = normalized(lead.title);
  const department = normalized(lead.department || (lead.verification?.rawDetails as any)?.department);
  const team = normalized(lead.team || (lead.verification?.rawDetails as any)?.team);
  const context = `${department} ${team}`.trim();
  const families = new Set(configuredFamilies(profile, constraint));
  if (!title) return { eligible: false, reason: 'ROLE_FAMILY_MISMATCH' as const };
  if (!families.size) return { eligible: false, reason: 'ROLE_FAMILY_MISMATCH' as const };
  if ((profile.excludedRolePatterns || []).some(pattern => {
    const excluded = normalized(pattern);
    return excluded && title.includes(excluded);
  }))
    return { eligible: false, reason: 'ROLE_FAMILY_MISMATCH' as const };

  const businessBlocker = /\b(account executive|sales|partnerships?|finance|accounting|recruit(?:er|ing)|human resources?|legal|policy|customer success|revenue operations?|marketing|communications?|business operations?|revenue analyst)\b/;
  const researchLeadership = /\b(machine learning|ml|ai)\b.*\b(manager|director|head|lead)\b|\b(manager|director|head|lead)\b.*\b(machine learning|ml|ai research)\b/;
  if (researchLeadership.test(title))
    return { eligible: false, reason: 'ROLE_FAMILY_MISMATCH' as const };

  const accepts = (family: PrimaryRoleFamily) => families.has(family);
  const genericSoftware = /\bsoftware (?:development )?(?:engineer|developer)\b|\b(?:engineer|developer),? software\b/.test(title);
  if (businessBlocker.test(title) && !genericSoftware)
    return { eligible: false, reason: 'ROLE_FAMILY_MISMATCH' as const };

  const developerFacing = /\b(developer advocate|developer relations(?: engineer)?)\b/.test(title);
  const customerFacing = /\b(solutions? engineer|solutions? architect|implementation engineer|customer engineer)\b/.test(title);
  if (developerFacing || customerFacing) {
    const technicalContext = /\b(engineering|software|developer experience|developer relations|product)\b/.test(context);
    if (developerFacing && technicalContext && accepts('ui-platform-design-systems') && profile.preferredModifiers?.includes('DEVELOPER_TOOLING'))
      return { eligible: true, family: 'ui-platform-design-systems' as const };
    if (customerFacing && technicalContext && accepts('forward-deployed-software'))
      return { eligible: true, family: 'forward-deployed-software' as const };
    return { eligible: false, reason: 'ROLE_FAMILY_MISMATCH' as const };
  }

  const explicitNonTargetDomain = /\b(data|analytics?|machine learning|ml|security|quality assurance|qa|test automation|infrastructure|devops|site reliability|sre|mobile|ios|android|embedded|firmware|backend|back end)\b/;
  const forwardDeployed = /\bforward deployed (?:software )?(?:engineer|developer)\b|\bsoftware (?:engineer|developer)\b.*\bforward deployed\b/.test(title);
  const matchedFamily =
    (forwardDeployed && !explicitNonTargetDomain.test(title) && !businessBlocker.test(title) && accepts('forward-deployed-software')) ? 'forward-deployed-software' :
    (/\b(design systems?|ui platform)\b.*\b(engineer|developer)\b|\b(engineer|developer)\b.*\b(design systems?|ui platform)\b/.test(title) && accepts('ui-platform-design-systems')) ? 'ui-platform-design-systems' :
    (/\b(developer experience|developer productivity|devex)\b.*\b(engineer|developer)\b|\b(engineer|developer)\b.*\b(developer experience|developer productivity|devex)\b/.test(title) && accepts('ui-platform-design-systems')) ? 'ui-platform-design-systems' :
    (/\b(front ?end|ui|web)\b.*\b(engineer|developer)\b|\b(engineer|developer)\b.*\b(front ?end|ui|web)\b/.test(title) && accepts('frontend-product')) ? 'frontend-product' :
    (/\bproduct\b.*\b(engineer|developer)\b|\b(engineer|developer)\b.*\bproduct\b/.test(title) && (accepts('frontend-product') || accepts('frontend-heavy-fullstack'))) ? (accepts('frontend-product') ? 'frontend-product' : 'frontend-heavy-fullstack') :
    (/\bfull ?stack\b.*\b(engineer|developer)\b|\b(engineer|developer)\b.*\bfull ?stack\b/.test(title) && accepts('frontend-heavy-fullstack')) ? 'frontend-heavy-fullstack' :
    (/\bproduction\b.*\b(engineer|developer)\b|\b(engineer|developer)\b.*\bproduction\b/.test(title) && accepts('production-support-frontend')) ? 'production-support-frontend' :
    (/\bplatform\b.*\b(engineer|developer)\b|\b(engineer|developer)\b.*\b(?:developer )?platform\b/.test(title) && !explicitNonTargetDomain.test(title) && (accepts('ui-platform-design-systems') || accepts('production-support-frontend'))) ? (accepts('ui-platform-design-systems') ? 'ui-platform-design-systems' : 'production-support-frontend') :
    undefined;
  if (matchedFamily) return { eligible: true, family: matchedFamily };

  const explicitTargetDomain = /\b(front ?end|ui|web|product|full ?stack|design systems?|developer experience|developer productivity|devex|platform|production|forward deployed)\b/;
  const genericEngineer = /^(?:(?:associate|junior|mid|senior|staff|principal|lead) )?engineer(?:\s+(?:i{1,4}|\d+))?$/.test(title);
  return (genericSoftware && !explicitNonTargetDomain.test(title) && !explicitTargetDomain.test(title)) || genericEngineer
    ? { eligible: true, family: accepts('frontend-heavy-fullstack') ? 'frontend-heavy-fullstack' as const : configuredFamilies(profile, constraint)[0] }
    : { eligible: false, reason: 'ROLE_FAMILY_MISMATCH' as const };
}

const US_LOCATION = /\b(united states|u s a?|usa|us)\b/;
const US_WORKING_CONTEXT = /\b(?:united states|u s a?|usa|us)\b(?:\W+\w+){0,2}\W+(?:time\s*zones?|(?:working\s+)?hours?|overlap|(?:eastern|central|mountain|pacific)\s+time)\b|\b(?:time\s*zones?|(?:working\s+)?hours?|overlap|(?:eastern|central|mountain|pacific)\s+time)\b(?:\W+\w+){0,4}\W+(?:united states|u s a?|usa|us)\b|\b(?:est|edt|cst|cdt|mst|mdt|pst|pdt)\s+(?:united states|u s a?|usa|us)\b/;
const CLEAR_NON_US_LOCATION = /\b(emea|europe|european union|united kingdom|uk|canada|apac|asia pacific|australia|new zealand|india|germany|france|spain|italy|ireland|netherlands|poland|portugal|sweden|norway|denmark|switzerland|mexico|brazil|argentina)\b/;
const REMOTE_WORD = /\b(remote|distributed|work from home)\b/;

/** Reject only clear incompatibilities; missing or ambiguous geography passes. */
export function locationEligibility(lead: DiscoveryLead, profile: SearchProfile, constraint?: DiscoverySourceConstraint) {
  const details = lead.verification?.rawDetails as any;
  const rawLocations = [lead.location, ...(lead.secondaryLocations || details?.secondaryLocations || [])]
    .filter((location): location is string => typeof location === 'string' && !!location.trim());
  const locations = rawLocations.map(normalized).filter(Boolean);
  const locationText = locations.join(' ');
  const locationAlternatives = rawLocations.flatMap(location => location.split(/\s+(?:or|and)\s+|\s*[\/;]\s*/i).map(normalized).filter(Boolean));
  const workplace = normalized(lead.workplaceType || details?.workplaceType);
  const status = lead.remoteStatus || details?.remoteStatus || 'unknown';
  const explicitRemote = status === 'remote' || workplace === 'remote' || REMOTE_WORD.test(locationText);
  const explicitOnsite = status === 'onsite' || workplace === 'onsite';
  const explicitHybrid = status === 'hybrid' || workplace === 'hybrid';
  const isUsGeography = (location: string) => US_LOCATION.test(location) && !US_WORKING_CONTEXT.test(location);
  const hasUsLocation = locationAlternatives.some(isUsGeography);
  const hasNonUsLocation = locationAlternatives.some(location => CLEAR_NON_US_LOCATION.test(location));
  const hasUnknownAlternative = locationAlternatives.length > 1
    && locationAlternatives.some(location => !isUsGeography(location) && !CLEAR_NON_US_LOCATION.test(location) && !US_WORKING_CONTEXT.test(location));
  const nonUsOnly = hasNonUsLocation && !hasUsLocation && !hasUnknownAlternative;
  const allowedLocal = (profile.hybridLocations || []).some(place => {
    const target = normalized(place);
    return target && (locationText.includes(target) || target.includes(locationText));
  });

  const policies = new Set(constraint?.locationPolicies || []);
  if (nonUsOnly && (explicitRemote || profile.remotePreference === 'remote_only' || policies.has('REMOTE_OK')))
    return { eligible: false, reason: 'LOCATION_INCOMPATIBLE' as const };
  if (profile.remotePreference === 'remote_only' && (explicitOnsite || explicitHybrid))
    return { eligible: false, reason: 'LOCATION_INCOMPATIBLE' as const };
  if (profile.remotePreference === 'hybrid_flexible' && (explicitOnsite || explicitHybrid) && locations.length && !allowedLocal)
    return { eligible: false, reason: 'LOCATION_INCOMPATIBLE' as const };

  const policyIsPermissive = !policies.size || policies.has('ANY') || policies.has('UNKNOWN');
  if (!policyIsPermissive && policies.has('REMOTE_OK') && (explicitOnsite || explicitHybrid))
    return { eligible: false, reason: 'LOCATION_INCOMPATIBLE' as const };
  if (!policyIsPermissive && policies.has('LOCAL_HYBRID') && (explicitOnsite || explicitHybrid) && locations.length && !allowedLocal)
    return { eligible: false, reason: 'LOCATION_INCOMPATIBLE' as const };
  return { eligible: true, reason: locations.length || status !== 'unknown' ? 'LOCATION_COMPATIBLE' as const : 'LOCATION_UNKNOWN_PASS' as const };
}

export function matchesSearchProfile(lead: DiscoveryLead, profile: SearchProfile, constraint?: DiscoverySourceConstraint): boolean {
  const company = lower(lead.company), employment = lower(lead.employmentType);
  if ((profile.companyExclusions || []).some(excluded => excluded.trim() && company === lower(excluded))) return false;
  if (employment && (profile.excludedEmploymentTypes || []).some(excluded => employment.includes(lower(excluded)))) return false;
  if (employment && profile.allowedEmploymentTypes?.length && !profile.allowedEmploymentTypes.some(allowed => employment.includes(lower(allowed)))) return false;
  return roleEligibility(lead, profile, constraint).eligible && locationEligibility(lead, profile, constraint).eligible;
}

function discoveryIdentity(lead: DiscoveryLead): Partial<JobRecord> {
  const detected = detectAtsProvider(lead.url);
  return {
    atsProvider: detected.provider,
    atsBoard: detected.board,
    atsJobId: detected.jobId,
    canonicalUrl: lead.verification?.canonicalUrl || lead.url,
    discoveryUrl: lead.url,
    company: lead.company,
    title: lead.title,
    location: lead.location
  };
}

/**
 * Preserve sameJob's identity hierarchy without comparing every strong ATS record
 * to every prior candidate. Only identities without a supported ATS key enter the
 * weak fallback collection; their normalized URLs are still indexed first.
 */
export function deduplicateDiscoveryLeads(perSource: DiscoveryLead[][]): { queues: DiscoveryQueue[]; stats: DiscoveryDedupeStats } {
  const seenAtsIdentities = new Set<string>();
  const seenUrls = new Map<string, { hasWeakIdentity: boolean }>();
  const weakIdentities: Partial<JobRecord>[] = [];
  const stats: DiscoveryDedupeStats = {
    candidateTraversals: 0,
    atsIdentityLookups: 0,
    urlIdentityLookups: 0,
    fallbackSameJobComparisons: 0,
    acceptedUnique: 0
  };
  const queues = perSource.map((leads, sourceIndex): DiscoveryQueue => {
    const uniqueLeads: DiscoveryLead[] = [];
    for (const lead of leads) {
      stats.candidateTraversals++;
      const identity = discoveryIdentity(lead);
      const atsIdentity = supportedAtsIdentityKey(identity);
      const urls = [...normalizedJobUrls(identity)];
      let duplicate = false;

      if (atsIdentity) {
        stats.atsIdentityLookups++;
        duplicate = seenAtsIdentities.has(atsIdentity);
        if (!duplicate) {
          for (const url of urls) {
            stats.urlIdentityLookups++;
            // sameJob allows a URL match between a strong and a weak identity, but
            // two different supported ATS identities remain distinct requisitions.
            if (seenUrls.get(url)?.hasWeakIdentity) { duplicate = true; break; }
          }
        }
      } else {
        for (const url of urls) {
          stats.urlIdentityLookups++;
          if (seenUrls.has(url)) { duplicate = true; break; }
        }
        if (!duplicate) {
          for (const prior of weakIdentities) {
            stats.fallbackSameJobComparisons++;
            if (sameJob(prior, identity)) { duplicate = true; break; }
          }
        }
      }
      if (duplicate) continue;

      if (atsIdentity) seenAtsIdentities.add(atsIdentity);
      else weakIdentities.push(identity);
      for (const url of urls) {
        const prior = seenUrls.get(url);
        seenUrls.set(url, { hasWeakIdentity: !atsIdentity || prior?.hasWeakIdentity === true });
      }
      stats.acceptedUnique++;
      uniqueLeads.push(lead);
    }
    return { sourceIndex, leads: uniqueLeads };
  });
  return { queues, stats };
}

export async function scanDiscoverySources(
  sources: DiscoverySource[], profile: SearchProfile,
  scan: (source: DiscoverySource) => Promise<DiscoveryLead[]> = scanPublicBoard,
  verify = verifyPostingAts,
  constraints: ReadonlyMap<string, DiscoverySourceConstraint> = new Map()
) {
  const enabled = sources.filter(source => source.enabled).slice(0, 50);
  const settled = await Promise.allSettled(enabled.map(source => scan(source)));
  const sourceResults: DiscoverySourceResult[] = [];
  const matchedBySource: DiscoveryLead[][] = [];
  settled.forEach((result, index) => {
    const source = enabled[index];
    if (result.status === 'rejected') {
      sourceResults.push({ sourceId: source.id, status: 'FAILED', fetched: 0, roleEligible: 0, locationEligible: 0, selected: 0 });
      matchedBySource.push([]);
      return;
    }
    const constraint = constraints.get(source.id);
    const profileEligible = result.value.filter(lead => {
      const company = lower(lead.company), employment = lower(lead.employmentType);
      if ((profile.companyExclusions || []).some(excluded => excluded.trim() && company === lower(excluded))) return false;
      if (employment && (profile.excludedEmploymentTypes || []).some(excluded => employment.includes(lower(excluded)))) return false;
      return !(employment && profile.allowedEmploymentTypes?.length && !profile.allowedEmploymentTypes.some(allowed => employment.includes(lower(allowed))));
    });
    const roleEligible = profileEligible.filter(lead => roleEligibility(lead, profile, constraint).eligible);
    const locationEligible = roleEligible.filter(lead => locationEligibility(lead, profile, constraint).eligible);
    sourceResults.push({ sourceId: source.id, status: 'SUCCESS', fetched: result.value.length, roleEligible: roleEligible.length, locationEligible: locationEligible.length, selected: 0 });
    matchedBySource.push(locationEligible);
  });
  const { queues, stats: dedupeStats } = deduplicateDiscoveryLeads(matchedBySource);

  // Round-robin only after per-source normalization/filtering and global identity
  // dedupe. A prolific first source therefore cannot consume the whole cap.
  const selected: DiscoveryLead[] = [];
  while (selected.length < 24) {
    let progressed = false;
    for (const queue of queues) {
      const lead = queue.leads.shift();
      if (!lead) continue;
      selected.push(lead);
      sourceResults[queue.sourceIndex].selected++;
      progressed = true;
      if (selected.length === 24) break;
    }
    if (!progressed) break;
  }
  return {
    jobs: await buildDiscoveredJobs(selected, verify), sourceResults,
    discoveryRequestsUsed: enabled.length, queryBudgetUsed: enabled.length, queryBudgetUnit: 'public_board_scans' as const,
    dedupeStats
  };
}

export function configuredDiscoverySources(profile: SearchProfile, jobs: JobRecord[]) {
  return discoverySourcesForWorkspace(profile, jobs);
}

/** Watchlist entries constrain existing registry authority; they never create or re-enable it. */
export function sourcesForDiscoveryScope(
  profile: SearchProfile, jobs: JobRecord[], watchlist: CompanyWatchlistEntry[] = [], scope: DiscoveryScope
): ScopedDiscoverySources {
  const registry = configuredDiscoverySources(profile, jobs);
  if (scope === 'ALL_ENABLED') return { sources: registry, constraints: new Map() };
  const eligibleEntries = watchlist.filter(entry => entry.status === 'ACTIVE' && entry.monitoringEnabled && entry.atsSourceId);
  const bySource = new Map<string, DiscoverySourceConstraint>();
  for (const entry of eligibleEntries) {
    const id = entry.atsSourceId!;
    const current = bySource.get(id) || { roleFamilies: [], locationPolicies: [] };
    for (const family of entry.lanes || []) if (!current.roleFamilies.includes(family)) current.roleFamilies.push(family);
    if (!current.locationPolicies.includes(entry.locationPolicy)) current.locationPolicies.push(entry.locationPolicy);
    bySource.set(id, current);
  }
  const sources = registry.filter(source => source.enabled && bySource.has(source.id));
  const retained = new Set(sources.map(source => source.id));
  return { sources, constraints: new Map([...bySource].filter(([id]) => retained.has(id))) };
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
