import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { JobRecord } from '../src/types';
import { DailyShortlistPresenter } from '../src/components/DailyShortlistView';
import { compensationSummary, formatScanStatus, performShortlistDecision, selectDailyShortlist, shortlistRelevance, shortlistVerification } from '../src/utils/shortlist';

const now = Date.parse('2026-10-17T12:00:00Z');
const job = (id: string, changes: Partial<JobRecord> = {}) => ({
  id, atsProvider: 'greenhouse', atsBoard: 'synthetic', atsJobId: id, company: 'Synthetic Co', title: `Frontend ${id}`,
  canonicalUrl: `https://job-boards.greenhouse.io/synthetic/jobs/${id}`, applyUrl: `https://job-boards.greenhouse.io/synthetic/jobs/${id}`,
  description: 'Synthetic record', location: 'Remote, US', remoteStatus: 'remote', employmentType: 'full-time', firstSeenAt: '2026-10-17T10:00:00Z',
  verificationStatus: 'LISTED', isCurrentlyListed: true, sourceChannel: 'Direct / Company Portal', roleModifiers: [], seniority: 'Mid', hardRequirements: [], preferredRequirements: [], technologies: [], responsibilities: [], hiringSignals: [], hardBlockers: [], softGaps: [], applicationPriority: 'UNASSESSED', priorityReason: 'Synthetic', applicationStatus: 'DISCOVERED', ...changes
} as JobRecord);

test('daily shortlist preserves boundaries, limit, ordering, and duplicate identity', () => {
  const records = Array.from({ length: 12 }, (_, index) => job(`daily-${index}`, { publishedAt: new Date(now - index * 1000).toISOString() }));
  records.push(job('lower', { publishedAt: new Date(now - 24 * 60 * 60 * 1000).toISOString() }));
  records.push(job('older', { publishedAt: new Date(now - 25 * 60 * 60 * 1000).toISOString() }));
  records.push(job('alias', { atsJobId: 'daily-0', canonicalUrl: records[0].canonicalUrl }));
  const result = selectDailyShortlist(records, now);
  assert.equal(result.daily.length, 10); assert.equal(result.counts.daily, 13);
  assert.equal(result.recent[0].id, 'older');
  assert.equal(new Set(result.daily.map(row => row.atsJobId)).size, result.daily.length);
});

test('unknown and future publication dates remain outside daily and recent windows', () => {
  const result = selectDailyShortlist([job('unknown', { firstSeenAt: new Date(now).toISOString() }), job('invalid', { publishedAt: 'not-a-date', firstSeenAt: new Date(now).toISOString() }), job('future', { publishedAt: new Date(now + 1).toISOString() }), job('boundary', { publishedAt: new Date(now - 24 * 60 * 60 * 1000).toISOString() }), job('just-old', { publishedAt: new Date(now - 24 * 60 * 60 * 1000 - 1).toISOString() }), job('fourteen', { publishedAt: new Date(now - 14 * 24 * 60 * 60 * 1000).toISOString() }), job('too-old', { publishedAt: new Date(now - 14 * 24 * 60 * 60 * 1000 - 1).toISOString() })], now);
  assert.deepEqual(result.daily.map(row => row.id), ['boundary']); assert.deepEqual(result.recent.map(row => row.id), ['just-old', 'fourteen']); assert.deepEqual(result.unknown.map(row => row.id), ['invalid', 'unknown']);
});

test('sorting is deterministic for shuffled same-timestamp records and does not fill fewer-than-ten daily results', () => {
  const records = ['b', 'a', 'c'].map(id => job(id, { publishedAt: new Date(now - 10).toISOString() }));
  const first = selectDailyShortlist(records, now).daily.map(row => row.id);
  const second = selectDailyShortlist([...records].reverse(), now).daily.map(row => row.id);
  assert.deepEqual(first, second); assert.equal(first.length, 3);
});

test('current assessment orders a reviewable record without inventing scores for pending records', () => {
  const result = selectDailyShortlist([
    job('pending', { publishedAt: new Date(now - 500).toISOString() }),
    job('assessed', { publishedAt: new Date(now - 5_000).toISOString(), assessmentStatus: 'ASSESSED', fit: { qualificationFit: 7, evidenceCoverage: 6, applicationPriority: 'APPLY FIRST', initialFitScore: 7, tailoredFitScore: 7, verdict: 'Apply', verdictReason: 'Synthetic', strongestMatch: 'Synthetic match', biggestActualGap: 'None', blockers: [], unsupportedRequirements: [], canTailor: true } })
  ], now);
  assert.deepEqual(result.daily.map(row => row.id), ['assessed', 'pending']);
});

test('stale historical fit does not rank or claim current relevance', () => {
  const stale = job('stale', { primaryRoleFamily: 'frontend-product', publishedAt: new Date(now - 500).toISOString(), assessmentStatus: 'STALE', fit: { qualificationFit: 10, evidenceCoverage: 10, applicationPriority: 'APPLY FIRST', initialFitScore: 10, tailoredFitScore: 10, verdict: 'Apply', verdictReason: 'Old', strongestMatch: 'Old match', biggestActualGap: 'Old gap', blockers: [], unsupportedRequirements: [], canTailor: true } });
  const pending = job('pending', { publishedAt: new Date(now - 100).toISOString() });
  assert.deepEqual(selectDailyShortlist([stale, pending], now).daily.map(row => row.id), ['pending', 'stale']);
  assert.match(shortlistRelevance(stale), /Previous assessment role family/);
});

test('shortlist excludes confirmed unavailable, skip, and advanced application records', () => {
  const result = selectDailyShortlist([
    job('not-listed', { verificationStatus: 'NOT_LISTED' }), job('archived', { applicationStatus: 'ARCHIVED' }),
    job('skip', { assessmentStatus: 'ASSESSED', fit: { qualificationFit: 1, evidenceCoverage: 1, applicationPriority: 'SKIP', initialFitScore: 1, tailoredFitScore: 1, verdict: 'Skip', verdictReason: 'Synthetic', strongestMatch: '', biggestActualGap: '', blockers: [], unsupportedRequirements: [], canTailor: false } }), job('kept')
  ], now);
  assert.deepEqual(result.unknown.map(row => row.id), ['kept']);
});

test('compensation presentation preserves components, regions, and unknown fields', () => {
  const summary = compensationSummary({ status: 'ambiguous', ranges: [{ min: 40, max: 60, currency: 'CAD', interval: 'hour', kind: 'base', applicability: 'Ontario', source: 'structured' }, { min: 10, max: 20, kind: 'equity', unit: 'percent', source: 'structured' }] });
  assert.match(summary.lines[0], /Ontario: Base CAD 40–60 \/ hour/); assert.match(summary.lines[1], /Equity 10–20%/); assert.match(summary.uncertainty!, /regional applicability/);
});

test('compensation never guesses USD and retains monthly, bonus, and percentage components', () => {
  const summary = compensationSummary({ status: 'ambiguous', ranges: [{ min: 5_000, max: 6_000, interval: 'month', kind: 'bonus', source: 'structured' }, { min: 1, max: 2, kind: 'equity', unit: 'percent', source: 'structured' }, { min: 100, max: 200, kind: 'unknown', source: 'description' }] });
  assert.match(summary.lines[0], /currency unknown 5,000–6,000 \/ month/);
  assert.match(summary.lines[1], /Equity 1–2%/);
  assert.match(summary.uncertainty!, /unresolved/);
});

test('pursue and dismiss await existing outcome transitions and never imply application submission', async () => {
  const calls: Array<[string, string]> = [];
  await performShortlistDecision('job-1', 'pursue', async (id, status) => { calls.push([id, status]); });
  await performShortlistDecision('job-1', 'dismiss', async (id, status) => { calls.push([id, status]); });
  assert.deepEqual(calls, [['job-1', 'SHORTLISTED'], ['job-1', 'ARCHIVED']]);
});

test('decision acknowledgement waits for persistence rejection or completion', async () => {
  let release: (() => void) | undefined;
  const gate = new Promise<void>(resolve => { release = resolve; });
  let finished = false;
  const pending = performShortlistDecision('job-2', 'pursue', async () => { await gate; finished = true; });
  assert.equal(finished, false); release!(); await pending; assert.equal(finished, true);
  await assert.rejects(() => performShortlistDecision('job-2', 'dismiss', async () => { throw new Error('synthetic persistence rejection'); }), /synthetic persistence rejection/);
});

test('verification concerns preserve uncertain workplace and stored blockers', () => {
  const concerns = shortlistVerification(job('hybrid', { remoteStatus: 'hybrid', hardBlockers: ['Attendance policy needs review'] }));
  assert.ok(concerns.some(item => /attendance compatibility/.test(item))); assert.ok(concerns.some(item => /Known concern/.test(item)));
});

test('summary counts exclude invisible dates and include compensation verification concerns', () => {
  const publishedAt = new Date(now).toISOString();
  const records = [job('visible', { publishedAt }), job('future', { publishedAt: new Date(now + 1).toISOString() }), job('old', { publishedAt: new Date(now - 15 * 86_400_000).toISOString() })];
  const result = selectDailyShortlist(records, now);
  assert.equal(result.available, 1);
  assert.equal(result.verificationNeeded, 1);
  assert.ok(shortlistVerification(records[0]).includes('Compensation was not disclosed.'));
  assert.deepEqual(compensationSummary(), { lines: [], uncertainty: 'Compensation was not disclosed.' });
  assert.equal(compensationSummary({ status: 'available', ranges: [{ min: 10, max: 15, kind: 'bonus', unit: 'percent', source: 'structured' }] }).uncertainty, undefined);
});

test('rendered stale and pending records never expose historical fit scores', () => {
  const pending = job('pending', { publishedAt: new Date(now).toISOString(), assessmentStatus: 'STALE', fit: { qualificationFit: 9 } as JobRecord['fit'] });
  const markup = renderToStaticMarkup(React.createElement(DailyShortlistPresenter, { jobs: [pending], now, onOpen: () => {}, onDiscover: () => {}, onDecision: async () => {} }));
  assert.doesNotMatch(markup, /9\/10|Current assessment:/);
  assert.match(markup, /Assessment is stale/);
});

test('presenter renders empty, error, loading, navigation and safe posting controls from synthetic data', () => {
  const markup = renderToStaticMarkup(React.createElement(DailyShortlistPresenter, { jobs: [], now, error: 'Synthetic error', scannedAt: '2026-10-15T12:00:00Z', onOpen: () => {}, onDiscover: () => {}, onDecision: async () => {} }));
  assert.match(markup, /results may be stale/); assert.match(markup, /Synthetic error/); assert.match(markup, /No postings in this view/); assert.match(markup, /Open discovery/);
  assert.equal(formatScanStatus(undefined, now), 'Discovery has not been refreshed.');
  const unsafe = job('unsafe', { publishedAt: new Date(now).toISOString(), canonicalUrl: 'javascript:alert(1)', applyUrl: 'https://example.test/posting' });
  const loading = renderToStaticMarkup(React.createElement(DailyShortlistPresenter, { jobs: [unsafe], now, isDiscovering: true, onOpen: () => {}, onDiscover: () => {}, onDecision: async () => {} }));
  const card = renderToStaticMarkup(React.createElement(DailyShortlistPresenter, { jobs: [unsafe], now, onOpen: () => {}, onDiscover: () => {}, onDecision: async () => {} }));
  assert.match(loading, /Discovery is running/); assert.match(card, /https:\/\/example\.test\/posting/); assert.doesNotMatch(card, /javascript:alert/);
});
