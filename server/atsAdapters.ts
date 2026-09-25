import { AtsProvider, AtsVerificationStatus } from '../src/types/index.js';
import { safeFetchText } from './safeFetch.js';
export interface JobVerificationResult {
  status: AtsVerificationStatus; isListed: boolean; lastVerifiedAt: string;
  canonicalUrl?: string; applyUrl?: string; compensation?: any; rawDetails?: any; notes?: string;
  verificationSource?: string;
}
export interface AtsAdapter {
  provider: AtsProvider;
  detect(url: string): {isMatch: boolean; board?: string; jobId?: string};
  verify(url: string, board?: string, jobId?: string): Promise<JobVerificationResult>;
}
const result = (status: AtsVerificationStatus, extra = {}): JobVerificationResult =>
  ({status, isListed: status === 'LISTED', lastVerifiedAt: new Date().toISOString(), ...extra});
export function providerDate(value: unknown): string | undefined {
  if (typeof value !== 'string' && typeof value !== 'number') return undefined;
  const time = typeof value === 'number' ? value : Date.parse(value);
  return Number.isFinite(time) ? new Date(time).toISOString() : undefined;
}
function detect(url: string, hosts: string[], provider: string) {
  try {
    const u = new URL(url);
    if (!['http:', 'https:'].includes(u.protocol) || !hosts.includes(u.hostname)) return {isMatch: false};
    let p = u.pathname.split('/').filter(Boolean);
    if (u.hostname.startsWith('api.') || u.hostname === 'boards-api.greenhouse.io')
      p = p.slice(p.indexOf(provider === 'ashby' ? 'job-board' : provider === 'greenhouse' ? 'boards' : 'postings') + 1);
    const jobId = provider === 'greenhouse' ? (p.includes('jobs') ? p[p.indexOf('jobs') + 1] : u.searchParams.get('gh_jid') || undefined) : p[1];
    return {isMatch: true, board: p[0], jobId};
  } catch { return {isMatch: false}; }
}
async function providerFetch(url: string) {
  const r = await fetch(url, {redirect: 'error', signal: AbortSignal.timeout(8000), headers: {Accept: 'application/json'}});
  if (!r.ok) { await r.body?.cancel(); return {status: r.status, data: undefined}; }
  if (!/application\/json/i.test(r.headers.get('content-type') || '')) throw new Error('Content type');
  const reader = r.body?.getReader(); if (!reader) throw new Error('Missing body');
  const chunks: Uint8Array[] = []; let size = 0;
  try { while (true) { const {done, value} = await reader.read(); if (done) break;
    size += value.length; if (size > 4 * 1024 * 1024) throw new Error('Size limit'); chunks.push(value);
  } } finally { await reader.cancel(); }
  return {status: r.status, data: JSON.parse(Buffer.concat(chunks).toString('utf8'))};
}
const content = (...v: any[]) => v.filter(x => typeof x === 'string' && x.trim()).join('\n\n') || undefined;
function canonical(v: any) { try { const u = new URL(v); return ['http:', 'https:'].includes(u.protocol) ? u.href : undefined; } catch { return undefined; } }
function adapter(provider: 'ashby' | 'greenhouse' | 'lever', hosts: string[]): AtsAdapter {
  return {
    provider, detect: url => detect(url, hosts, provider),
    async verify(url, board, jobId) {
      const d = this.detect(url); board ||= d.board; jobId ||= d.jobId;
      if (!board || !jobId) return result('UNKNOWN');
      try {
        const b = encodeURIComponent(board), id = encodeURIComponent(jobId);
        const leverHost = new URL(url).hostname.includes('.eu.') ? 'api.eu.lever.co' : 'api.lever.co';
        const endpoint = provider === 'ashby' ? `https://api.ashbyhq.com/posting-api/job-board/${b}?includeCompensation=true`
          : provider === 'greenhouse' ? `https://boards-api.greenhouse.io/v1/boards/${b}/jobs/${id}?pay_transparency=true`
          : `https://${leverHost}/v0/postings/${b}/${id}?mode=json`;
        const {status, data} = await providerFetch(endpoint);
        if (status === 404 && provider !== 'ashby') return result('NOT_LISTED');
        if (status !== 200) return result('UNKNOWN');
        let j = data;
        if (provider === 'ashby') {
          if (!Array.isArray(data?.jobs)) return result('UNKNOWN');
          j = data.jobs.find((x: any) => x.id === jobId || this.detect(x.jobUrl || '').jobId === jobId);
          if (!j) return result('NOT_LISTED', {notes: 'Exact posting absent from successful published-postings feed; no closure reason inferred.'});
          if (typeof j.isListed !== 'boolean') return result('UNKNOWN');
        } else if (String(j?.id) !== jobId || typeof (provider === 'lever' ? j.text : j.title) !== 'string') return result('UNKNOWN');
        const canonicalUrl = canonical(provider === 'ashby' ? j.jobUrl : provider === 'greenhouse' ? j.absolute_url : j.hostedUrl);
        const applyUrl = canonical(provider === 'greenhouse' ? j.absolute_url : j.applyUrl);
        const compensation = provider === 'ashby' && j.compensation ? {raw: content(j.compensation.compensationTierSummary, j.compensation.scrapeableCompensationSalarySummary)}
          : provider === 'lever' && j.salaryRange ? {
            min: j.salaryRange.min, max: j.salaryRange.max, currency: j.salaryRange.currency,
            interval: ['year','month','hour'].includes(j.salaryRange.interval) ? j.salaryRange.interval : undefined,
            raw: j.salaryDescriptionPlain
          } : undefined;
        const rawDetails = {
          atsProvider: provider, atsBoard: board, atsJobId: jobId, title: provider === 'lever' ? j.text : j.title,
          company: typeof j.companyName === 'string' ? j.companyName.trim() : typeof j.company === 'string' ? j.company.trim() : undefined,
          canonicalUrl, applyUrl,
          location: provider === 'greenhouse' ? j.location?.name : provider === 'lever' ? j.categories?.location : j.location,
          secondaryLocations: provider === 'ashby' ? j.secondaryLocations?.map((x: any) => typeof x === 'string' ? x : x.location) : undefined,
          remoteStatus: provider === 'lever' && ['remote','hybrid','onsite'].includes(j.workplaceType) ? j.workplaceType : j.isRemote === true ? 'remote' : 'unknown',
          workplaceType: j.workplaceType, employmentType: provider === 'lever' ? j.categories?.commitment : j.employmentType,
          department: provider === 'greenhouse' ? j.departments?.map((x: any) => x.name).join(', ') : j.department || j.categories?.department,
          team: j.team || j.categories?.team, compensation,
          publishedAt: providerDate(provider === 'greenhouse' ? j.first_published : provider === 'ashby' ? j.publishedAt : typeof j.createdAt === 'number' ? j.createdAt : undefined),
          updatedAt: provider === 'greenhouse' ? providerDate(j.updated_at) : undefined,
          rawContent: provider === 'ashby' ? content(j.descriptionPlain || j.descriptionHtml) : provider === 'greenhouse' ? content(j.content)
            : content(j.descriptionPlain || j.description, ...(j.lists || []).map((x: any) => content(x.text, x.content)), j.additionalPlain || j.additional),
          providerMetadata: {compensation: j.compensation, salaryRange: j.salaryRange, categories: j.categories, offices: j.offices, metadata: j.metadata, payInputRanges: j.pay_input_ranges, address: j.address, secondaryLocations: j.secondaryLocations, createdAt: j.createdAt},
          isCurrentlyListed: provider === 'ashby' ? j.isListed : true
        };
        return result(provider === 'ashby' && !j.isListed ? 'UNLISTED' : 'LISTED', {canonicalUrl, applyUrl, rawDetails, compensation, verificationSource: endpoint});
      } catch { return result('UNKNOWN'); }
    }
  };
}
export const ashbyAdapter = adapter('ashby', ['jobs.ashbyhq.com', 'api.ashbyhq.com']);
export const greenhouseAdapter = adapter('greenhouse', ['boards.greenhouse.io', 'job-boards.greenhouse.io', 'boards-api.greenhouse.io']);
export const leverAdapter = adapter('lever', ['jobs.lever.co', 'jobs.eu.lever.co', 'api.lever.co', 'api.eu.lever.co']);
export const genericAdapter: AtsAdapter = {
  provider: 'company-careers', detect: () => ({isMatch: true}),
  verify: url => verifyGenericPage(url)
};
export async function verifyGenericPage(url: string, fetchPage = safeFetchText, verify = verifyPostingAts): Promise<JobVerificationResult> {
    try {
      const r = await fetchPage(url);
      // Redirect/canonical links are discovery aliases, never listing evidence.
      // Only the supported provider's exact endpoint can promote the lead.
      if (r.url !== new URL(url).href && ['ashby', 'greenhouse', 'lever'].includes(detectAtsProvider(r.url).provider)) {
        return verify(r.url);
      }
      const canonicalTag = r.text.match(/<link\b[^>]*rel=["']canonical["'][^>]*>/i)?.[0];
      const canonicalHref = canonicalTag?.match(/href=["']([^"']+)["']/i)?.[1];
      if (r.status === 200 && canonicalHref) {
        const alias = new URL(canonicalHref.replace(/&amp;/g, '&'), r.url).href;
        if (['ashby', 'greenhouse', 'lever'].includes(detectAtsProvider(alias).provider)) return verify(alias);
      }
      return genericPageResult(url, r);
    } catch { return result('UNKNOWN'); }
}
export function genericPageResult(url: string, r: {status: number; url: string; text: string}) {
  const closed = r.status === 200 && r.url === new URL(url).href && /this job has closed|this position has been filled|job is no longer available|posting is no longer active/i.test(r.text);
  return result(closed ? 'NOT_LISTED' : 'UNKNOWN', {notes: closed ? 'Exact page explicitly reports closure.' : 'Reachability is not listing evidence.'});
}
export const atsAdapters = [ashbyAdapter, greenhouseAdapter, leverAdapter, genericAdapter];
export function detectAtsProvider(url: string): {provider: AtsProvider; board?: string; jobId?: string} {
  for (const a of atsAdapters.slice(0,3)) { const d = a.detect(url); if (d.isMatch) return {provider: a.provider, board: d.board, jobId: d.jobId}; }
  try {
    const h = new URL(url).hostname;
    for (const [domain, provider] of [['myworkdayjobs.com','workday'],['smartrecruiters.com','smartrecruiters'],['recruitee.com','recruitee']] as const)
      if (h === domain || h.endsWith(`.${domain}`)) return {provider};
  } catch { return {provider: 'unknown'}; }
  return {provider: 'company-careers'};
}
export async function verifyPostingAts(url: string, override?: AtsProvider, board?: string, jobId?: string): Promise<JobVerificationResult> {
  const d = detectAtsProvider(url), provider = override || d.provider;
  const a = atsAdapters.slice(0,3).find(a => a.provider === provider);
  if (a) return a.verify(url, board || d.board, jobId || d.jobId);
  if (!['company-careers','custom','unknown'].includes(provider)) return result('UNSUPPORTED');
  return genericAdapter.verify(url);
}
