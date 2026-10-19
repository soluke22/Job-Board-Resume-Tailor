import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeAtsCompensation } from '../server/compensation';
import { verifyPostingAts } from '../server/atsAdapters';
import { buildDiscoveredJobs, locationEligibility, matchesSearchProfile, scanPublicBoard } from '../server/discovery';
import { constraints } from '../server/assessment';
import { jobSchema } from '../server/db/workspaceValidation';
import { createWorkspaceRepository } from '../server/workspaceRepository';
import { parseDiscoverySource } from '../src/utils/discovery';
import { DEFAULT_SEARCH_PROFILE } from '../src/data/privateSeedTemplate';
import { persistenceDb, syntheticJob } from './helpers/persistence';
import type { CompensationDetails, JobRecord, SearchProfile } from '../src/types';

const salary = (changes:Record<string,unknown>={}) => ({min:100_000,max:140_000,currency:'USD',interval:'year',...changes});
const lever = (changes:Record<string,unknown>={}) => normalizeAtsCompensation('lever',{salaryRange:salary(changes)});
const description = (content:string) => normalizeAtsCompensation('greenhouse',{content});
const flat = (value:CompensationDetails) => ({min:value.min,max:value.max,currency:value.currency,interval:value.interval});
const component = (changes:Record<string,unknown>={}) => ({compensationType:'Salary',minValue:100_000,maxValue:140_000,currencyCode:'USD',interval:'1 YEAR',...changes});
const profile = (): SearchProfile => ({...structuredClone(DEFAULT_SEARCH_PROFILE),preferredRoleFamilies:['frontend-product'],
  remotePreference:'any' as const,allowedEmploymentTypes:[],excludedEmploymentTypes:[],salaryPreference:{minTarget:100_000}});
const json = (value:unknown) => new Response(JSON.stringify(value),{headers:{'content-type':'application/json'}});

test('structured annual USD range retains exact amounts and readable display',()=>{
  const normalized=lever();
  assert.equal(normalized.status,'available');
  assert.deepEqual(flat(normalized),salary());
  assert.match(normalized.raw!,/USD 100,000–140,000\/year/);
});

test('explicit single annual salary is one known amount without inventing a currency',()=>{
  const normalized=description('Base salary: USD 110,000 per year.');
  assert.deepEqual(flat(normalized),{min:110_000,max:110_000,currency:'USD',interval:'year'});
  assert.equal(description('Base salary: $110,000 per year.').currency,undefined);
});

test('hourly compensation stays hourly without workweek annualization',()=>{
  assert.deepEqual(flat(lever({min:45,max:65,interval:'hour'})),{min:45,max:65,currency:'USD',interval:'hour'});
  assert.equal(description('Hourly base pay: USD 45–65 per hour.').interval,'hour');
});

test('monthly compensation stays monthly',()=>{
  assert.deepEqual(flat(lever({min:8000,max:9000,interval:'month'})),{min:8000,max:9000,currency:'USD',interval:'month'});
  assert.equal(description('Monthly base salary: USD 8,000–9,000 per month.').interval,'month');
});

test('explicit CAD and other currencies are retained without conversion',()=>{
  assert.equal(lever({currency:'cad'}).currency,'CAD');
  assert.equal(description('Base salary: CAD 100k–120k annually.').currency,'CAD');
  assert.equal(description('Base salary: EUR 90,000–100,000 per year.').currency,'EUR');
  assert.equal(description('Base salary: US$100k–120k annually.').currency,'USD');
});

test('missing currency or pay period stays ambiguous and cannot enter flat comparisons',()=>{
  const missing=lever({currency:undefined});
  assert.equal(missing.status,'ambiguous');
  assert.equal(missing.ranges![0].min,100_000);
  assert.equal(missing.currency,undefined);
  assert.equal(missing.max,undefined);
  assert.equal(lever({interval:undefined}).interval,undefined);
  assert.equal(lever({interval:'week'}).interval,undefined,'unsupported periods are not converted');
  assert.equal(description('Base salary: $100,000–120,000 annually.').status,'ambiguous');
  assert.equal(description('Base salary: C$100,000–120,000 annually.').currency,undefined,'ambiguous currency symbols are not ISO country evidence');
});

test('missing disclosure differs from malformed and unparseable disclosure',()=>{
  assert.equal(normalizeAtsCompensation('ashby',{}).status,'unavailable');
  assert.equal(normalizeAtsCompensation('greenhouse',{pay_input_ranges:[]}).status,'unavailable');
  assert.equal(normalizeAtsCompensation('lever',{salaryRange:'invalid'}).status,'malformed');
  assert.equal(description('Salary negotiable.').status,'ambiguous');
});

test('Ashby salary, bonus and equity components remain separate',()=>{
  const normalized=normalizeAtsCompensation('ashby',{compensation:{summaryComponents:[component(),
    component({compensationType:'Bonus',minValue:5000,maxValue:10_000}),
    component({compensationType:'EquityPercentage',minValue:0.1,maxValue:0.4,currencyCode:null,interval:'NONE'})]}});
  assert.deepEqual(flat(normalized),salary());
  assert.deepEqual(normalized.ranges!.map(row=>row.kind),['base','bonus','equity']);
  assert.equal(normalized.ranges![2].unit,'percent');
  assert.match(normalized.raw!,/equity:.*0.1–0.4%/);
});

test('total compensation, bonus-only and equity-only disclosures never become base salary',()=>{
  for(const text of ['Total compensation: USD 180,000–220,000 annually.','Bonus: USD 10,000 per year.','Equity: USD 20,000 per year.']) {
    const normalized=description(text);
    assert.equal(normalized.status,'available');
    assert.equal(normalized.max,undefined);
    assert.notEqual(normalized.ranges![0].kind,'base');
  }
  const normalized=normalizeAtsCompensation('lever',{salaryRange:salary(),salaryDescriptionPlain:'Total compensation range includes equity.'});
  assert.equal(normalized.max,undefined);
  assert.equal(normalized.ranges![0].kind,'total');
  for (const text of ['Salary: USD 180,000–220,000 annually including bonus and equity.',
    'Base salary: USD 180,000–220,000 annually inclusive of equity.']) {
    assert.equal(description(text).max,undefined,text);
    assert.equal(normalizeAtsCompensation('lever',{salaryRange:salary(),salaryDescriptionPlain:text}).max,undefined,text);
  }
});

test('multiple Greenhouse geographic ranges retain cents, labels and separate amounts',()=>{
  const ranges=[{min_cents:10_000_000,max_cents:14_000_000,currency_type:'USD',title:'Synthetic North Base Salary',blurb:'Annual base salary.'},
    {min_cents:9_000_000,max_cents:12_000_000,currency_type:'CAD',title:'Synthetic South Base Salary',blurb:'Annual base salary.'}];
  const normalized=normalizeAtsCompensation('greenhouse',{pay_input_ranges:ranges});
  assert.equal(normalized.status,'ambiguous');
  assert.equal(normalized.min,undefined);
  assert.deepEqual(normalized.ranges!.map(row=>[row.min,row.max,row.currency,row.applicability]),
    [[100_000,140_000,'USD','Synthetic North Base Salary'],[90_000,120_000,'CAD','Synthetic South Base Salary']]);
});

test('Ashby geographic tiers are never replaced by an aggregate summary range',()=>{
  const normalized=normalizeAtsCompensation('ashby',{compensation:{summaryComponents:[component({minValue:1,maxValue:999_999})],
    compensationTiers:[{title:'Synthetic Zone One',components:[component()]},{title:'Synthetic Zone Two',components:[component({minValue:80_000,maxValue:90_000})]}]}});
  assert.equal(normalized.max,undefined);
  assert.deepEqual(normalized.ranges!.map(row=>row.max),[140_000,90_000]);
});

test('structured amounts win over conflicting job-description text without borrowing missing fields',()=>{
  const normalized=normalizeAtsCompensation('lever',{salaryRange:salary(),descriptionPlain:'Base salary: USD 50,000–60,000 per year.'});
  assert.deepEqual(flat(normalized),salary());
  const missing=normalizeAtsCompensation('lever',{salaryRange:salary({currency:undefined}),descriptionPlain:'Base salary: USD 50,000–60,000 per year.'});
  assert.equal(missing.currency,undefined);
  assert.equal(missing.ranges![0].min,100_000);
});

test('malformed bounds never escape into comparisons or throw away the posting',()=>{
  for (const change of [{min:-1},{max:NaN},{min:'100000'},{min:150_000,max:100_000}]) {
    assert.equal(lever(change).status,'malformed');
    assert.equal(lever(change).max,undefined);
  }
  assert.equal(description('Base salary: USD 12,34 per year.').status,'malformed');
  assert.equal(description('Base salary: USD 120k–90k annually.').status,'malformed');
  assert.equal(normalizeAtsCompensation('greenhouse',{pay_input_ranges:[{min_cents:'100000',max_cents:200000}]}).status,'malformed');
});

test('unrelated transaction amounts, years and metrics are not salary disclosures',()=>{
  for(const content of ['We process USD 200,000 in transactions per hour. Salary is negotiable.',
    'Founded in 2020. Support 100000 users. Five years experience required.',
    'Our salary analytics product tracks USD 150,000 of customer revenue annually.']) {
    assert.equal(description(content).max,undefined,content);
    assert.equal(description(content).ranges,undefined,content);
  }
});

test('text fallback supports separated components, explicit scopes and encoded provider markup',()=>{
  const normalized=description('&lt;p&gt;Base salary: USD 100,000–120,000 per year plus bonus: USD 10,000 per year.&lt;/p&gt;');
  assert.equal(normalized.max,120_000);
  assert.deepEqual(normalized.ranges!.map(row=>row.kind),['base','bonus']);
  const scoped=description('Base salary in Synthetic North: USD 100k–120k annually. Base salary in Synthetic South: CAD 90k–110k annually.');
  assert.equal(scoped.max,undefined);
  assert.equal(scoped.ranges!.length,2);
  assert.equal(scoped.ranges![0].applicability,'Synthetic North');
  assert.equal(description('Synthetic responsibilities.\n'.repeat(600)+'Base salary: USD 100,000–120,000 per year.').max,120_000,'canonical salary disclosure may follow the role-summary truncation boundary');
});

test('trailing and structured disclosure scopes cannot become a universal salary',()=>{
  for (const normalized of [description('Base salary: USD 100,000–120,000 per year for Synthetic North.'),
    normalizeAtsCompensation('lever',{salaryRange:salary(),salaryDescriptionPlain:'Annual base salary for Synthetic North.'}),
    normalizeAtsCompensation('greenhouse',{pay_input_ranges:[{min_cents:10_000_000,max_cents:14_000_000,currency_type:'USD',title:'Annual Base Salary',blurb:'For Synthetic North.'}]})]) {
    assert.equal(normalized.max,undefined);
    assert.equal(normalized.ranges![0].applicability,'Synthetic North');
  }
  assert.equal(normalizeAtsCompensation('lever',{salaryRange:salary(),salaryDescriptionPlain:'Base salary and total compensation depend on the package.'}).max,undefined);
});

test('one-sided disclosures never invent the missing bound',()=>{
  assert.equal(lever({max:undefined}).max,undefined);
  assert.equal(lever({min:undefined}).min,undefined);
  assert.equal(description('Base salary from USD 100,000 per year.').max,undefined);
  assert.equal(description('Base salary up to USD 120,000 per year.').min,undefined);
});

for (const provider of ['greenhouse','ashby','lever'] as const) test(`${provider} discovery and exact verification agree and preserve original metadata`,async()=>{
  const source=parseDiscoverySource(provider+':synthetic-compensation','Synthetic Compensation Company');
  const url=source.boardUrl+(provider==='greenhouse'?'/jobs/707':'/comp-1');
  const shared={title:'Frontend Engineer',employmentType:'FullTime',workplaceType:'remote',publishedAt:'2026-10-14T12:00:00Z'};
  const raw=provider==='greenhouse'?{...shared,id:707,absolute_url:url,location:{name:'Remote, United States'},
    content:'Build React interfaces.',pay_input_ranges:[{min_cents:10_000_000,max_cents:14_000_000,currency_type:'USD',title:'Annual Base Salary'}]}
    :provider==='ashby'?{...shared,id:'comp-1',jobUrl:url,applyUrl:url+'/application',location:'Remote, United States',isListed:true,
      descriptionPlain:'Build React interfaces.',compensation:{summaryComponents:[component()]}}
    :{...shared,id:'comp-1',text:shared.title,hostedUrl:url,applyUrl:url+'/apply',categories:{location:'Remote, United States',commitment:'Full-time'},
      descriptionPlain:'Build React interfaces.',salaryRange:salary(),salaryDescriptionPlain:'Annual base salary.'};
  const original=structuredClone(raw);
  const discovery=await scanPublicBoard(source,(async()=>json(provider==='lever'?[raw]:{jobs:[raw]})) as typeof fetch);
  const fetchBefore=globalThis.fetch;
  let exact;
  try {globalThis.fetch=async()=>json(provider==='ashby'?{jobs:[raw]}:raw);exact=await verifyPostingAts(url);}
  finally {globalThis.fetch=fetchBefore;}
  assert.equal(exact.status,'LISTED');
  const [discovered]=await buildDiscoveredJobs(discovery);
  const [verified]=await buildDiscoveredJobs([{url,source:'manual-web-import',verification:exact}]);
  assert.deepEqual(discovered.compensation,verified.compensation);
  assert.equal(discovered.compensation?.max,140_000);
  const metadata=discovered.canonicalMetadata as any;
  assert.deepEqual(metadata.compensation,(raw as any).compensation);
  assert.deepEqual(metadata.salaryRange,(raw as any).salaryRange);
  assert.deepEqual(metadata.payInputRanges,(raw as any).pay_input_ranges);
  assert.equal(metadata.salaryDescriptionPlain,(raw as any).salaryDescriptionPlain);
  assert.deepEqual(raw,original,'normalization never mutates provider payload');
});

test('all provider paths preserve unavailable, malformed and ambiguous compensation without changing listing status',async()=>{
  const before=globalThis.fetch;
  try {
    for(const provider of ['greenhouse','ashby','lever'] as const) {
      const source=parseDiscoverySource(provider+':synthetic-compensation','Synthetic Compensation Company');
      const url=source.boardUrl+(provider==='greenhouse'?'/jobs/707':'/comp-1');
      for(const status of ['unavailable','malformed','ambiguous']) {
        const compensation=provider==='greenhouse'?{pay_input_ranges:status==='unavailable'?[]:status==='malformed'?'invalid':[{min_cents:100_000,max_cents:200_000,title:'Base Salary'}]}
          :provider==='ashby'?{compensation:status==='unavailable'?undefined:status==='malformed'?'invalid':{summaryComponents:[component({currencyCode:null})]}}
          :{salaryRange:status==='unavailable'?undefined:status==='malformed'?'invalid':salary({currency:undefined})};
        const raw={id:provider==='greenhouse'?707:'comp-1',title:'Frontend Engineer',text:'Frontend Engineer',jobUrl:url,absolute_url:url,hostedUrl:url,isListed:true,...compensation};
        const rows=await scanPublicBoard(source,(async()=>json(provider==='lever'?[raw]:{jobs:[raw]})) as typeof fetch);
        globalThis.fetch=async()=>json(provider==='ashby'?{jobs:[raw]}:raw);
        const exact=await verifyPostingAts(url);
        assert.equal(exact.status,'LISTED');
        assert.equal(exact.compensation?.status,status,`${provider}: ${status}`);
        assert.deepEqual(exact.compensation,rows[0].verification!.compensation);
        assert.equal(exact.compensation?.max,undefined);
      }
    }
  } finally {globalThis.fetch=before;}
});

test('new and legacy compensation JSON round-trip through disposable workspace persistence',async()=>{
  const {pg,db}=await persistenceDb();
  try {
    const repo=createWorkspaceRepository(()=>db as any);
    const legacy={...syntheticJob('legacy-comp'),compensation:{min:80_000,max:100_000,currency:'USD',interval:'year' as const,raw:'Synthetic legacy salary'}};
    const current={...syntheticJob('current-comp'),compensation:normalizeAtsCompensation('ashby',{compensation:{compensationTiers:[{title:'Synthetic Zone',components:[component()]}]}})};
    assert(jobSchema.safeParse(legacy).success);
    assert(jobSchema.safeParse(current).success);
    await repo.save('owner-a',{jobs:[legacy,current]},0);
    const restored=await repo.read('owner-a');
    assert.deepEqual(restored.jobs.find(row=>row.id==='legacy-comp')!.compensation,legacy.compensation);
    assert.deepEqual(restored.jobs.find(row=>row.id==='current-comp')!.compensation,JSON.parse(JSON.stringify(current.compensation)));
    assert.deepEqual((await repo.read('owner-b')).jobs,[]);
    assert.equal(jobSchema.safeParse({...legacy,compensation:{ranges:[{min:20,max:10,kind:'base',source:'structured'}]}}).success,false);
  } finally {await pg.close();}
});

test('USD 100000 target remains a preference and incompatible or missing compensation never blocks',()=>{
  const search=profile();
  const job=(compensation:CompensationDetails) => ({...syntheticJob(),compensation} as unknown as JobRecord);
  const below=constraints(job(lever({min:80_000,max:90_000})),[],search);
  assert.deepEqual(below.blockers,[]);
  assert.deepEqual(below.preferences,['Known salary maximum below target preference']);
  for(const compensation of [normalizeAtsCompensation('lever',{}),lever({currency:'CAD'}),lever({interval:'hour',min:40,max:60}),
    lever({interval:'month',min:6000,max:7000}),description('Total compensation: USD 80,000–90,000 annually.'),description('Base salary: $80,000–90,000 annually.')]) {
    const result=constraints(job(compensation),[],search);
    assert.deepEqual(result.blockers,[]);
    assert.deepEqual(result.preferences,[]);
  }
});

test('compensation cannot establish employment or US remote eligibility',()=>{
  const candidate={url:'https://jobs.ashbyhq.com/synthetic/comp-1',title:'Frontend Engineer',location:'Toronto, ON, CA',remoteStatus:'hybrid' as const,
    employmentType:'contract',source:'public-board' as const,description:'Build React interfaces.',
    verification:{status:'LISTED' as const,isListed:true,lastVerifiedAt:'2026-10-14T16:00:00Z',rawDetails:{compensation:lever({interval:'hour',min:40,max:60})}}};
  assert.equal(locationEligibility(candidate,profile()).eligible,false);
  assert.equal(matchesSearchProfile(candidate,profile()),false);
  assert.equal(matchesSearchProfile({...candidate,location:'Remote, United States',remoteStatus:'remote'},profile()),true,'hourly/contract policy is still controlled by existing employment preferences');
});
