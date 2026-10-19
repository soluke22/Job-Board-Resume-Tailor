import test from 'node:test';
import assert from 'node:assert/strict';
import {
  boardEndpoint, classifyDiscoverySeniority, deduplicateDiscoveryLeads, DiscoveryProviderError,
  employmentEligibility, locationEligibility, matchesSearchProfile, roleEligibility, scanDiscoverySources, scanPublicBoard, type DiscoveryLead
} from '../server/discovery';
import { employmentTypeAllowed, normalizeEmploymentType } from '../src/utils/employment';
import { DEFAULT_SEARCH_PROFILE } from '../src/data/privateSeedTemplate';
import type { SearchProfile } from '../src/types';
import type { DiscoverySource } from '../src/utils/discovery';
import { searchSessionDiagnosticSchema } from '../server/db/workspaceValidation';
import { verifyPostingAts } from '../server/atsAdapters';

const source = (provider: 'ashby' | 'greenhouse' | 'lever' = 'ashby', boardId = 'synthetic'): DiscoverySource => ({
  id: `${provider}:${boardId}`, company: 'Synthetic Company', provider, boardId,
  boardUrl: provider === 'greenhouse' ? `https://job-boards.greenhouse.io/${boardId}` : provider === 'lever' ? `https://jobs.lever.co/${boardId}` : `https://jobs.ashbyhq.com/${boardId}`,
  enabled: true, origin: 'configured'
});
const profile = (changes: Partial<SearchProfile> = {}): SearchProfile => ({
  ...structuredClone(DEFAULT_SEARCH_PROFILE),
  preferredRoleFamilies: ['frontend-product','ui-platform-design-systems','frontend-heavy-fullstack','production-support-frontend','forward-deployed-software'],
  preferredModifiers: ['AI_PRODUCT','DEVELOPER_TOOLING','DESIGN_SYSTEMS'],
  allowedEmploymentTypes: ['Full-time'], excludedEmploymentTypes: ['Internship','Contract'],
  remotePreference: 'hybrid_flexible', hybridLocations: ['Washington, DC','Maryland','Northern Virginia'],
  excludedRolePatterns: [], ...changes
});
const lead = (title: string, changes: Partial<DiscoveryLead> = {}): DiscoveryLead => ({
  url: `https://jobs.ashbyhq.com/synthetic/${encodeURIComponent(title)}`,
  title, company: 'Synthetic Company', location: 'Remote, United States', remoteStatus: 'remote',
  employmentType: 'full-time', source: 'public-board', ...changes
});
const json = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status, headers: { 'content-type':'application/json' } });

test('provider employment values normalize without promoting unknown values', () => {
  for (const value of ['FullTime','Full-time','full time','Regular','Permanent']) assert.equal(normalizeEmploymentType(value), 'full-time', value);
  for (const value of ['PartTime','part-time']) assert.equal(normalizeEmploymentType(value), 'part-time', value);
  for (const value of ['Contract','Contractor','Freelance']) assert.equal(normalizeEmploymentType(value), 'contract', value);
  for (const value of ['Intern','Internship']) assert.equal(normalizeEmploymentType(value), 'internship', value);
  for (const value of ['Temporary','Temp','FixedTerm']) assert.equal(normalizeEmploymentType(value), 'temporary', value);
  for (const value of [undefined,'','Seasonal','Full-ish']) assert.equal(normalizeEmploymentType(value), 'unknown', String(value));
  assert.deepEqual(employmentTypeAllowed('FullTime', ['Full-time'], ['Contract']), { eligible:true, employmentType:'full-time' });
  assert.deepEqual(employmentTypeAllowed('Intern', ['Full-time'], ['Internship']), { eligible:false, employmentType:'internship', reason:'EMPLOYMENT_EXCLUDED' });
  assert.deepEqual(employmentTypeAllowed('Contract', ['Full-time'], []), { eligible:false, employmentType:'contract', reason:'EMPLOYMENT_NOT_ALLOWED' });
  assert.deepEqual(employmentTypeAllowed('Seasonal', ['Full-time'], []), { eligible:true, employmentType:'unknown' }, 'unknown remains uncertain instead of becoming full-time or a fabricated blocker');
});

test('Ashby FullTime is canonicalized before filtering while raw provenance survives', async () => {
  const ashby = source('ashby');
  const url = 'https://jobs.ashbyhq.com/synthetic/full-time-role';
  const rows = await scanPublicBoard(ashby, (async () => json({ jobs:[{
    id:'full-time-role', jobUrl:url, title:'Frontend Engineer', location:'Remote, United States', isRemote:true,
    isListed:true, employmentType:'FullTime', publishedAt:'2026-10-14T12:00:00.000Z', descriptionPlain:'Build React user interfaces.'
  }] })) as typeof fetch);
  assert.equal(rows[0].employmentType, 'full-time');
  assert.equal((rows[0].verification?.rawDetails as any).employmentType, 'full-time');
  assert.equal((rows[0].verification?.rawDetails as any).providerMetadata.rawEmploymentType, 'FullTime');
  const outcome = await scanDiscoverySources([ashby], profile(), async()=>rows, undefined, new Map(), {windowDays:14,now:Date.parse('2026-10-14T16:00:00.000Z')});
  assert.equal(outcome.jobs.length, 1);
  assert.equal(outcome.diagnostics.filterCounts.employmentNotAllowed, 0);
});

test('Greenhouse custom career URLs retain board identity and deduplicate by requisition id', async () => {
  const greenhouse = source('greenhouse', 'synthetic');
  const rows = await scanPublicBoard(greenhouse, (async () => json({ jobs:[
    { id:8159652, absolute_url:'https://jobs.synthetic.example/listing/8159652?gh_jid=8159652', title:'Frontend Engineer', first_published:'2026-10-14T12:00:00.000Z' },
    { id:8159652, absolute_url:'https://careers.synthetic.example/jobs/8159652', title:'Frontend Engineer', first_published:'2026-10-14T12:00:00.000Z' }
  ] })) as typeof fetch);
  assert.equal(rows.length, 2);
  assert.deepEqual(rows.map(row => (row.verification?.rawDetails as any).atsJobId), ['8159652','8159652']);
  const deduped = deduplicateDiscoveryLeads([rows]);
  assert.equal(deduped.queues[0].leads.length, 1);
  assert.equal(deduped.stats.acceptedUnique, 1);
});

test('seniority precedence rejects Staff+, Director, and management but preserves Senior roles', () => {
  assert.equal(classifyDiscoverySeniority('Junior Frontend Engineer'), 'JUNIOR');
  assert.equal(classifyDiscoverySeniority('Mid-level UI Engineer'), 'MID');
  assert.equal(classifyDiscoverySeniority('Senior Frontend Engineer'), 'SENIOR');
  assert.equal(classifyDiscoverySeniority('Staff Frontend Engineer'), 'STAFF');
  assert.equal(classifyDiscoverySeniority('Principal Product Engineer'), 'PRINCIPAL');
  assert.equal(classifyDiscoverySeniority('Senior Engineering Manager'), 'DIRECTOR_MANAGEMENT');
  assert.equal(classifyDiscoverySeniority('Director, Partner Solution Engineer'), 'DIRECTOR_MANAGEMENT');
  assert.equal(classifyDiscoverySeniority('Frontend Engineer'), 'UNKNOWN');
  for (const title of ['Staff Frontend Engineer','Principal Product Engineer']) assert.equal(roleEligibility(lead(title), profile()).reason, 'SENIORITY_INCOMPATIBLE');
  for (const title of ['Engineering Manager','Director, Partner Solution Engineer']) assert.equal(roleEligibility(lead(title), profile()).reason, 'MANAGEMENT_ROLE');
  const senior = roleEligibility(lead('Senior Frontend Engineer', {description:'Five years building React and TypeScript product interfaces.'}), profile());
  assert.equal(senior.eligible, true, 'Senior and a five-year request are not automatic blockers');
});

test('role precedence rejects verified false positives and retains explicit target lanes', () => {
  const cases: Array<[DiscoveryLead,string]> = [
    [lead('Product Manager (ex-founder or ex-product engineer)'), 'MANAGEMENT_ROLE'],
    [lead('Platform Engineer - Compute'), 'NON_TARGET_DOMAIN'],
    [lead('Cloud Platform Engineer'), 'NON_TARGET_DOMAIN'],
    [lead('Software Engineer, Networking (Features)'), 'NON_TARGET_DOMAIN'],
    [lead('Senior Software Engineer, AI Developer Tools', {description:'Build backend services, distributed systems, Kubernetes infrastructure, and Go services.'}), 'NON_TARGET_DOMAIN'],
    [lead('Senior Fullstack Engineer - Grafana Data Source Plugins', {description:'Golang, Kubernetes, microservices, on-call operations and SRE tasks.'}), 'BACKEND_HEAVY_FULL_STACK']
  ];
  for (const [candidate,reason] of cases) assert.equal(roleEligibility(candidate, profile()).reason, reason, candidate.title);

  const expected: Array<[DiscoveryLead,string]> = [
    [lead('Frontend Engineer'), 'frontend-product'],
    [lead('UI Engineer'), 'frontend-product'],
    [lead('Product Engineer'), 'frontend-product'],
    [lead('Design Systems Engineer'), 'ui-platform-design-systems'],
    [lead('Frontend Platform Engineer'), 'ui-platform-design-systems'],
    [lead('Developer Experience Engineer'), 'ui-platform-design-systems'],
    [lead('Full Stack Engineer', {description:'Build React and TypeScript web applications backed by Node services.'}), 'frontend-heavy-fullstack'],
    [lead('AI Product Engineer', {description:'Build React interfaces for AI-assisted workflows.'}), 'frontend-product'],
    [lead('Software Engineer', {description:'Own React, TypeScript, Storybook, accessibility, and browser UI.'}), 'frontend-heavy-fullstack']
  ];
  for (const [candidate,family] of expected) {
    const result = roleEligibility(candidate, profile());
    assert.equal(result.eligible, true, candidate.title);
    assert.equal(result.family, family, candidate.title);
  }
  assert.equal(roleEligibility(lead('Software Engineer'), profile()).reason, 'ROLE_EVIDENCE_INSUFFICIENT');
});

test('verified examples retain explainable title versus description outcomes', () => {
  const cmgx = roleEligibility(lead('Senior Frontend Engineer (Analytics Product Lead)', {description:'React, TypeScript, GraphQL, accessibility, Storybook and Playwright.'}), profile());
  assert.deepEqual(cmgx, {eligible:true,family:'frontend-product',seniority:'SENIOR',evidence:'TITLE'});
  const grafana = roleEligibility(lead('Senior Fullstack Engineer - Grafana Data Source Plugins', {description:'Golang, Kubernetes, microservices, on-call operations and SRE tasks.'}), profile());
  assert.equal(grafana.reason, 'BACKEND_HEAVY_FULL_STACK');
  const docker = roleEligibility(lead('Senior Software Engineer, AI Developer Tools', {description:'Developer infrastructure using Go, Kubernetes, distributed systems and CI/CD.'}), profile());
  assert.equal(docker.reason, 'NON_TARGET_DOMAIN');
});

test('non-US-only locations fail even when workplace metadata is absent', () => {
  for (const location of ['Canada','Remote, Canada','United Kingdom','Berlin, Germany'])
    assert.equal(locationEligibility(lead('Frontend Engineer',{location,remoteStatus:'unknown'}),profile()).eligible,false,location);
  assert.equal(locationEligibility(lead('Frontend Engineer',{location:'Remote, Canada or United States',remoteStatus:'unknown'}),profile()).eligible,true);
  assert.equal(locationEligibility(lead('Frontend Engineer',{location:'Remote, United States',remoteStatus:'remote'}),profile()).eligible,true);
  assert.equal(locationEligibility(lead('Frontend Engineer',{location:'Washington, DC',remoteStatus:'hybrid'}),profile()).eligible,true);
});

test('provider health distinguishes HTTP, invalid, empty, and filtered-zero outcomes', async () => {
  const ashby = source('ashby');
  await assert.rejects(scanPublicBoard(ashby,(async()=>json({},404)) as typeof fetch),(error:any)=>error instanceof DiscoveryProviderError && error.health==='HTTP_FAILURE');
  await assert.rejects(scanPublicBoard(ashby,(async()=>new Response('not json',{status:200,headers:{'content-type':'text/plain'}})) as typeof fetch),(error:any)=>error instanceof DiscoveryProviderError && error.health==='INVALID_RESPONSE');
  assert.throws(()=>boardEndpoint({...ashby,provider:'unsupported'} as any),(error:any)=>error instanceof DiscoveryProviderError && error.health==='UNSUPPORTED_PROVIDER');
  const irrelevant = lead('Product Manager');
  const outcomes = await scanDiscoverySources([source('ashby','empty'),source('greenhouse','filtered')],profile(),async item=>item.boardId==='empty'?[]:[irrelevant]);
  assert.deepEqual(outcomes.sourceResults.map(result=>[result.status,result.health]),[['SUCCESS','EMPTY_BOARD'],['SUCCESS','ZERO_ELIGIBLE']]);
});

test('legacy search-session diagnostics hydrate with conservative provider health defaults', () => {
  const parsed = searchSessionDiagnosticSchema.parse({
    id:'legacy-session', requestedWindowDays:14, searchedAt:'2026-10-14T12:00:00.000Z', scope:'ALL_ENABLED',
    sources:[
      {sourceId:'ashby:empty',provider:'ashby',boardId:'empty',status:'SUCCESS',fetched:0,selected:0},
      {sourceId:'greenhouse:filtered',provider:'greenhouse',boardId:'filtered',status:'SUCCESS',fetched:5,selected:0},
      {sourceId:'lever:failed',provider:'lever',boardId:'failed',status:'FAILED',fetched:0,selected:0}
    ],
    filters:{profileExcluded:0,companyExcluded:0,employmentExcluded:0,employmentNotAllowed:0,roleExcluded:5,locationExcluded:0,knownOlderExcluded:0,futureExcluded:0,unknownDateUnselected:0,capUnselected:0},
    totals:{candidatesEncountered:5,duplicatesRemoved:0,selectedForVerification:0,successfullyVerified:0,newlyDiscovered:0,rediscovered:0},
    providerErrors:[{sourceId:'lever:failed',provider:'lever',boardId:'failed'}], unsupportedProviders:[]
  });
  assert.deepEqual(parsed.sources.map(source=>source.health),['EMPTY_BOARD','ZERO_ELIGIBLE','UNKNOWN_FAILURE']);
  assert.equal(parsed.providerErrors[0].reason,'UNKNOWN_FAILURE');
});

test('named Greenhouse employment and workplace metadata normalize while raw fields survive', async () => {
  const metadata = [{name:'Employment Type',value:'FullTime'},{name:'Workplace Type',value:'Hybrid'},{name:'Team description',value:'Internship'}];
  const rows = await scanPublicBoard(source('greenhouse'), (async () => json({jobs:[{
    id:101,absolute_url:'https://careers.synthetic.example/jobs/101',title:'Frontend Engineer',
    location:{name:'Synthetic Capital'},content:'Build React interfaces.',metadata
  }]})) as typeof fetch);
  assert.equal(rows[0].employmentType,'full-time');
  assert.equal(rows[0].remoteStatus,'hybrid');
  assert.deepEqual((rows[0].verification?.rawDetails as any).providerMetadata.metadata,metadata);
  assert.equal(matchesSearchProfile(rows[0],profile({hybridLocations:['Synthetic Capital']})),true);
  const original=globalThis.fetch;
  try {
    globalThis.fetch=(async()=>json({id:101,title:'Frontend Engineer',absolute_url:'https://careers.synthetic.example/jobs/101',metadata})) as typeof fetch;
    const verified=await verifyPostingAts('https://job-boards.greenhouse.io/synthetic/jobs/101');
    assert.equal(verified.rawDetails?.employmentType,'full-time');
    assert.equal(verified.rawDetails?.remoteStatus,'hybrid');
    assert.deepEqual(verified.rawDetails?.providerMetadata.metadata,metadata);
  } finally {globalThis.fetch=original;}
});

test('structured internships and disallowed temporary employment cannot hide behind missing top-level type', async () => {
  const rows=await scanPublicBoard(source('greenhouse'),(async()=>json({jobs:['Internship','Temporary','Unspecified'].map((value,index)=>({
    id:200+index,absolute_url:`https://careers.synthetic.example/jobs/${200+index}`,title:'Frontend Engineer',
    metadata:[{name:'Employment Type',value}],location:{name:'Remote, United States'}
  }))})) as typeof fetch);
  assert.deepEqual(rows.map(row=>employmentEligibility(row,profile()).eligible),[false,false,true]);
  assert.equal(rows[2].employmentType,'unknown');
});

test('explicit internships and student-only programs are excluded with reasons', () => {
  for(const candidate of [lead('Frontend Engineering Intern'),lead('Software Engineer, Summer Internship'),
    lead('Frontend Engineer',{employmentType:undefined,description:'This is a paid internship.'}),
    lead('Frontend Engineer, Student Co-op')]) {
    assert.equal(employmentEligibility(candidate,profile()).detail,'EXPLICIT_INTERNSHIP');
    assert.equal(matchesSearchProfile(candidate,profile()),false);
  }
  for(const description of ['Applicants must be currently enrolled in a university degree program.',
    'This temporary placement is only open to students.','Candidates must be current students.']) {
    const candidate=lead('Software Engineer, New Graduate Program',{description,employmentType:undefined});
    assert.equal(employmentEligibility(candidate,profile()).detail,'STUDENT_ONLY_PROGRAM');
    assert.equal(matchesSearchProfile(candidate,profile()),false);
  }
});

test('junior professional roles, non-student graduates and missing employment remain eligible', () => {
  for(const title of ['Junior Frontend Engineer','Associate UI Engineer','Entry Level Frontend Engineer','New Graduate Frontend Engineer','Internal Tools Frontend Engineer']) {
    const candidate=lead(title,{employmentType:undefined,description:'Build React interfaces. Mentor interns. Must be enrolled in security training.'});
    assert.equal(matchesSearchProfile(candidate,profile()),true,title);
    assert.equal(employmentEligibility(candidate,profile()).detail,'EMPLOYMENT_UNKNOWN_PASS');
    assert.equal(candidate.employmentType,undefined);
  }
  assert.equal(matchesSearchProfile(lead('Frontend Engineer',{description:'This role is not an internship. Student status is not required.'}),profile()),true);
  assert.equal(employmentEligibility(lead('Frontend Engineer',{employmentType:'internship'}),profile({allowedEmploymentTypes:[],excludedEmploymentTypes:[]})).eligible,false);
});

test('explicit backend-primary responsibilities beat incidental React and product/full-stack titles', () => {
  for(const title of ['Software Engineer','Full Stack Engineer','Product Engineer']) {
    const candidate=lead(title,{description:'Your primary responsibility is building backend services. Familiarity with React is a bonus.'});
    assert.equal(roleEligibility(candidate,profile()).reason,'BACKEND_PRIMARY_ROLE');
    assert.equal(matchesSearchProfile(candidate,profile()),false);
  }
  assert.equal(roleEligibility(lead('Software Engineer',{description:'You will primarily develop backend services. Occasionally touch React components.'}),profile()).eligible,false);
});

test('frontend delivery with backend collaboration and substantial full-stack frontend work survive', () => {
  for(const title of ['Frontend Engineer','Full Stack Engineer','AI Product Engineer','Design Systems Engineer']) {
    const candidate=lead(title,{description:'You will primarily build React interfaces and collaborate with backend teams. Own accessible components and production web applications.'});
    assert.equal(matchesSearchProfile(candidate,profile()),true,title);
  }
  assert.equal(matchesSearchProfile(lead('Full Stack Engineer',{description:'This role is not backend-primary. Build React interfaces and Node APIs.'}),profile()),true);
  assert.equal(matchesSearchProfile(lead('Full Stack Engineer',{description:'This role is backend agnostic. Build React interfaces and production Node services.'}),profile()),true);
});

test('pre-sales primary roles are excluded without rejecting production customer engineering', () => {
  for(const title of ['Solutions Engineer','Software Engineer','Forward Deployed Engineer']) {
    const candidate=lead(title,{department:'Engineering',description:'Your primary focus is delivering sales demonstrations. Familiarity with JavaScript and React is helpful.'});
    assert.equal(roleEligibility(candidate,profile()).reason,'PRE_SALES_PRIMARY_ROLE');
  }
  assert.equal(roleEligibility(lead('Pre-sales Solutions Engineer',{department:'Engineering'}),profile()).eligible,false);
  for(const title of ['Forward Deployed Engineer','Solutions Engineer','Customer Engineer']) {
    const candidate=lead(title,{description:'Build customer integrations and production software. Support customers deploying applications. Collaborate with pre-sales colleagues.'});
    assert.equal(roleEligibility(candidate,profile()).eligible,true,title);
  }
  const uncertain=roleEligibility(lead('Solutions Engineer',{department:'Engineering',description:'JavaScript familiarity is useful.'}),profile());
  assert.equal(uncertain.eligible,true);
  assert.equal(uncertain.reason,'ROLE_SCOPE_UNKNOWN_PASS');
});

test('mandatory distant attendance is excluded even when workplace metadata is absent', () => {
  for(const description of ['You must work on-site at our Synthetic Harbor office three days per week.',
    'This role requires in-person attendance at our Synthetic Harbor office.','Mandatory hybrid attendance at the Synthetic Harbor office.',
    'Employees are required to attend our Synthetic Harbor office.']) {
    const candidate=lead('Frontend Engineer',{location:'Synthetic Harbor, WA',remoteStatus:'unknown',description});
    assert.deepEqual(locationEligibility(candidate,profile()),{eligible:false,reason:'LOCATION_INCOMPATIBLE'});
  }
  assert.deepEqual(locationEligibility(lead('Frontend Engineer',{location:'',remoteStatus:'unknown',description:'You must relocate to Synthetic Harbor.'}),profile()),{eligible:false,reason:'RELOCATION_REQUIRED'});
});

test('US remote and potentially local hybrid remain eligible without inventing transit feasibility', () => {
  const remote=lead('Frontend Engineer',{location:'Remote, United States',description:'Build user interfaces. Optional visits to our Synthetic Harbor office.'});
  assert.equal(locationEligibility(remote,profile()).eligible,true);
  const local=lead('Frontend Engineer',{location:'Synthetic Capital',remoteStatus:'unknown',description:'This role requires hybrid attendance at our office.'});
  assert.equal(locationEligibility(local,profile({hybridLocations:['Synthetic Capital']})).eligible,true);
  const optional=lead('Frontend Engineer',{location:'Synthetic Harbor, WA',remoteStatus:'unknown',description:'On-site attendance is not required. Office visits are optional. Relocation is not required.'});
  assert.deepEqual(locationEligibility(optional,profile()),{eligible:true,reason:'LOCATION_UNKNOWN_PASS'});
  for(const description of ['This role requires building in-office scheduling tools.',
    'This role requires experience building hybrid cloud interfaces.']) {
    assert.deepEqual(locationEligibility(lead('Frontend Engineer',{location:'Synthetic Harbor, WA',remoteStatus:'unknown',description}),profile()),{eligible:true,reason:'LOCATION_UNKNOWN_PASS'});
  }
});

test('unknown workplace is explicit and never promoted to remote by a city label', async () => {
  const candidate=lead('Frontend Engineer',{location:'Synthetic Harbor, WA',remoteStatus:'unknown',description:'Build React interfaces.'});
  assert.deepEqual(locationEligibility(candidate,profile()),{eligible:true,reason:'LOCATION_UNKNOWN_PASS'});
  const rows=await scanPublicBoard(source('greenhouse'),(async()=>json({jobs:[{
    id:301,absolute_url:'https://careers.synthetic.example/jobs/301',title:'Frontend Engineer',location:{name:'Synthetic Harbor, WA'},
    content:'Build React interfaces.',first_published:'2026-10-14T12:00:00.000Z'
  }]})) as typeof fetch);
  const outcome=await scanDiscoverySources([source('greenhouse')],profile(),async()=>rows,undefined,new Map(),{windowDays:1,now:Date.parse('2026-10-14T16:00:00Z')});
  assert.equal(outcome.jobs[0].remoteStatus,'unknown');
  assert.equal(outcome.jobs[0].employmentType,'unknown');
});

test('conflicting structured metadata stays uncertain instead of imposing a guessed policy', async () => {
  const rows=await scanPublicBoard(source('greenhouse'),(async()=>json({jobs:[{
    id:401,absolute_url:'https://careers.synthetic.example/jobs/401',title:'Frontend Engineer',location:{name:'Synthetic Harbor, WA'},
    employmentType:'FullTime',workplaceType:'hybrid',metadata:[{name:'Employment Type',value:'Contract'},{name:'Workplace Type',value:'remote'}]
  }]})) as typeof fetch);
  assert.equal(rows[0].employmentType,'unknown');
  assert.equal(rows[0].remoteStatus,'unknown');
  assert.deepEqual(locationEligibility(rows[0],profile()),{eligible:true,reason:'LOCATION_UNKNOWN_PASS'});
  assert.equal(employmentEligibility(rows[0],profile()).detail,'EMPLOYMENT_UNKNOWN_PASS');
});

test('precision exclusions enter existing diagnostics before unchanged allocation', async () => {
  const titles=['Frontend Intern','Frontend Engineer Student','Full Stack Engineer Backend','Solutions Engineer','Frontend Engineer Distant','Junior Frontend Engineer'];
  const descriptions=['Build React interfaces.','Applicants must be current students.','This role is backend-primary. React is useful.',
    'Your primary focus is sales demonstrations. JavaScript is useful.','You must work on-site at our Synthetic Harbor office.','Build React interfaces.'];
  const rows=titles.map((title,index)=>lead(title,{description:descriptions[index],location:index===4?'Synthetic Harbor, WA':'Remote, United States',remoteStatus:index===4?'unknown':'remote',
    verification:{status:'LISTED',isListed:true,lastVerifiedAt:'2026-10-14T16:00:00Z',rawDetails:{publishedAt:'2026-10-14T12:00:00Z'}}}));
  const outcome=await scanDiscoverySources([source()],profile(),async()=>rows,undefined,new Map(),{windowDays:1,now:Date.parse('2026-10-14T16:00:00Z')});
  assert.deepEqual(outcome.jobs.map(job=>job.title),['Junior Frontend Engineer']);
  assert.equal(outcome.diagnostics.filterCounts.employmentExcluded,2);
  assert.equal(outcome.diagnostics.filterCounts.roleExcluded,2);
  assert.equal(outcome.diagnostics.filterCounts.locationExcluded,1);
  assert.equal(outcome.sourceResults[0].selected,1);
});

test('forward-deployed business domains retain production AI engineers and expose ambiguous duties', () => {
  for (const domain of ['Finance','Legal','Compliance','Accounting']) {
    const candidate=lead(`Forward Deployed Engineer, ${domain}`, {
      department:domain,description:'Build and deploy production AI applications. Own customer integrations and maintain production software.'
    });
    const result=roleEligibility(candidate,profile());
    assert.equal(result.eligible,true,domain);
    assert.equal(result.family,'forward-deployed-software');
    assert.equal(result.reason,'SOFTWARE_DELIVERY');
    assert.equal(matchesSearchProfile(candidate,profile()),true);
    assert.equal(roleEligibility({...candidate,description:'Your primary responsibility is accounting automation. Build production AI applications.'},profile()).eligible,true);
    const uncertain=roleEligibility({...candidate,description:'Work with domain teams on evolving requirements.'},profile());
    assert.equal(uncertain.eligible,true);
    assert.equal(uncertain.reason,'ROLE_SCOPE_UNKNOWN_PASS');
    assert.equal(roleEligibility(candidate,profile({preferredRoleFamilies:['frontend-product']})).eligible,false);
  }
});

test('forward-deployed titles cannot override business-only, primary pre-sales or backend duties', () => {
  for (const title of ['Finance Analyst','Legal Counsel']) {
    assert.equal(roleEligibility(lead(title,{description:'Prepare financial reports and review contracts.'}),profile()).reason,'NON_ENGINEERING_ROLE');
  }
  for (const description of ['This role is nontechnical. Build software familiarity is useful.',
    'Your primary responsibility is financial reporting. Familiarity with React is helpful.',
    'Your primary responsibility is providing legal advice. Build production software occasionally.',
    'This role does not involve software development. Build applications familiarity is helpful.']) {
    assert.equal(roleEligibility(lead('Forward Deployed Engineer, Finance',{description}),profile()).reason,'NON_ENGINEERING_ROLE',description);
  }
  for (const title of ['Solutions Consultant','Forward Deployed Engineer, Legal']) {
    assert.equal(roleEligibility(lead(title,{description:'Your primary focus is delivering sales demonstrations. JavaScript familiarity is useful.'}),profile()).reason,'PRE_SALES_PRIMARY_ROLE');
  }
  assert.equal(roleEligibility(lead('Forward Deployed Engineer, Pre-sales',{description:'Build applications for demonstrations.'}),profile()).reason,'PRE_SALES_PRIMARY_ROLE');
  assert.equal(roleEligibility(lead('Forward Deployed Engineer, Finance',{description:'Your primary responsibility is building backend services. React is useful.'}),profile()).reason,'BACKEND_PRIMARY_ROLE');
  assert.equal(roleEligibility(lead('Forward Deployed Engineer, Legal',{description:'This role is not nontechnical. Build production software.'}),profile()).eligible,true);
});

test('Toronto province notation is Canadian even without a spelled-out country or workplace', () => {
  for (const location of ['Toronto, ON, CA','Toronto, Ontario','Toronto, Ontario, Canada','Toronto, ON','Synthetic City, BC, CA']) {
    for (const remoteStatus of ['hybrid','onsite','unknown'] as const) {
      assert.deepEqual(locationEligibility(lead('Frontend Engineer',{location,remoteStatus}),profile({remotePreference:'any'})),
        {eligible:false,reason:'LOCATION_INCOMPATIBLE'},`${location}: ${remoteStatus}`);
    }
  }
});

test('explicit country and province metadata resolve Canadian geography without reinterpreting US fields', () => {
  for (const providerMetadata of [
    {metadata:[{name:'Country',value:'CA'}]},
    {metadata:[{name:'Country Code',value:'Canada'}]},
    {metadata:[{name:'Province',value:'Ontario'}]},
    {metadata:[{name:'State / Province',value:'QC'}]},
    {address:{city:'Synthetic City',province:'ON'}},
    {address:{city:'Synthetic City',country_code:'CA'}}
  ]) {
    const candidate=lead('Frontend Engineer',{location:'Synthetic City',remoteStatus:'unknown',
      verification:{status:'LISTED',isListed:true,lastVerifiedAt:'2026-10-14T16:00:00Z',rawDetails:{providerMetadata}}});
    assert.deepEqual(locationEligibility(candidate,profile({remotePreference:'any'})),{eligible:false,reason:'LOCATION_INCOMPATIBLE'});
  }
  const us=lead('Frontend Engineer',{location:'Ontario, California',remoteStatus:'unknown',
    verification:{status:'LISTED',isListed:true,lastVerifiedAt:'2026-10-14T16:00:00Z',rawDetails:{providerMetadata:{address:{country:'US',state:'CA'}}}}});
  assert.deepEqual(locationEligibility(us,profile()),{eligible:true,reason:'LOCATION_UNKNOWN_PASS'});
});

test('Canadian alternatives preserve explicit US remote and suitable local US opportunities', () => {
  for (const candidate of [
    lead('Frontend Engineer',{location:'Toronto, ON, CA; Remote, US',remoteStatus:'hybrid'}),
    lead('Frontend Engineer',{location:'Toronto, Ontario, Canada',secondaryLocations:['Remote, United States'],remoteStatus:'onsite'}),
    lead('Frontend Engineer',{location:'Toronto, ON, CA',secondaryLocations:['Washington, DC, United States'],remoteStatus:'hybrid'})
  ]) assert.equal(locationEligibility(candidate,profile()).eligible,true,candidate.location);
  const remote=lead('Frontend Engineer',{location:'Toronto, ON, CA; Remote, US',remoteStatus:'hybrid'});
  assert.equal(locationEligibility(remote,profile({remotePreference:'remote_only'})).eligible,true);
  for (const description of ['You may work remotely from the United States.','US remote employment is permitted.']) {
    assert.equal(locationEligibility({...remote,location:'Toronto, ON, CA',description},profile()).eligible,true,description);
  }
  for (const description of ['US remote employment is not permitted.','US working hours overlap is required.']) {
    assert.equal(locationEligibility({...remote,location:'Toronto, ON, CA',description},profile()).eligible,false,description);
  }
  assert.equal(locationEligibility({...remote,description:'You must work on-site at our Toronto office.'},profile()).eligible,false);
  assert.equal(locationEligibility({...remote,location:'Toronto, ON, CA; US working hours overlap'},profile()).eligible,false);
});

test('isolated CA and Ontario California never establish Canadian country eligibility', () => {
  for (const location of ['CA','Ontario, CA','ON','Ontario, California','Ontario, CA, United States']) {
    assert.deepEqual(locationEligibility(lead('Frontend Engineer',{location,remoteStatus:'unknown'}),profile()),
      {eligible:true,reason:'LOCATION_UNKNOWN_PASS'},location);
  }
});

test('actual live validation script uses production employment eligibility for auxiliary summaries', async () => {
  const syntheticSource=source('greenhouse');
  const search=profile();
  const titles=['Forward Deployed Engineer Intern','Frontend Engineer Student Program','Junior Frontend Engineer','Forward Deployed Engineer, Finance','Product Engineer'];
  const descriptions=['Build production software.','Candidates must be current students. Build React interfaces.',
    'Build React interfaces.','Build production AI applications and customer integrations.','This role is backend-primary. React is helpful.'];
  const jobs=titles.map((title,index)=>({id:900+index,title,content:descriptions[index],
    absolute_url:`https://careers.synthetic.example/jobs/${900+index}`,location:{name:'Remote, United States'},first_published:'2026-10-14T12:00:00Z'}));
  const variables={CAREEROS_LIVE_SOURCES_JSON:JSON.stringify([syntheticSource]),CAREEROS_SEARCH_PROFILE_JSON:JSON.stringify(search),
    CAREEROS_KNOWN_IDENTITIES_JSON:'[]',CAREEROS_SCAN_NOW:'2026-10-14T16:00:00Z'};
  const saved=new Map(Object.keys(variables).map(name=>[name,process.env[name]]));
  const originalFetch=globalThis.fetch,originalLog=console.log;
  const output:string[]=[];
  let requests=0;
  try {
    Object.assign(process.env,variables);
    globalThis.fetch=(async url=>{requests++;assert.equal(String(url),boardEndpoint(syntheticSource));return json({jobs});}) as typeof fetch;
    console.log=(value:unknown)=>{output.push(String(value));};
    await import('../scripts/live-discovery-validation');
  } finally {
    globalThis.fetch=originalFetch;console.log=originalLog;
    for(const [name,value] of saved) {if(value===undefined)delete process.env[name];else process.env[name]=value;}
  }
  assert.equal(requests,1,'only the synthetic board feed is fetched');
  assert.equal(output.length,1);
  const report=JSON.parse(output[0]);
  assert.equal(report.scan.persisted,false);
  assert.equal(report.scan.llmCalls,0);
  assert.equal(report.diagnostics.candidatesEncountered,5);
  assert.equal(report.diagnostics.filterCounts.employmentExcluded,2);
  assert.equal(report.eligibleAfterEmploymentRoleLocation,2);
  assert.deepEqual(report.reasonCounts,{BACKEND_PRIMARY_ROLE:1,ELIGIBLE:2,EMPLOYMENT_EXCLUDED:2});
  assert.equal(report.providers.find((entry:any)=>entry.provider==='greenhouse').locationEligible,2);
  assert.equal(report.newJobs,2);
});
