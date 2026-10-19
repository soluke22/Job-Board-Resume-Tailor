import test from 'node:test';
import assert from 'node:assert/strict';
import { publicationWindowStatus, scanDiscoverySources, UNKNOWN_DATE_LIMIT, type DiscoveryLead } from '../server/discovery';
import { createWorkspaceRepository } from '../server/workspaceRepository';
import { DEFAULT_SEARCH_PROFILE } from '../src/data/privateSeedTemplate';
import type { DiscoverySource } from '../src/utils/discovery';
import type { SearchSessionDiagnostic } from '../src/types';
import { persistenceDb, syntheticJob } from './helpers/persistence';

const NOW = Date.parse('2026-10-14T16:00:00.000Z');
const source = (id: string, provider: 'ashby' | 'greenhouse' | 'lever' = 'ashby'): DiscoverySource => ({
  id, company: `Synthetic ${id}`, provider, boardId: id,
  boardUrl: provider === 'greenhouse' ? `https://job-boards.greenhouse.io/${id}` : provider === 'lever' ? `https://jobs.lever.co/${id}` : `https://jobs.ashbyhq.com/${id}`,
  enabled: true, origin: 'configured'
});
const profile = { ...structuredClone(DEFAULT_SEARCH_PROFILE), preferredRoleFamilies: [], remotePreference: 'any' as const };
const lead = (board: string, id: string, publishedAt?: string, provider: 'ashby' | 'greenhouse' | 'lever' = 'ashby'): DiscoveryLead => {
  const url = provider === 'greenhouse' ? `https://job-boards.greenhouse.io/${board}/jobs/${id}` : provider === 'lever' ? `https://jobs.lever.co/${board}/${id}` : `https://jobs.ashbyhq.com/${board}/${id}`;
  return {
    url, title: `Frontend Engineer ${id}`, company: `Synthetic ${board}`, location: 'Remote - US', remoteStatus: 'remote', source: 'public-board',
    verification: { status: 'LISTED', isListed: true, lastVerifiedAt: new Date(NOW).toISOString(), canonicalUrl: url, rawDetails: { publishedAt } }
  };
};

test('discovery windows use exact instant boundaries for 1, 2, 7, and 14 days', () => {
  for (const days of [1, 2, 7, 14] as const) {
    const boundary = new Date(NOW - days * 86_400_000).toISOString();
    const before = new Date(NOW - days * 86_400_000 - 1).toISOString();
    assert.equal(publicationWindowStatus(boundary, days, NOW).status, 'IN_WINDOW', `${days}-day boundary is inclusive`);
    assert.equal(publicationWindowStatus(before, days, NOW).status, 'OLDER', `${days}-day boundary excludes one millisecond earlier`);
  }
});

test('publication timestamps are timezone-aware and unknown, invalid, and future dates remain explicit', () => {
  assert.deepEqual(publicationWindowStatus('2026-10-13T12:00:00-04:00', 1, NOW), publicationWindowStatus('2026-10-13T16:00:00Z', 1, NOW));
  assert.equal(publicationWindowStatus(undefined, 14, NOW).status, 'UNKNOWN');
  assert.equal(publicationWindowStatus('not-a-date', 14, NOW).status, 'UNKNOWN');
  assert.equal(publicationWindowStatus('2026-10-14T16:00:00.001Z', 14, NOW).status, 'FUTURE');
});

test('fresh allocation is newest-first, fair across boards, capped at 24, and bounds unknown dates', async () => {
  const sources = [source('alpha'), source('beta', 'greenhouse'), source('gamma', 'lever')];
  const rows = new Map<string, DiscoveryLead[]>([
    ['alpha', Array.from({ length: 15 }, (_, index) => lead('alpha', `a-${index}`, new Date(NOW - index * 60_000).toISOString()))],
    ['beta', Array.from({ length: 15 }, (_, index) => lead('beta', `b-${index}`, new Date(NOW - index * 60_000 - 30_000).toISOString(), 'greenhouse'))],
    ['gamma', [
      ...Array.from({ length: 8 }, (_, index) => lead('gamma', `u-${index}`, undefined, 'lever')),
      lead('gamma', 'old', new Date(NOW - 15 * 86_400_000).toISOString(), 'lever'),
      lead('gamma', 'future', new Date(NOW + 1).toISOString(), 'lever')
    ]]
  ]);
  const outcome = await scanDiscoverySources(sources, profile, async item => rows.get(item.id)!, undefined, new Map(), { windowDays: 14, now: NOW });
  assert.equal(outcome.jobs.length, 24);
  assert.deepEqual(outcome.sourceResults.map(result => result.selected), [10, 10, UNKNOWN_DATE_LIMIT]);
  assert.deepEqual(outcome.jobs.slice(0, 4).map(job => job.atsBoard), ['alpha', 'beta', 'alpha', 'beta']);
  assert.equal(outcome.diagnostics.filterCounts.knownOlderExcluded, 1);
  assert.equal(outcome.diagnostics.filterCounts.futureExcluded, 1);
  assert.equal(outcome.diagnostics.filterCounts.unknownDateUnselected, 4);
  assert.equal(outcome.diagnostics.filterCounts.capUnselected, 10);
  assert.ok(outcome.jobs.slice(0, 20).every(job => job.publishedAt));
  assert.ok(outcome.jobs.slice(20).every(job => !job.publishedAt));
});

test('repeated scans preserve deterministic allocation and remove cross-board duplicates before selection', async () => {
  const alpha = source('alpha'), beta = source('beta');
  const duplicate = lead('alpha', 'same', new Date(NOW).toISOString());
  const scan = async (item: DiscoverySource) => item.id === 'alpha' ? [duplicate, lead('alpha', 'unique-a', new Date(NOW - 1).toISOString())] : [{ ...duplicate }, lead('beta', 'unique-b', new Date(NOW - 2).toISOString())];
  const first = await scanDiscoverySources([alpha, beta], profile, scan, undefined, new Map(), { windowDays: 1, now: NOW });
  const second = await scanDiscoverySources([alpha, beta], profile, scan, undefined, new Map(), { windowDays: 1, now: NOW });
  assert.equal(first.diagnostics.duplicatesRemoved, 1);
  assert.equal(first.jobs.length, 3);
  assert.deepEqual(first.jobs.map(job => [job.atsBoard, job.atsJobId]), second.jobs.map(job => [job.atsBoard, job.atsJobId]));
});

test('provider failures remain isolated and observable', async () => {
  const alpha = source('alpha'), beta = source('beta', 'greenhouse');
  const outcome = await scanDiscoverySources([alpha, beta], profile, async item => item.id === 'beta' ? Promise.reject(new Error('synthetic outage')) : [lead('alpha', 'one', new Date(NOW).toISOString())], undefined, new Map(), { windowDays: 2, now: NOW });
  assert.deepEqual(outcome.sourceResults.map(result => result.status), ['SUCCESS', 'FAILED']);
  assert.equal(outcome.jobs.length, 1);
  assert.equal(outcome.diagnostics.candidatesEncountered, 1);
});

test('search-session diagnostics persist without changing jobs, histories, or workspace revision', async () => {
  const { pg, db } = await persistenceDb();
  try {
    const repo = createWorkspaceRepository(() => db as any);
    const saved = await repo.save('owner-a', { jobs: [syntheticJob()] }, 0);
    const before = await repo.read('owner-a');
    const session: SearchSessionDiagnostic = {
      id: 'search-synthetic', requestedWindowDays: 14, searchedAt: new Date(NOW).toISOString(), scope: 'ALL_ENABLED',
      sources: [{ sourceId: 'alpha', provider: 'ashby', boardId: 'alpha', status: 'SUCCESS', health: 'SUCCESS', fetched: 2, selected: 1 }],
      filters: { profileExcluded: 0, companyExcluded: 0, employmentExcluded: 0, employmentNotAllowed: 0, roleExcluded: 0, locationExcluded: 0, knownOlderExcluded: 1, futureExcluded: 0, unknownDateUnselected: 0, capUnselected: 0 },
      totals: { candidatesEncountered: 2, duplicatesRemoved: 0, selectedForVerification: 1, successfullyVerified: 1, newlyDiscovered: 0, rediscovered: 1 },
      providerErrors: [], unsupportedProviders: []
    };
    await assert.rejects(repo.appendSearchSession('owner-a', { ...session, description: 'must not persist' }));
    await repo.appendSearchSession('owner-a', session);
    const after = await repo.read('owner-a');
    assert.equal(after.revision, saved.revision);
    assert.deepEqual(after.jobs, before.jobs);
    assert.deepEqual(after.searchSessions, [session]);
    assert.equal(JSON.stringify(after.searchSessions).includes('Synthetic description'), false, 'diagnostics do not copy job descriptions');
  } finally { await pg.close(); }
});
