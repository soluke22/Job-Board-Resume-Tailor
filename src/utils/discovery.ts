import type { AtsProvider, JobRecord, SearchProfile } from '../types/index.js';

export type PublicBoardProvider = Extract<AtsProvider, 'ashby' | 'greenhouse' | 'lever'>;

export interface DiscoverySource {
  id: string;
  company: string;
  provider: PublicBoardProvider;
  boardId: string;
  boardUrl: string;
  enabled: boolean;
  origin: 'configured' | 'learned';
  validatedAt?: string;
  removed?: boolean;
}

const values = (items: string[] | undefined, count: number) =>
  (items || []).map(item => item.trim()).filter(Boolean).slice(0, count);
const searchValues = (items: string[] | undefined, count: number) =>
  values(items, count).map(item => item.replace(/"/g, '').slice(0, 80).trim()).filter(Boolean);
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

export function validateDiscoveryProfile(profile: SearchProfile, maximum = 10) {
  if (!profile || !Array.isArray(profile.preferredRoleFamilies) || !Array.isArray(profile.technologyStrengths))
    throw new Error('Configure valid search preferences first.');
  if (!Number.isInteger(maximum) || maximum < 1 || maximum > 10) throw new Error('Query maximum must be 1-10.');
}

/** Query inputs are an explicit allowlist; candidate identity/evidence never enters this function. */
export function buildDiscoveryQueries(profile: SearchProfile, maximum = 10): string[] {
  validateDiscoveryProfile(profile, maximum);
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
  return [...new Set(candidates.map(query => query.replace(/\s+/g, ' ').trim()).filter(Boolean))].slice(0, maximum);
}

export const googleSearchUrl = (query: string) => `https://www.google.com/search?${new URLSearchParams({ q: query })}`;

export function assessmentSearchProfile(profile: SearchProfile | null): Omit<SearchProfile, 'discoverySources'> | null {
  if (!profile) return null;
  const { discoverySources: _sources, ...assessmentProfile } = profile;
  return assessmentProfile;
}

function sourceId(provider: PublicBoardProvider, boardId: string, boardUrl: string) {
  return `${provider}:${new URL(boardUrl).hostname}:${boardId}`;
}

function validBoardId(value: string) {
  if (!value || value.length > 200 || !/^[A-Za-z0-9._~-]+$/.test(value)) throw new Error('Board identifier is invalid.');
  return value;
}

export function parseDiscoverySource(input: string, company: string): DiscoverySource {
  const label = company.trim().slice(0, 200);
  if (!label) throw new Error('Company label is required.');
  const raw = input.trim();
  let provider: PublicBoardProvider;
  let boardId: string;
  let host: string;
  const identifier = raw.match(/^(ashby|greenhouse|lever|lever-eu):([A-Za-z0-9._~-]+)$/i);
  if (identifier) {
    provider = identifier[1].toLowerCase().startsWith('lever') ? 'lever' : identifier[1].toLowerCase() as PublicBoardProvider;
    boardId = validBoardId(identifier[2]);
    host = identifier[1].toLowerCase() === 'lever-eu' ? 'jobs.eu.lever.co' : provider === 'ashby' ? 'jobs.ashbyhq.com' : provider === 'greenhouse' ? 'job-boards.greenhouse.io' : 'jobs.lever.co';
  } else {
    let url: URL;
    try { url = new URL(raw); } catch { throw new Error('Use a supported public board URL or provider:board identifier.'); }
    if (url.protocol !== 'https:' || url.username || url.password || url.port) throw new Error('Board URL must be public HTTPS.');
    host = url.hostname.toLowerCase();
    const path = url.pathname.split('/').filter(Boolean).map(segment => decodeURIComponent(segment));
    if (['jobs.ashbyhq.com', 'api.ashbyhq.com'].includes(host)) {
      provider = 'ashby'; boardId = validBoardId(host === 'api.ashbyhq.com' ? path[path.indexOf('job-board') + 1] : path[0]);
    } else if (['boards.greenhouse.io', 'job-boards.greenhouse.io', 'boards-api.greenhouse.io'].includes(host)) {
      provider = 'greenhouse'; boardId = validBoardId(host === 'boards-api.greenhouse.io' ? path[path.indexOf('boards') + 1] : path[0]); host = 'job-boards.greenhouse.io';
    } else if (['jobs.lever.co', 'jobs.eu.lever.co', 'api.lever.co', 'api.eu.lever.co'].includes(host)) {
      provider = 'lever'; boardId = validBoardId(host.startsWith('api.') ? path[path.indexOf('postings') + 1] : path[0]); host = host.includes('.eu.') ? 'jobs.eu.lever.co' : 'jobs.lever.co';
    } else throw new Error('Only Ashby, Greenhouse and Lever public boards are supported.');
  }
  const boardUrl = `https://${host}/${encodeURIComponent(boardId)}`;
  return { id: sourceId(provider, boardId, boardUrl), company: label, provider, boardId, boardUrl, enabled: true, origin: 'configured' };
}

export function learnedDiscoverySources(jobs: JobRecord[]): DiscoverySource[] {
  const learned: DiscoverySource[] = [];
  for (const job of jobs) {
    if (!['LISTED', 'UNLISTED'].includes(job.verificationStatus) || !job.company.trim() || !job.atsBoard || !['ashby', 'greenhouse', 'lever'].includes(job.atsProvider)) continue;
    try {
      const configured = parseDiscoverySource(job.canonicalUrl || job.applyUrl || `${job.atsProvider}:${job.atsBoard}`, job.company);
      learned.push({ ...configured, origin: 'learned', validatedAt: job.lastVerifiedAt });
    } catch { /* unsupported or incomplete identity remains unknown */ }
  }
  return learned;
}

export function discoverySourcesForWorkspace(profile: SearchProfile, jobs: JobRecord[]): DiscoverySource[] {
  const configured = profile.discoverySources || [];
  const byIdentity = new Map<string, DiscoverySource>();
  const removed = new Set(configured.filter(source => source.removed).map(source => `${source.provider}:${source.boardId}`));
  for (const source of [...configured.filter(source => !source.removed), ...learnedDiscoverySources(jobs)]) {
    const key = `${source.provider}:${source.boardId}`;
    if (removed.has(key)) continue;
    if (!byIdentity.has(key) || source.origin === 'configured') byIdentity.set(key, source);
  }
  return [...byIdentity.values()].slice(0, 50);
}
