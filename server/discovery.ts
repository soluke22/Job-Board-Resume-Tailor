import { randomUUID } from 'node:crypto';
import { normalizeAtsCompensation } from './compensation.js';
import type { CompanyWatchlistEntry, DiscoveryScope, DiscoverySourceHealth, DiscoverySourceResult, DiscoveryWindowDays, JobRecord, PrimaryRoleFamily, SearchProfile, WatchlistLocationPolicy, DiscoverySeniority } from '../src/types/index.js';
import type { DiscoverySource, PublicBoardProvider } from '../src/utils/discovery.js';
import { discoverySourcesForWorkspace } from '../src/utils/discovery.js';
import { detectAtsProvider, providerDate, providerWorkplaceStatus, verifyPostingAts, type JobVerificationResult } from './atsAdapters.js';
import { calculateFreshnessBand } from './searchEngine.js';
import { normalizedJobUrl, normalizedJobUrls, supportedAtsIdentityKey, mergeDiscoveredJobs, sameJob } from '../src/utils/jobIdentity.js';
import { safeFetchText, validatePublicUrl } from './safeFetch.js';
import { employmentTypeAllowed, normalizeProviderEmploymentType, providerMetadataValues } from '../src/utils/employment.js';

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
const DISCOVERY_LIMIT = 24;
export const UNKNOWN_DATE_LIMIT = 4;
export type PublicationWindowStatus = 'IN_WINDOW' | 'OLDER' | 'UNKNOWN' | 'FUTURE';

export function publicationWindowStatus(publishedAt: unknown, windowDays: DiscoveryWindowDays, now = Date.now()): { status: PublicationWindowStatus; timestamp?: number } {
  if (typeof publishedAt !== 'string') return { status:'UNKNOWN' };
  const timestamp = Date.parse(publishedAt);
  if (!Number.isFinite(timestamp)) return { status:'UNKNOWN' };
  if (timestamp > now) return { status:'FUTURE', timestamp };
  return timestamp >= now - windowDays * 86_400_000
    ? { status:'IN_WINDOW', timestamp }
    : { status:'OLDER', timestamp };
}

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

type DiscoveryFailureHealth = Extract<DiscoverySourceHealth, 'HTTP_FAILURE' | 'INVALID_RESPONSE' | 'UNSUPPORTED_PROVIDER' | 'UNKNOWN_FAILURE'>;
export class DiscoveryProviderError extends Error {
  constructor(public readonly health: DiscoveryFailureHealth, message: string) { super(message); this.name = 'DiscoveryProviderError'; }
}

async function providerJson(url: string, fetchImpl: typeof fetch = fetch): Promise<any> {
  let response: Response;
  try { response = await fetchImpl(url, { redirect: 'error', signal: AbortSignal.timeout(8000), headers: { Accept: 'application/json' } }); }
  catch { throw new DiscoveryProviderError('HTTP_FAILURE', 'Public board request failed'); }
  if (!response.ok) { await response.body?.cancel(); throw new DiscoveryProviderError('HTTP_FAILURE', `Public board returned HTTP ${response.status}`); }
  if (!/application\/json/i.test(response.headers.get('content-type') || '')) throw new DiscoveryProviderError('INVALID_RESPONSE', 'Public board returned a non-JSON response');
  const reader = response.body?.getReader();
  if (!reader) throw new DiscoveryProviderError('INVALID_RESPONSE', 'Public board response body is missing');
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > 4 * 1024 * 1024) throw new DiscoveryProviderError('INVALID_RESPONSE', 'Public board response exceeded the size limit');
      chunks.push(value);
    }
  } finally { await reader.cancel(); }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); }
  catch { throw new DiscoveryProviderError('INVALID_RESPONSE', 'Public board returned invalid JSON'); }
}

export function boardEndpoint(source: DiscoverySource): string {
  const board = encodeURIComponent(source.boardId);
  if (source.provider === 'ashby') return `https://api.ashbyhq.com/posting-api/job-board/${board}?includeCompensation=true`;
  if (source.provider === 'greenhouse') return `https://boards-api.greenhouse.io/v1/boards/${board}/jobs?content=true`;
  if (source.provider === 'lever') {
    const eu = new URL(source.boardUrl).hostname === 'jobs.eu.lever.co';
    return `https://${eu ? 'api.eu.lever.co' : 'api.lever.co'}/v0/postings/${board}?mode=json`;
  }
  throw new DiscoveryProviderError('UNSUPPORTED_PROVIDER', 'Discovery provider is unsupported');
}

/** Fixed provider endpoints only. User-supplied arbitrary hosts never reach fetch. */
export async function scanPublicBoard(source: DiscoverySource, fetchImpl: typeof fetch = fetch): Promise<DiscoveryLead[]> {
  const endpoint = boardEndpoint(source);
  const data = await providerJson(endpoint, fetchImpl);
  const raw = source.provider === 'lever' ? data : data?.jobs;
  if (!Array.isArray(raw)) throw new DiscoveryProviderError('INVALID_RESPONSE', 'Public board response has no jobs array');
  return raw.slice(0, 500).flatMap((job: any): DiscoveryLead[] => {
    const url = text(source.provider === 'ashby' ? job.jobUrl : source.provider === 'greenhouse' ? job.absolute_url : job.hostedUrl, 4000);
    const title = text(source.provider === 'lever' ? job.text : job.title, 500);
    if (!url || !title || !normalizedJobUrl(url)) return [];
    const detected = detectAtsProvider(url);
    let atsJobId = detected.jobId;
    if (source.provider === 'greenhouse') {
      atsJobId = (typeof job.id === 'string' || typeof job.id === 'number') ? String(job.id).trim().slice(0, 500) || undefined : undefined;
      if (!atsJobId) return [];
      // Greenhouse commonly returns an employer-hosted absolute_url. The fixed
      // configured boards API row is the listing authority and its id is the ATS
      // identity; the custom URL is retained only as the canonical/apply link.
      if (detected.provider === 'greenhouse' && (detected.board !== source.boardId || detected.jobId !== atsJobId)) return [];
      if (detected.provider === 'ashby' || detected.provider === 'lever') return [];
      try {
        const publicUrl = validatePublicUrl(url);
        if (publicUrl.protocol !== 'https:') return [];
      } catch { return []; }
    } else if (detected.provider !== source.provider || detected.board !== source.boardId || !atsJobId) return [];
    const remote = providerWorkplaceStatus(job.workplaceType, job.metadata, job.isRemote);
    const canonicalUrl = url;
    const rawContent = source.provider === 'ashby' ? joined(job.descriptionPlain, job.descriptionHtml) : source.provider === 'greenhouse' ? joined(job.content) : joined(job.descriptionPlain || job.description, ...(job.lists || []).map((entry: any) => joined(entry.text, entry.content)), job.additionalPlain || job.additional);
    const publishedAt = providerDate(source.provider === 'greenhouse' ? job.first_published : source.provider === 'ashby' ? job.publishedAt : typeof job.createdAt === 'number' ? job.createdAt : undefined);
    const exactStatus = source.provider === 'ashby' ? typeof job.isListed === 'boolean' ? job.isListed ? 'LISTED' : 'UNLISTED' : 'UNKNOWN' : 'LISTED';
    const rawEmploymentType = source.provider === 'lever' ? job.categories?.commitment : job.employmentType;
    const employmentType = normalizeProviderEmploymentType(rawEmploymentType, job.metadata);
    const compensation = normalizeAtsCompensation(source.provider, job);
    const rawDetails = {
      atsProvider: source.provider, atsBoard: source.boardId, atsJobId, title,
      canonicalUrl, applyUrl: text(source.provider === 'greenhouse' ? job.absolute_url : job.applyUrl, 4000),
      location: source.provider === 'greenhouse' ? job.location?.name : source.provider === 'lever' ? job.categories?.location : job.location,
      secondaryLocations: source.provider === 'ashby' ? job.secondaryLocations?.map((entry: any) => typeof entry === 'string' ? entry : entry.location) : undefined,
      remoteStatus: remote, workplaceType: job.workplaceType, employmentType, compensation,
      department: source.provider === 'greenhouse' ? job.departments?.map((entry: any) => entry.name).join(', ') : job.department || job.categories?.department,
      team: job.team || job.categories?.team, publishedAt, updatedAt: source.provider === 'greenhouse' ? providerDate(job.updated_at) : undefined,
      rawContent, providerMetadata: { compensation: job.compensation, salaryRange: job.salaryRange, salaryDescription: job.salaryDescription, salaryDescriptionPlain: job.salaryDescriptionPlain, categories: job.categories, offices: job.offices, metadata: job.metadata, payInputRanges: job.pay_input_ranges, address: job.address, secondaryLocations: job.secondaryLocations, createdAt: job.createdAt, rawEmploymentType },
      isCurrentlyListed: exactStatus === 'LISTED'
    };
    return [{
      url, title, company: source.company,
      description: text(rawContent, 12_000),
      location: text(source.provider === 'greenhouse' ? job.location?.name : source.provider === 'lever' ? job.categories?.location : job.location, 500),
      secondaryLocations: rawDetails.secondaryLocations, remoteStatus: remote, workplaceType: text(rawDetails.workplaceType, 100),
      employmentType,
      department: text(rawDetails.department, 500), team: text(rawDetails.team, 500), source: 'public-board',
      verification: { status: exactStatus, isListed: exactStatus === 'LISTED', lastVerifiedAt: new Date().toISOString(), canonicalUrl, applyUrl: rawDetails.applyUrl, compensation, rawDetails, verificationSource: endpoint }
    }];
  });
}

const lower = (value?: string) => value?.trim().toLowerCase() || '';
const normalized = (value?: string) => lower(value).replace(/[^a-z0-9]+/g, ' ').trim();

/** Preserve clause boundaries so an incidental term cannot establish primary work. */
function discoveryClauses(value?: string): string[] {
  return (value || '').replace(/<\/?(?:p|li|div|br|h[1-6])\b[^>]*>/gi, '\n')
    .replace(/<[^>]*>/g, ' ').replace(/&nbsp;|&#160;/gi, ' ')
    .split(/[.!?;\n]+/).map(normalized).filter(Boolean);
}

function assertedClauses(value?: string): string[] {
  // Withhold negated/optional clauses rather than guessing which requirement wins.
  return discoveryClauses(value).filter(clause => !/\b(not|never|no|optional|optionally)\b/.test(clause));
}

export function employmentEligibility(lead: DiscoveryLead, profile: SearchProfile) {
  const title = normalized(lead.title);
  const clauses = assertedClauses(lead.description);
  if (/\b(intern|internship|co op|cooperative education)\b/.test(title)
    || clauses.some(clause => /\b(?:this|the) (?:(?:role|position|opportunity|program) )?is (?:an? )?(?:paid )?(?:summer )?(?:internship|student placement)\b/.test(clause)))
    return { eligible: false, reason: 'EMPLOYMENT_EXCLUDED' as const, detail: 'EXPLICIT_INTERNSHIP' as const };
  if (clauses.some(clause => /\bmust (?:be|remain) (?:currently )?enrolled\b(?: [a-z]+){0,8} (?:college|university|degree|academic|bachelor|master|phd|school|students?)\b|\b(?:only open|restricted|limited) to (?:currently enrolled )?students\b|\b(?:applicants|candidates) must be (?:current |currently enrolled )?students\b/.test(clause)))
    return { eligible: false, reason: 'EMPLOYMENT_EXCLUDED' as const, detail: 'STUDENT_ONLY_PROGRAM' as const };
  const details = lead.verification?.rawDetails as any;
  // A normalized unknown may represent conflicting fields; do not reinterpret it
  // from just one surviving raw field and accidentally turn uncertainty into fact.
  const type = lead.employmentType !== undefined || details?.employmentType !== undefined
    ? normalizeProviderEmploymentType(lead.employmentType ?? details?.employmentType)
    : normalizeProviderEmploymentType(details?.providerMetadata?.rawEmploymentType, details?.providerMetadata?.metadata);
  if (type === 'internship')
    return { eligible: false, reason: 'EMPLOYMENT_EXCLUDED' as const, detail: 'EXPLICIT_INTERNSHIP' as const };
  const result = employmentTypeAllowed(type, profile.allowedEmploymentTypes, profile.excludedEmploymentTypes);
  return { ...result, detail: type === 'unknown' ? 'EMPLOYMENT_UNKNOWN_PASS' as const : 'STRUCTURED_EMPLOYMENT' as const };
}

function primaryRoleExclusion(lead: DiscoveryLead) {
  const clauses = assertedClauses(lead.description);
  const backend = /\b(?:this|the) (?:role|position|job) (?:is|will be) (?:an? )?(?:(?:primarily|predominantly|mainly) (?:focused on )?(?:backend|back end|server side)|(?:backend|back end|server side) (?:primary|focused|heavy|first))\b|\byou (?:will )?(?:primarily|predominantly|mainly) (?:build|develop|own|maintain|focus on) (?:our |the |production )?(?:backend|back end|server side|microservices|distributed systems)\b|\b(?:your |the )?(?:primary|main) (?:focus|responsibility|responsibilities) (?:is|are|will be) (?:(?:building|developing|owning|maintaining) )?(?:our |the )?(?:backend|back end|server side|microservices|distributed systems)\b/;
  if (clauses.some(clause => backend.test(clause))) return 'BACKEND_PRIMARY_ROLE' as const;
  const presales = /\b(?:this|the) (?:role|position|job) (?:is|will be) (?:an? )?(?:pre sales|presales|solutions consulting)\b|\b(?:your |the )?(?:primary|main) (?:focus|responsibility|responsibilities) (?:is|are|will be) (?:(?:delivering|leading|running|supporting) )?(?:pre sales|presales|sales demos|sales demonstrations|sales presentations|sales support)\b|\byou (?:will )?(?:primarily|predominantly|mainly) (?:deliver|lead|run|support|conduct) (?:pre sales|presales|sales demos|sales demonstrations|sales presentations)\b/;
  if (/^(?:(?:senior|junior|associate) )?(?:pre sales|presales) (?:solutions? )?(?:engineer|consultant|architect)\b/.test(normalized(lead.title))
    || clauses.some(clause => presales.test(clause))) return 'PRE_SALES_PRIMARY_ROLE' as const;
}
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

export function classifyDiscoverySeniority(titleValue?: string): DiscoverySeniority {
  const title = normalized(titleValue);
  if (!title) return 'UNKNOWN';
  if (/\b(director|manager|head|vice president|vp)\b/.test(title)) return 'DIRECTOR_MANAGEMENT';
  if (/\bprincipal\b/.test(title)) return 'PRINCIPAL';
  if (/\bstaff\b/.test(title)) return 'STAFF';
  if (/\b(senior|sr)\b/.test(title)) return 'SENIOR';
  if (/\b(junior|jr|entry level|graduate)\b/.test(title)) return 'JUNIOR';
  if (/\b(mid level|midlevel|intermediate)\b/.test(title)) return 'MID';
  return 'UNKNOWN';
}

/**
 * Deterministic discovery classification. Title evidence has precedence; canonical
 * feed description text may resolve otherwise ambiguous full-stack/software titles,
 * but it cannot override explicit management, seniority or contradictory duties.
 * A forward-deployed role's business-domain suffix is not its occupation.
 */
export function roleEligibility(lead: DiscoveryLead, profile: SearchProfile, constraint?: DiscoverySourceConstraint) {
  const title = normalized(lead.title);
  const department = normalized(lead.department || (lead.verification?.rawDetails as any)?.department);
  const team = normalized(lead.team || (lead.verification?.rawDetails as any)?.team);
  const context = `${department} ${team}`.trim();
  const description = normalized(lead.description);
  const families = new Set(configuredFamilies(profile, constraint));
  const seniority = classifyDiscoverySeniority(lead.title);
  if (!title) return { eligible: false, reason: 'ROLE_EVIDENCE_INSUFFICIENT' as const, seniority };
  if (!families.size) return { eligible: false, reason: 'ROLE_FAMILY_MISMATCH' as const, seniority };
  if (seniority === 'DIRECTOR_MANAGEMENT') return { eligible: false, reason: 'MANAGEMENT_ROLE' as const, seniority };
  if (seniority === 'STAFF' || seniority === 'PRINCIPAL') return { eligible: false, reason: 'SENIORITY_INCOMPATIBLE' as const, seniority };
  if ((profile.excludedRolePatterns || []).some(pattern => {
    const excluded = normalized(pattern);
    return excluded && title.includes(excluded);
  }))
    return { eligible: false, reason: 'ROLE_FAMILY_MISMATCH' as const, seniority };

  const primaryExclusion = primaryRoleExclusion(lead);
  if (primaryExclusion) return { eligible: false, reason: primaryExclusion, seniority };

  const businessBlocker = /\b(product manager|program manager|project manager|account executive|sales|partnerships?|partner solutions?|pre sales|presales|finance|accounting|recruit(?:er|ing)|human resources?|legal|policy|customer success|revenue operations?|marketing|communications?|business operations?|revenue analyst)\b/;
  const researchLeadership = /\b(machine learning|ml|ai)\b.*\b(manager|director|head|lead)\b|\b(manager|director|head|lead)\b.*\b(machine learning|ml|ai research)\b/;
  if (researchLeadership.test(title))
    return { eligible: false, reason: 'MANAGEMENT_ROLE' as const, seniority };

  const accepts = (family: PrimaryRoleFamily) => families.has(family);
  const forwardDeployed = /\bforward deployed (?:software )?(?:engineer|developer)\b|\bsoftware (?:engineer|developer)\b.*\bforward deployed\b/.test(title);
  const explicitNonTargetDomain = /\b(data|analytics?|machine learning|ml|security|quality assurance|qa|test automation|infrastructure|cloud|compute|networking|network|devops|site reliability|sre|mobile|ios|android|embedded|firmware|backend|back end)\b/;
  const buildsSoftware = assertedClauses(lead.description).some(clause => /\b(?:build|develop|implement|ship|deliver|maintain|own)\b(?: [a-z]+){0,6} (?:production software|customer integrations|integrations|applications|apis|software|user interfaces|front end|frontend)\b/.test(clause));
  if (forwardDeployed) {
    const businessOnly = assertedClauses(lead.description).some(clause =>
      /\b(?:this|the) (?:role|position|job) (?:is|will be) (?:an? )?(?:nontechnical|non technical|non engineering|business only)\b|\b(?:your |the )?(?:primary|main) (?:focus|responsibility|responsibilities) (?:is|are|will be) (?:(?:providing|preparing|performing) )?(?:financial reporting|bookkeeping|accounting|legal advice|legal counsel|contract review)(?: only)?$/.test(clause))
      || discoveryClauses(lead.description).some(clause => /\b(?:this|the) (?:role|position|job) (?:does not|will not) (?:involve|include|require) (?:any )?(?:software development|software engineering|engineering work)\b/.test(clause));
    if (businessOnly) return { eligible: false, reason: 'NON_ENGINEERING_ROLE' as const, seniority };
    if (/\b(pre sales|presales)\b/.test(title)) return { eligible: false, reason: 'PRE_SALES_PRIMARY_ROLE' as const, seniority };
    if (explicitNonTargetDomain.test(title) || !accepts('forward-deployed-software'))
      return { eligible: false, reason: 'ROLE_FAMILY_MISMATCH' as const, seniority };
    return { eligible: true, family: 'forward-deployed-software' as const, seniority,
      evidence: buildsSoftware ? 'DESCRIPTION' as const : 'TITLE' as const,
      reason: buildsSoftware ? 'SOFTWARE_DELIVERY' as const : 'ROLE_SCOPE_UNKNOWN_PASS' as const };
  }
  const genericSoftware = /\bsoftware (?:development )?(?:engineer|developer)\b|\b(?:engineer|developer),? software\b/.test(title);
  if (businessBlocker.test(title) && !genericSoftware)
    return { eligible: false, reason: 'NON_ENGINEERING_ROLE' as const, seniority };

  const developerFacing = /\b(developer advocate|developer relations(?: engineer)?)\b/.test(title);
  const customerFacing = /\b(solutions? engineer|solutions? architect|implementation engineer|customer engineer)\b/.test(title);
  if (developerFacing || customerFacing) {
    const technicalContext = /\b(engineering|software|developer experience|developer relations|product)\b/.test(context);
    if (developerFacing && technicalContext && accepts('ui-platform-design-systems') && profile.preferredModifiers?.includes('DEVELOPER_TOOLING'))
      return { eligible: true, family: 'ui-platform-design-systems' as const, seniority, evidence: 'STRUCTURED_METADATA' as const };
    if (customerFacing && (technicalContext || buildsSoftware) && accepts('forward-deployed-software'))
      return { eligible: true, family: 'forward-deployed-software' as const, seniority,
        evidence: buildsSoftware ? 'DESCRIPTION' as const : 'STRUCTURED_METADATA' as const,
        reason: buildsSoftware ? 'SOFTWARE_DELIVERY' as const : 'ROLE_SCOPE_UNKNOWN_PASS' as const };
    return { eligible: false, reason: 'ROLE_FAMILY_MISMATCH' as const, seniority };
  }

  const explicitFrontendTitle = /\b(front ?end|ui|web)\b.*\b(engineer|developer)\b|\b(engineer|developer)\b.*\b(front ?end|ui|web)\b/;
  const frontendDescription = /\b(react|front ?end|user interface|design systems?|component librar(?:y|ies)|storybook|browser ui|web application)\b/;
  const backendDescription = /\b(kubernetes|microservices?|distributed systems?|cloud infrastructure|site reliability|sre|golang|\bgo\b|rust|java|python|terraform|networking)\b/;
  const matchedFamily =
    (/\b(design systems?|ui platform|frontend platform|front end platform)\b.*\b(engineer|developer)\b|\b(engineer|developer)\b.*\b(design systems?|ui platform|frontend platform|front end platform)\b/.test(title) && accepts('ui-platform-design-systems')) ? 'ui-platform-design-systems' :
    (/\b(developer experience|developer productivity|devex)\b.*\b(engineer|developer)\b|\b(engineer|developer)\b.*\b(developer experience|developer productivity|devex)\b/.test(title) && accepts('ui-platform-design-systems')) ? 'ui-platform-design-systems' :
    (explicitFrontendTitle.test(title) && !explicitNonTargetDomain.test(title) && accepts('frontend-product')) ? 'frontend-product' :
    (/\bproduct\b.*\b(engineer|developer)\b|\b(engineer|developer)\b.*\bproduct\b/.test(title) && (accepts('frontend-product') || accepts('frontend-heavy-fullstack'))) ? (accepts('frontend-product') ? 'frontend-product' : 'frontend-heavy-fullstack') :
    (/\bfull ?stack\b.*\b(engineer|developer)\b|\b(engineer|developer)\b.*\bfull ?stack\b/.test(title) && accepts('frontend-heavy-fullstack') && (!description || frontendDescription.test(description) || !backendDescription.test(description))) ? 'frontend-heavy-fullstack' :
    (/\bproduction\b.*\b(engineer|developer)\b|\b(engineer|developer)\b.*\bproduction\b/.test(title) && accepts('production-support-frontend')) ? 'production-support-frontend' :
    undefined;
  if (matchedFamily) return { eligible: true, family: matchedFamily, seniority, evidence: 'TITLE' as const };

  const fullStackTitle = /\bfull ?stack\b/.test(title) && /\b(engineer|developer)\b/.test(title);
  if (fullStackTitle && description && backendDescription.test(description) && !frontendDescription.test(description))
    return { eligible: false, reason: 'BACKEND_HEAVY_FULL_STACK' as const, seniority };
  if (explicitNonTargetDomain.test(title)) return { eligible: false, reason: 'NON_TARGET_DOMAIN' as const, seniority };
  const genericEngineer = /^(?:(?:associate|junior|mid|senior|staff|principal|lead) )?engineer(?:\s+(?:i{1,4}|\d+))?$/.test(title);
  if ((genericSoftware || genericEngineer) && description && frontendDescription.test(description) && !backendDescription.test(title) && accepts('frontend-heavy-fullstack'))
    return { eligible: true, family: 'frontend-heavy-fullstack' as const, seniority, evidence: 'DESCRIPTION' as const };

  if ((genericSoftware || genericEngineer) && description && backendDescription.test(description) && !frontendDescription.test(description))
    return { eligible: false, reason: 'NON_TARGET_DOMAIN' as const, seniority };
  return { eligible: false, reason: genericSoftware || genericEngineer ? 'ROLE_EVIDENCE_INSUFFICIENT' as const : 'ROLE_FAMILY_MISMATCH' as const, seniority };
}

const US_LOCATION = /\b(united states|u s a?|usa|us)\b/;
const US_WORKING_CONTEXT = /\b(?:united states|u s a?|usa|us)\b(?:\W+\w+){0,2}\W+(?:time\s*zones?|(?:working\s+)?hours?|overlap|(?:eastern|central|mountain|pacific)\s+time)\b|\b(?:time\s*zones?|(?:working\s+)?hours?|overlap|(?:eastern|central|mountain|pacific)\s+time)\b(?:\W+\w+){0,4}\W+(?:united states|u s a?|usa|us)\b|\b(?:est|edt|cst|cdt|mst|mdt|pst|pdt)\s+(?:united states|u s a?|usa|us)\b/;
const CLEAR_NON_US_LOCATION = /\b(emea|europe|european union|united kingdom|uk|canada|apac|asia pacific|australia|new zealand|india|germany|france|spain|italy|ireland|netherlands|poland|portugal|sweden|norway|denmark|switzerland|mexico|brazil|argentina)\b/;
const REMOTE_WORD = /\b(remote|distributed|work from home)\b/;

function canadianGeography(location: string): boolean {
  if (/\b(canada|canadian)\b/.test(location)) return true;
  // Ontario is also a California city; an isolated CA is never country evidence.
  if (/\b(california|united states|u s a?|usa|us)\b/.test(location)) return false;
  return /\btoronto (?:ontario|on)\b|\b(?:on|qc|bc|ab|mb|nb|nl|ns|nt|nu|pe|sk|yt) ca\b/.test(location);
}

/** Reject only clear incompatibilities; missing or ambiguous geography passes. */
export function locationEligibility(lead: DiscoveryLead, profile: SearchProfile, constraint?: DiscoverySourceConstraint) {
  const details = lead.verification?.rawDetails as any;
  const rawLocations = [lead.location, ...(lead.secondaryLocations || details?.secondaryLocations || [])]
    .filter((location): location is string => typeof location === 'string' && !!location.trim());
  const locations = rawLocations.map(normalized).filter(Boolean);
  const locationText = locations.join(' ');
  const locationAlternatives = rawLocations.flatMap(location => location.split(/\s+(?:or|and)\s+|\s*[\/;]\s*/i).map(normalized).filter(Boolean));
  const status = lead.remoteStatus ?? details?.remoteStatus
    ?? providerWorkplaceStatus(lead.workplaceType || details?.workplaceType, details?.providerMetadata?.metadata);
  const explicitRemote = status === 'remote' || REMOTE_WORD.test(locationText);
  const clauses = assertedClauses(lead.description);
  const mandatoryAttendance = clauses.some(clause =>
    /\b(?:you|candidates|applicants|employees) (?:must|are required to|will need to|are expected to) (?:work|be|be present|be based|report|come) (?:on site|onsite|in person|in office|(?:at|from|in|to)(?: [a-z]+){0,6} office)\b/.test(clause)
    || /\b(?:you|candidates|applicants|employees) (?:must|are required to|will need to|are expected to) attend(?: [a-z]+){0,6} office\b/.test(clause)
    || /\b(?:this|the) (?:role|position|job) requires (?:regular |weekly |daily )?(?:on site|onsite|in person|in office|hybrid) (?:attendance|presence|work)\b/.test(clause)
    || /\b(?:mandatory|required) (?:on site|onsite|hybrid|in person|in office) (?:attendance|presence|work)\b|\b(?:on site|onsite|in person|in office|hybrid attendance|office attendance) (?:is )?(?:mandatory|required)\b/.test(clause));
  const explicitOnsite = status === 'onsite' || mandatoryAttendance;
  const explicitHybrid = status === 'hybrid';
  const isUsGeography = (location: string) => US_LOCATION.test(location) && !US_WORKING_CONTEXT.test(location);
  const metadata = details?.providerMetadata;
  const address = metadata?.address;
  const countries = [...providerMetadataValues(metadata?.metadata, ['country', 'country code']), address?.country, address?.countryCode, address?.country_code]
    .filter((value): value is string => typeof value === 'string' && !!value.trim()).map(normalized);
  const provinces = [...providerMetadataValues(metadata?.metadata, ['province', 'province code', 'state province']), address?.province, address?.region, address?.state]
    .filter((value): value is string => typeof value === 'string').map(normalized);
  const metadataUs = countries.some(country => isUsGeography(country));
  const metadataCanada = countries.some(country => country === 'ca' || canadianGeography(country))
    || (!countries.length && provinces.some(province => /^(?:on|ontario|qc|quebec|bc|british columbia|ab|alberta|mb|manitoba|nb|new brunswick|nl|newfoundland and labrador|ns|nova scotia|nt|northwest territories|nu|nunavut|pe|prince edward island|sk|saskatchewan|yt|yukon)$/.test(province)));
  const usRemotePermission = clauses.some(clause => !US_WORKING_CONTEXT.test(clause)
    && /\b(?:you|candidates|applicants|employees) (?:may|can|are permitted to|are allowed to) work (?:remotely|remote) (?:from|in) (?:the )?(?:united states|usa|us)\b|\b(?:us|usa|united states) remote (?:employment|work) (?:is )?(?:permitted|allowed|available)\b/.test(clause));
  const isNonUsGeography = (location: string) => CLEAR_NON_US_LOCATION.test(location) || canadianGeography(location);
  const hasUsLocation = metadataUs || usRemotePermission || locationAlternatives.some(isUsGeography);
  const hasNonUsLocation = metadataCanada || locationAlternatives.some(isNonUsGeography);
  const hasUnknownAlternative = locationAlternatives.length > 1
    && !metadataCanada && !metadataUs
    && locationAlternatives.some(location => !isUsGeography(location) && !isNonUsGeography(location) && !US_WORKING_CONTEXT.test(location));
  const nonUsOnly = hasNonUsLocation && !hasUsLocation && !hasUnknownAlternative;
  const usRemoteAlternative = !mandatoryAttendance && (usRemotePermission || locationAlternatives.some(location => isUsGeography(location) && REMOTE_WORD.test(location)));
  const requiresAttendance = (explicitOnsite || explicitHybrid) && !usRemoteAlternative;
  const allowedLocal = (profile.hybridLocations || []).some(place => {
    const target = normalized(place);
    return target && (locationText.includes(target) || target.includes(locationText));
  });

  const policies = new Set(constraint?.locationPolicies || []);
  if (!profile.relocationAllowed && clauses.some(clause => /\b(?:must|are required to|will need to) relocate\b|\brelocation (?:is )?(?:mandatory|required)\b|\b(?:this|the) (?:role|position|job) requires relocation\b/.test(clause)))
    return { eligible: false, reason: 'RELOCATION_REQUIRED' as const };
  if (nonUsOnly)
    return { eligible: false, reason: 'LOCATION_INCOMPATIBLE' as const };
  if (profile.remotePreference === 'remote_only' && requiresAttendance)
    return { eligible: false, reason: 'LOCATION_INCOMPATIBLE' as const };
  if (profile.remotePreference === 'hybrid_flexible' && requiresAttendance && locations.length && !allowedLocal)
    return { eligible: false, reason: 'LOCATION_INCOMPATIBLE' as const };

  const policyIsPermissive = !policies.size || policies.has('ANY') || policies.has('UNKNOWN');
  if (!policyIsPermissive && policies.has('REMOTE_OK') && requiresAttendance)
    return { eligible: false, reason: 'LOCATION_INCOMPATIBLE' as const };
  if (!policyIsPermissive && policies.has('LOCAL_HYBRID') && requiresAttendance && locations.length && !allowedLocal)
    return { eligible: false, reason: 'LOCATION_INCOMPATIBLE' as const };
  return { eligible: true, reason: explicitRemote || explicitOnsite || explicitHybrid ? 'LOCATION_COMPATIBLE' as const : 'LOCATION_UNKNOWN_PASS' as const };
}

export function matchesSearchProfile(lead: DiscoveryLead, profile: SearchProfile, constraint?: DiscoverySourceConstraint): boolean {
  const company = lower(lead.company);
  if ((profile.companyExclusions || []).some(excluded => excluded.trim() && company === lower(excluded))) return false;
  if (!employmentEligibility(lead, profile).eligible) return false;
  return roleEligibility(lead, profile, constraint).eligible && locationEligibility(lead, profile, constraint).eligible;
}

function discoveryIdentity(lead: DiscoveryLead): Partial<JobRecord> {
  const detected = detectAtsProvider(lead.url);
  const details = lead.verification?.rawDetails as any;
  return {
    atsProvider: details?.atsProvider || detected.provider,
    atsBoard: details?.atsBoard || detected.board,
    atsJobId: details?.atsJobId || detected.jobId,
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
  constraints: ReadonlyMap<string, DiscoverySourceConstraint> = new Map(),
  options: { windowDays?: DiscoveryWindowDays; now?: number } = {}
) {
  const windowDays = options.windowDays ?? 14;
  const now = options.now ?? Date.now();
  const enabled = sources.filter(source => source.enabled).slice(0, 50);
  const settled = await Promise.allSettled(enabled.map(source => scan(source)));
  const sourceResults: DiscoverySourceResult[] = [];
  const matchedBySource: DiscoveryLead[][] = [];
  const filterCounts = { profileExcluded:0, companyExcluded:0, employmentExcluded:0, employmentNotAllowed:0, roleExcluded:0, locationExcluded:0, knownOlderExcluded:0, futureExcluded:0, unknownDateUnselected:0, capUnselected:0 };
  settled.forEach((result, index) => {
    const source = enabled[index];
    if (result.status === 'rejected') {
      const health: DiscoverySourceHealth = result.reason instanceof DiscoveryProviderError ? result.reason.health : 'UNKNOWN_FAILURE';
      sourceResults.push({ sourceId: source.id, status: 'FAILED', health, fetched: 0, roleEligible: 0, locationEligible: 0, selected: 0 });
      matchedBySource.push([]);
      return;
    }
    const constraint = constraints.get(source.id);
    const profileEligible = result.value.filter(lead => {
      const company = lower(lead.company);
      if ((profile.companyExclusions || []).some(excluded => excluded.trim() && company === lower(excluded))) { filterCounts.companyExcluded++; return false; }
      const employment = employmentEligibility(lead, profile);
      if (employment.reason === 'EMPLOYMENT_EXCLUDED') { filterCounts.employmentExcluded++; return false; }
      if (employment.reason === 'EMPLOYMENT_NOT_ALLOWED') { filterCounts.employmentNotAllowed++; return false; }
      return true;
    });
    const roleEligible = profileEligible.filter(lead => roleEligibility(lead, profile, constraint).eligible);
    const locationEligible = roleEligible.filter(lead => locationEligibility(lead, profile, constraint).eligible);
    filterCounts.profileExcluded += result.value.length - profileEligible.length;
    filterCounts.roleExcluded += profileEligible.length - roleEligible.length;
    filterCounts.locationExcluded += roleEligible.length - locationEligible.length;
    const health: DiscoverySourceHealth = result.value.length === 0 ? 'EMPTY_BOARD' : locationEligible.length === 0 ? 'ZERO_ELIGIBLE' : 'SUCCESS';
    sourceResults.push({ sourceId: source.id, status: 'SUCCESS', health, fetched: result.value.length, roleEligible: roleEligible.length, locationEligible: locationEligible.length, selected: 0 });
    matchedBySource.push(locationEligible);
  });
  const { queues, stats: dedupeStats } = deduplicateDiscoveryLeads(matchedBySource);
  const datedQueues = queues.map(queue => {
    const known: Array<{ lead:DiscoveryLead; timestamp:number }> = [];
    const unknown: DiscoveryLead[] = [];
    for (const lead of queue.leads) {
      const publishedAt = (lead.verification?.rawDetails as any)?.publishedAt;
      const window = publicationWindowStatus(publishedAt, windowDays, now);
      if (window.status === 'IN_WINDOW') known.push({ lead, timestamp:window.timestamp! });
      else if (window.status === 'UNKNOWN') unknown.push(lead);
      else if (window.status === 'OLDER') filterCounts.knownOlderExcluded++;
      else filterCounts.futureExcluded++;
    }
    known.sort((a,b)=>b.timestamp-a.timestamp || normalizedJobUrl(a.lead.url)!.localeCompare(normalizedJobUrl(b.lead.url)!));
    return { sourceIndex:queue.sourceIndex, known, unknown };
  });
  const selectFair = <T>(pool: Array<{sourceIndex:number;items:T[]}>, limit:number, compare?: (a:{sourceIndex:number;item:T},b:{sourceIndex:number;item:T})=>number) => {
    const selected: Array<{sourceIndex:number;item:T}> = [];
    while (selected.length < limit) {
      const round = pool.flatMap(queue => queue.items.length ? [{sourceIndex:queue.sourceIndex,item:queue.items.shift()!}] : []);
      if (!round.length) break;
      if (compare) round.sort(compare);
      for (const item of round) {
        if (selected.length === limit) { pool.find(queue=>queue.sourceIndex===item.sourceIndex)!.items.unshift(item.item); continue; }
        selected.push(item);
      }
    }
    return selected;
  };
  const unknownAvailable = datedQueues.reduce((sum,queue)=>sum+queue.unknown.length,0);
  const unknownQuota = Math.min(UNKNOWN_DATE_LIMIT, unknownAvailable);
  const knownPool = datedQueues.map(queue=>({sourceIndex:queue.sourceIndex,items:queue.known}));
  const knownSelected = selectFair(knownPool, DISCOVERY_LIMIT-unknownQuota, (a,b)=>(b.item as any).timestamp-(a.item as any).timestamp || a.sourceIndex-b.sourceIndex);
  const unknownPool = datedQueues.map(queue=>({sourceIndex:queue.sourceIndex,items:queue.unknown}));
  const unknownSelected = selectFair(unknownPool, unknownQuota);
  const selected = [
    ...knownSelected.map(item=>({sourceIndex:item.sourceIndex,lead:(item.item as {lead:DiscoveryLead}).lead})),
    ...unknownSelected.map(item=>({sourceIndex:item.sourceIndex,lead:item.item as DiscoveryLead}))
  ];
  for (const item of selected) sourceResults[item.sourceIndex].selected++;
  const knownUnselected = knownPool.reduce((sum,queue)=>sum+queue.items.length,0);
  filterCounts.capUnselected = knownUnselected;
  filterCounts.unknownDateUnselected = unknownPool.reduce((sum,queue)=>sum+queue.items.length,0);
  const jobs = await buildDiscoveredJobs(selected.map(item=>item.lead), verify);
  return {
    jobs, sourceResults,
    discoveryRequestsUsed: enabled.length, queryBudgetUsed: enabled.length, queryBudgetUnit: 'public_board_scans' as const,
    dedupeStats,
    diagnostics: {
      requestedWindowDays:windowDays,
      searchedAt:new Date(now).toISOString(),
      candidatesEncountered:sourceResults.reduce((sum,result)=>sum+result.fetched,0),
      filterCounts,
      duplicatesRemoved:dedupeStats.candidateTraversals-dedupeStats.acceptedUnique,
      selectedForVerification:selected.length,
      successfullyVerified:jobs.filter(job=>['LISTED','UNLISTED'].includes(job.verificationStatus)).length,
    }
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
