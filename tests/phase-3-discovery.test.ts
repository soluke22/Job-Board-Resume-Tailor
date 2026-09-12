import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { verifyPostingAts, detectAtsProvider, genericPageResult, verifyGenericPage } from '../server/atsAdapters';
import { buildDiscoveredJobs, discoveryPrompt, executeDiscoveryRequest } from '../server/discovery';
import { calculateFreshnessBand } from '../server/searchEngine';
import { mergeDiscoveredJobs, sameJob, normalizedJobUrl } from '../src/utils/jobIdentity';
import { safeFetchText, validatePublicUrl, blockedAddress } from '../server/safeFetch';
import { jobSchema } from '../server/db/workspaceValidation';

const fixture = {company: 'Synthetic Company', title: 'Engineer', canonicalUrl: 'https://jobs.ashbyhq.com/synthetic/id', descriptionSummary: 'Search snippet', technologies: ['Fake'], publishedEstimate: 'Recent'};
const json = (data: any, status = 200) => new Response(JSON.stringify(data), {status, headers: {'content-type': 'application/json'}});
test('exact provider contracts and dates', async () => {
  const original = globalThis.fetch;
  try {
    const ashby = {jobUrl: fixture.canonicalUrl, applyUrl: fixture.canonicalUrl + '/application', title: 'Canonical title', isListed: true, descriptionPlain: 'Actual posting content', publishedAt: '2026-08-01T00:00:00Z'};
    globalThis.fetch = async () => json({jobs: [ashby]});
    assert.equal((await verifyPostingAts(fixture.canonicalUrl)).status, 'LISTED');
    const records = await buildDiscoveredJobs([fixture], ['https://source.example.org'], ['actual query']);
    assert.equal(records[0].description, ashby.descriptionPlain);
    assert.equal(records[0].publishedAt, '2026-08-01T00:00:00.000Z');
    assert.notEqual(records[0].firstSeenAt, records[0].publishedAt);
    assert.equal(records[0].qualificationFit, undefined);
    assert.equal(records[0].applicationPriority, 'UNASSESSED');
    assert.deepEqual(records[0].responsibilities, []);
    assert.deepEqual(records[0].technologies, []);
    assert.deepEqual(records[0].discoverySourceUrls, ['https://source.example.org']);
    globalThis.fetch = async () => json({jobs: [{...ashby, isListed: false}]});
    assert.equal((await verifyPostingAts(fixture.canonicalUrl)).status, 'UNLISTED');
    globalThis.fetch = async () => json({jobs: [{...ashby, isListed: undefined}]});
    assert.equal((await verifyPostingAts(fixture.canonicalUrl)).status, 'UNKNOWN');
    globalThis.fetch = async () => json({jobs: []});
    assert.equal((await verifyPostingAts(fixture.canonicalUrl)).status, 'NOT_LISTED');
    globalThis.fetch = async () => {throw new Error('network');};
    assert.equal((await verifyPostingAts(fixture.canonicalUrl)).status, 'UNKNOWN');
    assert.equal((await verifyPostingAts('https://jobs.ashbyhq.com/synthetic')).status, 'UNKNOWN');
    const gh = 'https://job-boards.greenhouse.io/synthetic/jobs/123';
    let calls = 0;
    globalThis.fetch = async () => {calls++; return json({id: 123, title: 'Engineer', absolute_url: gh, content: 'Actual GH content', updated_at: '2026-08-01T00:00:00Z'});};
    const greenhouse = await verifyPostingAts(gh);
    assert.equal(greenhouse.status, 'LISTED');
    assert.equal(greenhouse.rawDetails.publishedAt, undefined);
    assert.equal(greenhouse.rawDetails.updatedAt, '2026-08-01T00:00:00.000Z');
    assert.equal((await verifyPostingAts('https://job-boards.greenhouse.io/synthetic')).status, 'UNKNOWN');
    assert.equal(calls, 1);
    globalThis.fetch = async () => json({}, 404);
    assert.equal((await verifyPostingAts(gh)).status, 'NOT_LISTED');
    globalThis.fetch = async () => json({}, 500);
    assert.equal((await verifyPostingAts(gh)).status, 'UNKNOWN');
    globalThis.fetch = async () => json({jobs: [{id: 123}]});
    assert.equal((await verifyPostingAts(gh)).status, 'UNKNOWN');
    const lever = 'https://jobs.lever.co/synthetic/id';
    globalThis.fetch = async () => json({id: 'id', text: 'Engineer', hostedUrl: lever, descriptionPlain: 'Lever description', createdAt: 1754006400000});
    const lv = await verifyPostingAts(lever);
    assert.equal(lv.status, 'LISTED'); assert.equal(lv.rawDetails.publishedAt, '2025-08-01T00:00:00.000Z');
    globalThis.fetch = async () => json({}, 404);
    assert.equal((await verifyPostingAts(lever)).status, 'NOT_LISTED');
    globalThis.fetch = async () => {throw new Error('network');};
    assert.equal((await verifyPostingAts(lever)).status, 'UNKNOWN');
    assert.equal((await verifyPostingAts('https://jobs.eu.lever.co/synthetic/id')).status, 'UNKNOWN');
    assert.equal((await verifyPostingAts('https://synthetic.myworkdayjobs.com/job')).status, 'UNSUPPORTED');
    assert.equal(detectAtsProvider('https://evil.example.org/jobs.ashbyhq.com/synthetic/id').provider, 'company-careers');
  } finally { globalThis.fetch = original; }
});
test('unknown dates, exceptions and missing URL never fabricate facts', async () => {
  const [job] = await buildDiscoveredJobs([fixture], [], [], async () => {throw new Error('failure');});
  assert.equal(job.verificationStatus, 'UNKNOWN'); assert.equal(job.isCurrentlyListed, false);
  assert.equal(job.publishedAt, undefined); assert.equal(job.freshnessBand, 'UNKNOWN');
  assert.equal(job.description, ''); assert.equal(job.canonicalUrl, ''); assert.equal(job.location, '');
  assert.ok(jobSchema.safeParse(job).success);
  assert.equal(jobSchema.safeParse({...job, qualificationFit: 8.5}).success, false);
  assert.equal(jobSchema.safeParse({...job, assessmentStatus: undefined}).success, false);
  assert.equal(calculateFreshnessBand(undefined, new Date().toISOString()), 'UNKNOWN');
  assert.equal(calculateFreshnessBand('Recent'), 'UNKNOWN');
  assert.equal(calculateFreshnessBand('2999-01-01'), 'UNKNOWN');
  assert.deepEqual(await buildDiscoveredJobs([{title: 'Missing URL'}], [], []), []);
  const prompt = discoveryPrompt({preferredRoleFamilies: [], technologyStrengths: ['SyntheticTech'], remotePreference: 'any'} as any, ['custom query']);
  assert.ok(prompt.includes('SyntheticTech')); assert.ok(prompt.includes('custom query'));
  assert.ok(!prompt.includes('Tailwind')); assert.ok(!prompt.includes('Remote US'));
});
test('grounding provenance and measured request budget use configured preferences only', async () => {
  const profile = {preferredRoleFamilies: [], technologyStrengths: ['SyntheticTech'], remotePreference: 'any', name: 'PRIVATE_IDENTITY', email: 'PRIVATE_CONTACT', salaryPreference: {minTarget: 123, email: 'PRIVATE_NESTED_CONTACT'}} as any;
  let calls = 0;
  const generate = async (prompt: string) => {
    calls++; assert.ok(prompt.includes('custom query')); assert.ok(prompt.includes('SyntheticTech')); assert.ok(!prompt.includes('PRIVATE_'));
    return {text: JSON.stringify({discovered: [fixture]}), candidates: [{groundingMetadata: {groundingChunks: [{web: {uri: 'https://source.example.org'}}], webSearchQueries: ['provider executed query']}}]};
  };
  const verify = async () => ({status: 'UNKNOWN' as const, isListed: false, lastVerifiedAt: '2026-09-12'});
  const outcome = await executeDiscoveryRequest(generate, profile, 4, ['custom query'], verify);
  assert.equal(calls, 1); assert.equal(outcome.discoveryRequestsUsed, calls); assert.equal(outcome.queryBudgetUnit, 'discovery_requests');
  assert.deepEqual(outcome.jobs[0].discoverySourceUrls, ['https://source.example.org']);
  assert.equal(outcome.jobs[0].searchQuery, 'provider executed query');
  for (const budget of [0, -1, 11, 1.5]) await assert.rejects(executeDiscoveryRequest(generate, profile, budget));
  await assert.rejects(executeDiscoveryRequest(generate, profile, 1, [123] as any));
  assert.equal(calls, 1);
});
test('identity hierarchy and history-safe canonical refresh', async () => {
  const verify = async () => ({status: 'LISTED' as const, isListed: true, lastVerifiedAt: '2026-09-12', canonicalUrl: fixture.canonicalUrl, rawDetails: {rawContent: 'JD'}});
  const [a] = await buildDiscoveredJobs([fixture], [], [], verify);
  const applied = {...a, id: 'existing', applicationStatus: 'APPLIED' as const, firstSeenAt: '2026-01-01', notes: 'keep', statusHistory: [{from: 'DISCOVERED', to: 'APPLIED', timestamp: '2026-01-02'}]};
  const merged = mergeDiscoveredJobs([applied], [{...a, description: 'better JD'}]);
  assert.equal(merged.newJobs.length, 0); assert.equal(merged.jobs[0].id, 'existing');
  assert.equal(merged.jobs[0].applicationStatus, 'APPLIED'); assert.equal(merged.jobs[0].firstSeenAt, '2026-01-01');
  assert.deepEqual(merged.jobs[0].statusHistory, applied.statusHistory); assert.equal(merged.jobs[0].notes, 'keep');
  assert.equal(merged.jobs[0].description, 'better JD');
  const latest = {...applied, applicationStatus: 'REJECTED' as const, notes: 'edited during discovery'};
  const lateResult = mergeDiscoveredJobs([latest], merged.refreshedJobs);
  assert.equal(lateResult.jobs[0].applicationStatus, 'REJECTED');
  assert.equal(lateResult.jobs[0].notes, 'edited during discovery');
  assert.equal(mergeDiscoveredJobs([], [a, {...a, id: 'second', discoveryUrl: fixture.canonicalUrl + '?utm_source=x'}]).newJobs.length, 1);
  assert.equal(sameJob(a, {...a, atsJobId: 'different', canonicalUrl: 'https://jobs.ashbyhq.com/synthetic/different'}), false);
  assert.equal(normalizedJobUrl('https://boards.greenhouse.io/synthetic/jobs/123/?utm_source=x#app'), normalizedJobUrl('https://job-boards.greenhouse.io/synthetic/jobs/123'));
  assert.equal(sameJob({...a, atsJobId: undefined}, {...a, atsJobId: undefined, canonicalUrl: a.canonicalUrl + '?utm_source=x'}), true);
  for (const status of ['DISCOVERED','SHORTLISTED','TAILORED','APPLIED','RECRUITER_SCREEN','HIRING_MANAGER','TECHNICAL','FINAL_ONSITE','OFFER','REJECTED','WITHDRAWN','ARCHIVED']) {
    const previous = {...applied, applicationStatus: status as any, tailoredResume: {id: 'resume'} as any, applicationAnswers: [{id: 'answer', question: 'q', answer: 'a', evidenceIds: []}]};
    const result = mergeDiscoveredJobs([previous], [a]);
    assert.equal(result.newJobs.length, 0); assert.equal(result.jobs[0].applicationStatus, status);
    assert.deepEqual(result.jobs[0].tailoredResume, previous.tailoredResume);
    assert.deepEqual(result.jobs[0].applicationAnswers, previous.applicationAnswers);
  }
});
test('company and redirect aliases require authoritative exact verification', async () => {
  const alias = 'https://careers.example.org/job';
  const authoritative = {status: 'LISTED' as const, isListed: true, lastVerifiedAt: '2026-09-12', canonicalUrl: fixture.canonicalUrl, rawDetails: {atsProvider: 'ashby', atsBoard: 'synthetic', atsJobId: 'id', title: 'Actual title', rawContent: 'Actual JD'}};
  const verify = async (url: string) => {assert.equal(url, fixture.canonicalUrl); return authoritative;};
  const redirected = await verifyGenericPage(alias, async () => ({status: 200, text: '', url: fixture.canonicalUrl}), verify);
  assert.equal(redirected.status, 'LISTED');
  const linked = await verifyGenericPage(alias, async () => ({status: 200, text: `<link href="${fixture.canonicalUrl}" rel="canonical">`, url: alias}), verify);
  assert.equal(linked.status, 'LISTED');
  const verifyAlias = async () => linked;
  const jobs = await buildDiscoveredJobs([fixture, {...fixture, canonicalUrl: alias}], [], [], verifyAlias);
  assert.equal(jobs.length, 1); assert.equal(jobs[0].atsProvider, 'ashby');
  assert.ok(jobs[0].discoveryAliases?.includes(alias));
  assert.equal((await verifyGenericPage(alias, async () => {throw new Error('failure');})).status, 'UNKNOWN');
});

function fakeTransport(replies: any[]) {
  let calls = 0;
  const transport = {get(_url: any, options: any, callback: any) {
    options.lookup('public.example.org', {all: true}, (error: any, addresses: any) => {
      assert.equal(error, null); assert.deepEqual(addresses, [{address: '93.184.216.34', family: 4}]);
    });
    options.lookup('public.example.org', {}, (error: any, address: any, family: any) => {
      assert.equal(error, null); assert.equal(address, '93.184.216.34'); assert.equal(family, 4);
    });
    const request = new EventEmitter();
    queueMicrotask(() => {
      const reply = replies[calls++]; const response: any = new EventEmitter();
      response.statusCode = reply.status || 200; response.headers = {'content-type': reply.type || 'text/html', location: reply.location};
      response.destroy = (error?: Error) => {if (error) queueMicrotask(() => response.emit('error', error));};
      callback(response);
      queueMicrotask(() => { response.emit('data', Buffer.from(reply.text || '')); response.emit('end'); });
    });
    return request;
  }};
  return {dependencies: {lookup: async () => [{address: '93.184.216.34', family: 4}], http: transport, https: transport} as any, calls: () => calls};
}
test('safe fetch rejects blocked destinations, redirects, content and size', async () => {
  for (const url of ['file:///etc/passwd','http://localhost','http://127.0.0.1','http://10.0.0.1','http://169.254.169.254','http://service.internal','http://[::1]','http://[::ffff:127.0.0.1]']) assert.throws(() => validatePublicUrl(url));
  for (const address of ['172.16.0.1','192.168.1.1','100.64.0.1','fc00::1','fe80::1']) assert.equal(blockedAddress(address), true);
  const redirected = fakeTransport([{status: 302, location: 'http://127.0.0.1/private'}]);
  await assert.rejects(safeFetchText('https://public.example.org/job', redirected.dependencies)); assert.equal(redirected.calls(), 1);
  const repeated = fakeTransport(Array(5).fill({status: 302, location: '/job'}));
  await assert.rejects(safeFetchText('https://public.example.org/job', repeated.dependencies), /Redirect limit/);
  await assert.rejects(safeFetchText('https://public.example.org/job', fakeTransport([{type: 'application/octet-stream'}]).dependencies));
  await assert.rejects(safeFetchText('https://public.example.org/job', fakeTransport([{text: 'x'.repeat(1024 * 1024 + 1)}]).dependencies));
  const page = await safeFetchText('https://public.example.org/job', fakeTransport([{text: 'Job page'}]).dependencies);
  assert.equal(page.status, 200);
  assert.equal(genericPageResult(page.url, page).status, 'UNKNOWN');
  assert.equal(genericPageResult(page.url, {...page, text: 'This job has closed'}).status, 'NOT_LISTED');
  assert.equal(genericPageResult(page.url, {...page, url: page.url + '/redirect', text: 'This job has closed'}).status, 'UNKNOWN');
  await assert.rejects(safeFetchText('https://public.example.org/job', {...fakeTransport([]).dependencies, lookup: async () => [{address: '10.0.0.1', family: 4}]}));
  const dnsRedirect = fakeTransport([{status: 302, location: 'https://private.example.org/job'}]);
  let lookups = 0;
  await assert.rejects(safeFetchText('https://public.example.org/job', {...dnsRedirect.dependencies,
    lookup: async () => [{address: ++lookups === 1 ? '93.184.216.34' : '192.168.1.1', family: 4}]}));
  assert.equal(dnsRedirect.calls(), 1);
});
test('safe fetch total deadline rejects stalled DNS and transport without network access', async () => {
  const stalledTransport: any = {get(_url: any, options: any) {
    const request = new EventEmitter();
    options.signal.addEventListener('abort', () => request.emit('error', new Error('Deadline abort')), {once: true});
    return request;
  }};
  const began = Date.now();
  await Promise.all([
    assert.rejects(safeFetchText('https://public.example.org/job', {lookup: async () => new Promise(() => {}), http: stalledTransport, https: stalledTransport} as any), /Timeout/),
    assert.rejects(safeFetchText('https://public.example.org/job', {lookup: async () => [{address: '93.184.216.34', family: 4}], http: stalledTransport, https: stalledTransport} as any), /Deadline abort/)
  ]);
  assert.ok(Date.now() - began < 12000);
});
