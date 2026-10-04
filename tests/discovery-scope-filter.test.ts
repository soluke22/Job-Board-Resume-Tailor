import test from 'node:test';
import assert from 'node:assert/strict';
import {
  locationEligibility, roleEligibility, scanDiscoverySources, sourcesForDiscoveryScope,
  type DiscoveryLead, type DiscoverySourceConstraint
} from '../server/discovery';
import { DEFAULT_SEARCH_PROFILE } from '../src/data/privateSeedTemplate';
import type { CompanyWatchlistEntry, SearchProfile } from '../src/types';
import type { DiscoverySource } from '../src/utils/discovery';

const source = (id: string, enabled = true): DiscoverySource => ({
  id, company: `Synthetic ${id}`, provider: 'ashby', boardId: id,
  boardUrl: `https://jobs.ashbyhq.com/${id}`, enabled, origin: 'configured'
});
const watch = (id: string, atsSourceId?: string, changes: Partial<CompanyWatchlistEntry> = {}): CompanyWatchlistEntry => ({
  id, companyName: `Synthetic ${id}`, normalizedCompanyName: `synthetic ${id}`,
  status: 'ACTIVE', priority: 'MEDIUM', lanes: ['frontend-product'], locationPolicy: 'REMOTE_OK',
  atsSourceId, monitoringEnabled: true, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z', ...changes
});
const profile = (changes: Partial<SearchProfile> = {}): SearchProfile => ({
  ...structuredClone(DEFAULT_SEARCH_PROFILE), preferredRoleFamilies: ['frontend-product', 'ui-platform-design-systems', 'frontend-heavy-fullstack', 'production-support-frontend'],
  remotePreference: 'remote_only', discoverySources: [], ...changes
});
const lead = (title: string, location = 'Remote - US', changes: Partial<DiscoveryLead> = {}): DiscoveryLead => ({
  url: `https://jobs.ashbyhq.com/synthetic/${encodeURIComponent(title)}-${encodeURIComponent(location)}`,
  title, company: 'Synthetic Company', location, remoteStatus: /remote/i.test(location) ? 'remote' : 'unknown', source: 'public-board', ...changes
});
const constraint = (changes: Partial<DiscoverySourceConstraint> = {}): DiscoverySourceConstraint => ({
  roleFamilies: ['frontend-product', 'ui-platform-design-systems', 'frontend-heavy-fullstack', 'production-support-frontend'],
  locationPolicies: ['REMOTE_OK'], ...changes
});

test('WATCHLIST and ALL_ENABLED scopes enforce both watchlist and registry eligibility', async () => {
  const sources = [source('active'), source('unmonitored'), source('paused'), source('research'), source('removed-target'), source('non-watchlist'), source('disabled', false)];
  const search = profile({ discoverySources: sources });
  const entries = [
    watch('active-watch', 'active'),
    watch('duplicate-watch', 'active', { priority: 'HIGH', lanes: ['frontend-product', 'ui-platform-design-systems'] }),
    watch('unmonitored-watch', 'unmonitored', { monitoringEnabled: false }),
    watch('paused-watch', 'paused', { status: 'PAUSED', monitoringEnabled: false }),
    watch('research-watch', undefined, { status: 'RESEARCH', monitoringEnabled: false }),
    watch('disabled-watch', 'disabled'),
    watch('stale-watch', 'missing-source')
  ];
  const scoped = sourcesForDiscoveryScope(search, [], entries, 'WATCHLIST');
  assert.deepEqual(scoped.sources.map(item => item.id), ['active'], 'only active, monitored, linked, enabled registry sources participate');
  assert.deepEqual(scoped.constraints.get('active')?.roleFamilies, ['frontend-product', 'ui-platform-design-systems']);
  assert.equal(scoped.constraints.has('missing-source'), false, 'stale references fail closed');
  assert.equal(scoped.sources.filter(item => item.id === 'active').length, 1, 'duplicate watchlist references scan once');
  let providerRequests = 0;
  await scanDiscoverySources(scoped.sources, search, async () => { providerRequests++; return []; });
  assert.equal(providerRequests, 1, 'duplicate references produce one provider request');
  assert.equal(scoped.sources.some(item => item.id === 'removed-target'), false, 'a registry source whose watchlist target was removed stays excluded');
  assert.equal(scoped.sources.some(item => item.id === 'non-watchlist'), false, 'an enabled source never linked from the watchlist stays excluded');
  assert.equal(scoped.sources.some(item => item.id === 'disabled'), false, 'watchlist cannot resurrect a disabled source');
  assert.deepEqual(sourcesForDiscoveryScope(search, [], entries, 'ALL_ENABLED').sources.filter(item => item.enabled).map(item => item.id),
    ['active', 'unmonitored', 'paused', 'research', 'removed-target', 'non-watchlist'], 'ALL_ENABLED preserves enabled registry scanning');
});

test('positive engineering families survive and unrelated professions fail deterministically', () => {
  const search = profile();
  for (const title of ['Frontend Engineer', 'Software Engineer, Product', 'UI Engineer', 'Full Stack Engineer', 'Developer Experience Engineer', 'Design Systems Engineer'])
    assert.equal(roleEligibility(lead(title), search, constraint()).eligible, true, title);
  for (const title of ['Account Executive', 'Finance Manager', 'Partnerships Manager', 'Recruiting Coordinator', 'Policy Lead', 'Customer Success Operations Manager', 'Revenue Analyst', 'Machine Learning Research Manager'])
    assert.deepEqual(roleEligibility(lead(title), search, constraint()), { eligible: false, reason: 'ROLE_FAMILY_MISMATCH' }, title);

  const forward = constraint({ roleFamilies: ['forward-deployed-software'] });
  const forwardTitles = ['Forward Deployed Engineer', 'Forward Deployed Software Engineer', 'Software Engineer, Forward Deployed'];
  for (const title of forwardTitles) {
    assert.deepEqual(roleEligibility(lead(title), profile({ preferredRoleFamilies: ['forward-deployed-software'] }), forward), { eligible: true, family: 'forward-deployed-software' }, `${title} survives when the FDE family is enabled`);
    assert.deepEqual(roleEligibility(lead(title), search, constraint()), { eligible: false, reason: 'ROLE_FAMILY_MISMATCH' }, `${title} cannot fall through when the FDE family is disabled`);
  }
  for (const title of ['Forward Deployed Sales Engineer', 'Forward Deployed Data Engineer', 'Forward Deployed Security Engineer', 'Forward Deployed Solutions Engineer'])
    assert.deepEqual(roleEligibility(lead(title), profile({ preferredRoleFamilies: ['forward-deployed-software'] }), forward), { eligible: false, reason: 'ROLE_FAMILY_MISMATCH' }, `${title} is not a forward-deployed software occupation`);
  assert.equal(roleEligibility(lead('Product Engineer'), profile({ preferredRoleFamilies: ['frontend-product'] }), constraint({ roleFamilies: ['frontend-product'] })).eligible, true);
  for (const title of ['Software Engineer, Platform', 'Software Engineer, Developer Platform'])
    assert.equal(roleEligibility(lead(title), profile({ preferredRoleFamilies: ['ui-platform-design-systems'] }), constraint({ roleFamilies: ['ui-platform-design-systems'] })).eligible, true, `${title} survives with the configured platform family`);
  for (const title of ['Machine Learning Platform Engineer', 'Data Platform Engineer', 'Security Platform Engineer', 'Infrastructure Platform Engineer', 'Mobile Platform Engineer', 'Backend Platform Engineer'])
    assert.deepEqual(roleEligibility(lead(title), profile({ preferredRoleFamilies: ['ui-platform-design-systems'] }), constraint({ roleFamilies: ['ui-platform-design-systems'] })), { eligible: false, reason: 'ROLE_FAMILY_MISMATCH' }, `${title} cannot be relabeled as the target platform family`);
  for (const title of ['Sales Platform Engineer', 'Sales Engineer, Platform', 'Customer Success Platform Engineer', 'Revenue Operations Platform Engineer', 'Solutions Engineer, Developer Platform', 'Developer Advocate, Platform'])
    assert.deepEqual(roleEligibility(lead(title), profile({ preferredRoleFamilies: ['ui-platform-design-systems'] }), constraint({ roleFamilies: ['ui-platform-design-systems'] })), { eligible: false, reason: 'ROLE_FAMILY_MISMATCH' }, `${title} cannot bypass profession safeguards through platform wording`);
  assert.equal(roleEligibility(lead('Software Engineer, Production'), profile({ preferredRoleFamilies: ['production-support-frontend'] }), constraint({ roleFamilies: ['production-support-frontend'] })).eligible, true);
  assert.equal(roleEligibility(lead('Frontend Engineer'), profile({ preferredRoleFamilies: ['frontend-product'] }), constraint({ roleFamilies: ['forward-deployed-software'] })).eligible, false, 'profile and company lane intent must overlap');
  assert.equal(roleEligibility(lead('Solutions Engineer'), search, constraint()).eligible, false, 'ambiguous customer-facing titles do not pass by title alone');
  assert.equal(roleEligibility(lead('Staff Engineer'), search, constraint()).eligible, true, 'unqualified engineering seniority titles remain plausible');
  assert.equal(roleEligibility(lead('Software Engineer, Payments'), search, constraint()).eligible, true, 'business-domain labels do not erase an explicit software occupation');
  assert.equal(roleEligibility(lead('Solutions Engineer', 'Remote - US', { department: 'Software Engineering' }), profile({ preferredRoleFamilies: ['forward-deployed-software'] }), constraint({ roleFamilies: ['forward-deployed-software'] })).eligible, true, 'structured technical metadata plus an enabled customer-facing family can admit a borderline title');
  assert.equal(roleEligibility(lead('Developer Advocate', 'Remote - US', { department: 'Developer Relations Engineering' }), profile({ preferredRoleFamilies: ['ui-platform-design-systems'], preferredModifiers: ['DEVELOPER_TOOLING'] }), constraint({ roleFamilies: ['ui-platform-design-systems'] })).eligible, true, 'developer-facing work needs both technical metadata and enabled DX intent');
  for (const title of ['Data Engineer', 'ML Engineer', 'Security Engineer', 'QA Engineer', 'Backend Engineer', 'Software Engineer, Infrastructure', 'Software Engineer, Platform'])
    assert.equal(roleEligibility(lead(title, 'Remote - US', { department: 'Engineering' }), profile({ preferredRoleFamilies: ['frontend-product'] }), constraint({ roleFamilies: ['frontend-product'] })).eligible, false, `${title} cannot be relabeled as frontend by a generic department`);
  assert.equal(roleEligibility(lead('Solutions Engineer', 'Remote - US', { department: 'Software Engineering' }), profile({ preferredRoleFamilies: ['frontend-product'], preferredModifiers: ['DEVELOPER_TOOLING'] }), constraint({ roleFamilies: ['frontend-product'] })).eligible, false, 'ambiguous roles cannot be assigned a disabled family');
});

test('location eligibility rejects only clear incompatibility and preserves unknowns', () => {
  const remote = profile();
  for (const location of ['Remote - US', 'United States Remote', 'Remote, United States', 'US distributed'])
    assert.equal(locationEligibility(lead('Frontend Engineer', location), remote, constraint()).eligible, true, location);
  for (const location of ['Remote - Canada or US', 'Remote across Canada and the US', 'New York, NY or Toronto, Canada', 'Remote - Canada or Atlanta, GA', 'Toronto, Canada or Philadelphia, PA', 'Remote - Canada / Portland, OR'])
    assert.equal(locationEligibility(lead('Frontend Engineer', location, { remoteStatus: 'unknown' }), remote, constraint()).eligible, true, `${location} includes a compatible US option`);
  assert.equal(locationEligibility(lead('Frontend Engineer', 'Remote - Canada and UK'), remote, constraint()).eligible, false, 'multiple clearly non-US alternatives remain incompatible');
  for (const location of ['Remote - EMEA', 'Remote - UK', 'Remote - Canada', 'Remote - APAC'])
    assert.deepEqual(locationEligibility(lead('Frontend Engineer', location), remote, constraint()), { eligible: false, reason: 'LOCATION_INCOMPATIBLE' }, location);
  for (const location of ['Remote - Canada (US time zones)', 'Remote - Canada, US timezone', 'Canada Remote, US hours required', 'Canada Remote, EST (US)', 'Remote - UK with US overlap', 'Remote - EMEA; US working hours', 'Remote Canada, overlap with US', 'Remote EMEA, working hours overlap with US', 'Remote UK, timezone aligned to US'])
    assert.deepEqual(locationEligibility(lead('Frontend Engineer', location), remote, constraint()), { eligible: false, reason: 'LOCATION_INCOMPATIBLE' }, `${location} uses US only as a working-hours qualifier`);
  assert.equal(locationEligibility(lead('Frontend Engineer', 'Berlin', { remoteStatus: 'onsite' }), remote, constraint()).eligible, false);
  assert.equal(locationEligibility(lead('Frontend Engineer', 'London, UK', { remoteStatus: 'unknown' }), remote, constraint()).eligible, false);
  const hybrid = profile({ remotePreference: 'hybrid_flexible', hybridLocations: ['Synthetic Metro'] });
  assert.equal(locationEligibility(lead('Frontend Engineer', 'Synthetic Metro', { remoteStatus: 'hybrid' }), hybrid, constraint({ locationPolicies: ['LOCAL_HYBRID'] })).eligible, true);
  assert.equal(locationEligibility(lead('Frontend Engineer', '', { remoteStatus: 'unknown' }), remote, constraint()).reason, 'LOCATION_UNKNOWN_PASS');
  assert.equal(locationEligibility(lead('Frontend Engineer', 'Synthetic Office', { remoteStatus: 'onsite' }), profile({ remotePreference: 'any' }), constraint({ locationPolicies: ['ANY'] })).eligible, true);
  assert.equal(locationEligibility(lead('Frontend Engineer', '', { remoteStatus: 'unknown' }), profile({ remotePreference: 'any' }), constraint({ locationPolicies: ['UNKNOWN'] })).eligible, true);
});

test('role and location filters run before fair allocation and source results describe every stage', async () => {
  const a = source('board-a'), b = source('board-b'), c = source('board-c'), d = source('board-d'), e = source('board-e');
  const irrelevant = Array.from({ length: 100 }, (_, index) => lead(`Account Executive ${index}`, 'Remote - US', { url: `https://jobs.ashbyhq.com/board-a/sales-${index}` }));
  const aEligible = [0, 1].map(index => lead(`Frontend Engineer ${index}`, 'Remote - US', { url: `https://jobs.ashbyhq.com/board-a/eng-${index}` }));
  const bEligible = Array.from({ length: 5 }, (_, index) => lead(`Software Engineer ${index}`, 'Remote - US', { url: `https://jobs.ashbyhq.com/board-b/eng-${index}` }));
  const roleOnly = lead('UI Engineer', 'Remote - EMEA', { url: 'https://jobs.ashbyhq.com/board-c/role-only' });
  const verify = async () => ({ status: 'UNKNOWN' as const, isListed: false, lastVerifiedAt: '2026-10-04' });
  const roleMismatch = lead('Account Executive', 'Remote - US', { url: 'https://jobs.ashbyhq.com/board-e/non-engineering' });
  const outcome = await scanDiscoverySources([a, b, c, d, e], profile(), async item => item.id === 'board-a' ? [...irrelevant, ...aEligible] : item.id === 'board-b' ? bEligible : item.id === 'board-c' ? [roleOnly] : item.id === 'board-e' ? [roleMismatch] : [], verify);
  assert.equal(outcome.jobs.length, 7);
  assert.deepEqual(outcome.sourceResults, [
    { sourceId: 'board-a', status: 'SUCCESS', fetched: 102, roleEligible: 2, locationEligible: 2, selected: 2 },
    { sourceId: 'board-b', status: 'SUCCESS', fetched: 5, roleEligible: 5, locationEligible: 5, selected: 5 },
    { sourceId: 'board-c', status: 'SUCCESS', fetched: 1, roleEligible: 1, locationEligible: 0, selected: 0 },
    { sourceId: 'board-d', status: 'SUCCESS', fetched: 0, roleEligible: 0, locationEligible: 0, selected: 0 },
    { sourceId: 'board-e', status: 'SUCCESS', fetched: 1, roleEligible: 0, locationEligible: 0, selected: 0 }
  ]);
  assert.deepEqual(outcome.jobs.slice(0, 4).map(job => job.atsBoard), ['board-a', 'board-b', 'board-a', 'board-b'], 'eligible queues retain round-robin order');
});

test('cap, deterministic order, selected-zero diagnostics, failure, and priority neutrality remain truthful', async () => {
  const sources = Array.from({ length: 26 }, (_, index) => source(`cap-${index}`));
  const verify = async () => ({ status: 'UNKNOWN' as const, isListed: false, lastVerifiedAt: '2026-10-04' });
  const scan = async (item: DiscoverySource) => item.id === 'cap-25' ? Promise.reject(new Error('synthetic failure')) : [lead('Product Engineer', 'Remote - US', { url: `https://jobs.ashbyhq.com/${item.id}/one` })];
  const first = await scanDiscoverySources(sources, profile(), scan, verify);
  const second = await scanDiscoverySources(sources, profile(), scan, verify);
  assert.equal(first.jobs.length, 24);
  assert.deepEqual(first.jobs.map(job => job.atsBoard), second.jobs.map(job => job.atsBoard));
  assert.deepEqual(first.sourceResults[24], { sourceId: 'cap-24', status: 'SUCCESS', fetched: 1, roleEligible: 1, locationEligible: 1, selected: 0 });
  assert.deepEqual(first.sourceResults[25], { sourceId: 'cap-25', status: 'FAILED', fetched: 0, roleEligible: 0, locationEligible: 0, selected: 0 });

  const search = profile({ discoverySources: [source('priority')] });
  const low = sourcesForDiscoveryScope(search, [], [watch('low', 'priority', { priority: 'LOW' })], 'WATCHLIST');
  const high = sourcesForDiscoveryScope(search, [], [watch('high', 'priority', { priority: 'HIGH' })], 'WATCHLIST');
  assert.deepEqual(low.sources, high.sources, 'watchlist priority is not an allocation input');
});
