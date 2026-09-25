import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { verifyPostingAts, detectAtsProvider, genericPageResult, verifyGenericPage } from '../server/atsAdapters';
import { boardEndpoint, buildDiscoveredJobs, buildManualImportedJob, matchesSearchProfile, scanDiscoverySources, scanPublicBoard } from '../server/discovery';
import { buildDiscoveryQueries, discoverySourcesForWorkspace, googleSearchUrl, parseDiscoverySource } from '../src/utils/discovery';
import { calculateFreshnessBand } from '../server/searchEngine';
import { mergeDiscoveredJobs, sameJob, normalizedJobUrl } from '../src/utils/jobIdentity';
import { safeFetchText, validatePublicUrl, blockedAddress } from '../server/safeFetch';
import { jobSchema } from '../server/db/workspaceValidation';

const fixture = {url: 'https://jobs.ashbyhq.com/synthetic/id', canonicalUrl: 'https://jobs.ashbyhq.com/synthetic/id', title: 'Engineer', company: 'Synthetic Company', description: 'Board summary', source: 'public-board' as const};
const json = (data: any, status = 200) => new Response(JSON.stringify(data), {status, headers: {'content-type': 'application/json'}});
test('exact provider contracts and dates', async () => {
  const original = globalThis.fetch;
  try {
    const ashby = {jobUrl: fixture.url, applyUrl: fixture.url + '/application', title: 'Canonical title', isListed: true, descriptionPlain: 'Actual posting content', publishedAt: '2026-08-01T00:00:00Z'};
    globalThis.fetch = async () => json({jobs: [ashby]});
    assert.equal((await verifyPostingAts(fixture.canonicalUrl)).status, 'LISTED');
    const records = await buildDiscoveredJobs([fixture]);
    assert.equal(records[0].description, ashby.descriptionPlain);
    assert.equal(records[0].publishedAt, '2026-08-01T00:00:00.000Z');
    assert.notEqual(records[0].firstSeenAt, records[0].publishedAt);
    assert.equal(records[0].qualificationFit, undefined);
    assert.equal(records[0].applicationPriority, 'UNASSESSED');
    assert.deepEqual(records[0].responsibilities, []);
    assert.deepEqual(records[0].technologies, []);
    assert.deepEqual(records[0].discoverySourceUrls, [fixture.url]);
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
  const [job] = await buildDiscoveredJobs([fixture], async () => {throw new Error('failure');});
  assert.equal(job.verificationStatus, 'UNKNOWN'); assert.equal(job.isCurrentlyListed, false);
  assert.equal(job.publishedAt, undefined); assert.equal(job.freshnessBand, 'UNKNOWN');
  assert.equal(job.description, ''); assert.equal(job.canonicalUrl, ''); assert.equal(job.location, '');
  assert.ok(jobSchema.safeParse(job).success);
  assert.equal(jobSchema.safeParse({...job, qualificationFit: 8.5}).success, false);
  assert.equal(jobSchema.safeParse({...job, assessmentStatus: undefined}).success, false);
  assert.equal(calculateFreshnessBand(undefined, new Date().toISOString()), 'UNKNOWN');
  assert.equal(calculateFreshnessBand('Recent'), 'UNKNOWN');
  assert.equal(calculateFreshnessBand('2999-01-01'), 'UNKNOWN');
  assert.deepEqual(await buildDiscoveredJobs([{title: 'Missing URL'} as any]), []);
  const queries = buildDiscoveryQueries({preferredRoleFamilies: ['frontend-product', 'ui-platform-design-systems'], preferredModifiers: ['DESIGN_SYSTEMS'], technologyStrengths: ['React', 'TypeScript'], targetSeniority: ['Senior'], remotePreference: 'remote_only', excludedRolePatterns: ['Tailwind'], companyExclusions: ['Excluded Co']} as any, 10);
  assert.ok(queries.some(query => query.includes('React'))); assert.ok(queries.some(query => query.includes('TypeScript'))); assert.ok(queries.some(query => query.includes('remote')));
  const joined = queries.join('\n');
  assert.match(joined, /frontend engineer/); assert.match(joined, /design systems/); assert.match(joined, /site:jobs\.ashbyhq\.com/);
  assert.doesNotMatch(joined, /frontend-product|ui-platform-design-systems|DESIGN_SYSTEMS/);
  assert.ok(!joined.includes('Tailwind')); assert.ok(!joined.includes('Excluded Co')); assert.ok(queries.length <= 10);
});
test('keyless public board registry, provider endpoints and partial failures are deterministic', async () => {
  const configured = parseDiscoverySource('greenhouse:synthetic', 'Synthetic Company');
  assert.match(boardEndpoint(configured), /boards-api\.greenhouse\.io\/v1\/boards\/synthetic\/jobs/);
  assert.throws(() => parseDiscoverySource('https://evil.example.org/board', 'Synthetic Company'));
  assert.throws(() => parseDiscoverySource('http://jobs.lever.co/synthetic', 'Synthetic Company'));
  const ashby = parseDiscoverySource('https://jobs.ashbyhq.com/synthetic', 'Synthetic Company');
  const lever = parseDiscoverySource('lever-eu:synthetic', 'Synthetic EU');
  const ashbyLeads = await scanPublicBoard(ashby, (async () => json({jobs:[{jobUrl:fixture.url,title:'Frontend Engineer',location:'Remote',isRemote:true}]})) as typeof fetch);
  const greenhouseLeads = await scanPublicBoard(configured, (async () => json({jobs:[{absolute_url:'https://job-boards.greenhouse.io/synthetic/jobs/123',title:'Product Engineer',location:{name:'Washington, DC'}}]})) as typeof fetch);
  const leverLeads = await scanPublicBoard(lever, (async () => json([{hostedUrl:'https://jobs.eu.lever.co/synthetic/id',text:'UI Engineer',workplaceType:'remote',categories:{commitment:'full-time'}}])) as typeof fetch);
  assert.deepEqual([ashbyLeads.length, greenhouseLeads.length, leverLeads.length], [1,1,1]);
  const profile = {preferredRoleFamilies:[],technologyStrengths:[],remotePreference:'remote_only',excludedRolePatterns:['sales'],companyExclusions:[],excludedEmploymentTypes:[],allowedEmploymentTypes:[]} as any;
  const outcome = await scanDiscoverySources([ashby, configured], profile, async source => source.provider === 'greenhouse' ? Promise.reject(new Error('down')) : ashbyLeads, async () => ({status:'UNKNOWN',isListed:false,lastVerifiedAt:'2026-09-24'}));
  assert.deepEqual(outcome.sourceResults.map(result => result.status), ['SUCCESS','FAILED']);
  assert.equal(outcome.jobs.length, 1); assert.equal(outcome.queryBudgetUnit, 'public_board_scans');
  assert.equal(matchesSearchProfile({...fixture,title:'Sales Engineer'}, profile), false);
  assert.equal(matchesSearchProfile({...fixture,remoteStatus:'unknown'}, profile), true);
  assert.equal(matchesSearchProfile({...fixture,remoteStatus:'onsite'}, profile), false);
});
test('deterministic Google queries use configured preferences only', () => {
  const profile = {preferredRoleFamilies: [], technologyStrengths: ['SyntheticTech'], remotePreference: 'any', name: 'PRIVATE_IDENTITY', email: 'PRIVATE_CONTACT', salaryPreference: {minTarget: 123, email: 'PRIVATE_NESTED_CONTACT'}} as any;
  const queries = buildDiscoveryQueries(profile, 10);
  assert.ok(queries.join('\n').includes('SyntheticTech')); assert.ok(!queries.join('\n').includes('PRIVATE_'));
  assert.ok(queries.length <= 10); assert.match(googleSearchUrl(queries[0]), /^https:\/\/www\.google\.com\/search\?q=/);
  assert.equal(new URL(googleSearchUrl(queries[0])).searchParams.get('q'), queries[0]);
  for (const maximum of [0, -1, 11, 1.5]) assert.throws(() => buildDiscoveryQueries(profile, maximum));
});
test('verified jobs teach board sources and manual URL/JD imports remain unassessed', async () => {
  const verified = async () => ({status:'LISTED' as const,isListed:true,lastVerifiedAt:'2026-09-24',canonicalUrl:fixture.url,rawDetails:{atsProvider:'ashby',atsBoard:'synthetic',atsJobId:'id',title:'Canonical Engineer',rawContent:'Canonical JD'}});
  const imported = await buildManualImportedJob({url:fixture.url,description:'Owner pasted JD',company:'Synthetic Company',title:'Fallback title'}, verified);
  assert.equal(imported.sourceChannel, 'Manual Web Import'); assert.equal(imported.jdSource, 'user-provided');
  assert.equal(imported.description, 'Owner pasted JD'); assert.equal(imported.assessmentStatus, 'UNASSESSED'); assert.equal(imported.applicationPriority, 'UNASSESSED');
  const profile = {discoverySources:[]} as any;
  const learned = discoverySourcesForWorkspace(profile, [imported]);
  assert.equal(learned.length, 1); assert.equal(learned[0].origin, 'learned'); assert.equal(learned[0].boardId, 'synthetic');
  const disabled = {...learned[0],origin:'configured' as const,enabled:false};
  assert.equal(discoverySourcesForWorkspace({discoverySources:[disabled]} as any,[imported])[0].enabled,false,'owner override wins over learned source');
  assert.deepEqual(discoverySourcesForWorkspace({discoverySources:[{...disabled,removed:true}]} as any,[imported]),[], 'removed configured source must suppress its learned counterpart');
  const generic = await buildManualImportedJob({url:'https://careers.example.org/job',company:'Synthetic Company',title:'Role'}, async () => ({status:'UNKNOWN',isListed:false,lastVerifiedAt:'2026-09-24'}), async url => ({status:200,url,text:'<main>Fetched public JD</main>'}));
  assert.equal(generic.description,'Fetched public JD'); assert.equal(generic.jdSource,undefined); assert.equal(generic.assessmentStatus,'UNASSESSED');
  await assert.rejects(buildManualImportedJob({url:'http://127.0.0.1/private'}));
});
test('identity hierarchy and history-safe canonical refresh', async () => {
  const verify = async () => ({status: 'LISTED' as const, isListed: true, lastVerifiedAt: '2026-09-12', canonicalUrl: fixture.canonicalUrl, rawDetails: {rawContent: 'JD'}});
  const [a] = await buildDiscoveredJobs([fixture], verify);
  const applied = {...a, id: 'existing', applicationStatus: 'APPLIED' as const, firstSeenAt: '2026-01-01', notes: 'keep', statusHistory: [{from: 'DISCOVERED' as const, to: 'APPLIED' as const, timestamp: '2026-01-02'}]};
  const merged = mergeDiscoveredJobs([applied], [{...a, description: 'better JD'}]);
  assert.equal(merged.newJobs.length, 0); assert.equal(merged.jobs[0].id, 'existing');
  assert.equal(merged.jobs[0].applicationStatus, 'APPLIED'); assert.equal(merged.jobs[0].firstSeenAt, '2026-01-01');
  assert.deepEqual(merged.jobs[0].statusHistory, applied.statusHistory); assert.equal(merged.jobs[0].notes, 'keep');
  assert.equal(merged.jobs[0].description, 'better JD');
  const latest = {...applied, applicationStatus: 'REJECTED' as const, notes: 'edited during discovery'};
  const lateResult = mergeDiscoveredJobs([latest], merged.refreshedJobs);
  assert.equal(lateResult.jobs[0].applicationStatus, 'REJECTED');
  assert.equal(lateResult.jobs[0].notes, 'edited during discovery');
  assert.equal(mergeDiscoveredJobs([], [a, {...a, id: 'second', discoveryUrl: fixture.url + '?utm_source=x'}]).newJobs.length, 1);
  assert.equal(sameJob(a, {...a, atsJobId: 'different', canonicalUrl: 'https://jobs.ashbyhq.com/synthetic/different'}), false);
  const companyAlias = 'https://careers.example.org/job';
  const manualAlias = {...a, id: 'manual', atsProvider: 'company-careers' as const, atsBoard: undefined, atsJobId: undefined, canonicalUrl: companyAlias, discoveryUrl: companyAlias, discoveryAliases: [companyAlias]};
  const verifiedAlias = {...a, canonicalUrl: fixture.url, discoveryUrl: companyAlias, discoveryAliases: [companyAlias, fixture.url]};
  assert.equal(sameJob(manualAlias, verifiedAlias), true);
  const aliasMerge = mergeDiscoveredJobs([manualAlias], [verifiedAlias]);
  assert.equal(aliasMerge.newJobs.length, 0); assert.equal(aliasMerge.refreshedJobs[0].id, 'manual');
  assert.deepEqual(mergeDiscoveredJobs([], aliasMerge.refreshedJobs).newJobs.map(job => job.id), ['manual'], 'server refresh retains the existing ID so the client can discard it after an in-flight delete');
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
  const authoritative = {status: 'LISTED' as const, isListed: true, lastVerifiedAt: '2026-09-12', canonicalUrl: fixture.url, rawDetails: {atsProvider: 'ashby', atsBoard: 'synthetic', atsJobId: 'id', title: 'Actual title', rawContent: 'Actual JD'}};
  const verify = async (url: string) => {assert.equal(url, fixture.url); return authoritative;};
  const redirected = await verifyGenericPage(alias, async () => ({status: 200, text: '', url: fixture.url}), verify);
  assert.equal(redirected.status, 'LISTED');
  const linked = await verifyGenericPage(alias, async () => ({status: 200, text: `<link href="${fixture.url}" rel="canonical">`, url: alias}), verify);
  assert.equal(linked.status, 'LISTED');
  const verifyAlias = async () => linked;
  const jobs = await buildDiscoveredJobs([fixture, {...fixture, url: alias}], verifyAlias);
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
