import test from 'node:test';
import assert from 'node:assert/strict';
import { sourceRequirements, validateMatches, scoreAssessment, assessmentMetadata, isCurrent, QUALIFICATION_COEFFICIENTS, COVERAGE_COEFFICIENTS } from '../server/assessment';
import { syntheticEvidence } from './helpers/persistence';

const profile:any={preferredRoleFamilies:[],preferredModifiers:[],targetSeniority:[],excludedRolePatterns:[],allowedEmploymentTypes:[],excludedEmploymentTypes:[],remotePreference:'any',hybridLocations:[],maximumOnsiteFrequency:'',relocationAllowed:true,clearancePolicy:'open_to_clearance',salaryPreference:{},hiringProcessPreferences:{},companyExclusions:[]};
type Spec=[string,'hard'|'responsibility'|'preferred','Strong'|'Moderate'|'Weak'|'Missing','direct'|'adjacent'|'none',string?];
const professional=(text:string)=>({...syntheticEvidence('e',text),context:'Full-time',employer:'Synthetic',role:'Engineer',period:'2020-2024',sourceLocation:'Synthetic role',technologies:['React','TypeScript','Node','GraphQL']});
function scenario(specs:Spec[], evidence:any=professional('3 years production React frontend delivery. Built reusable components, accessibility, testing and design systems.')) {
  const jd=specs.map(s=>s[0]).join('\n');
  const job:any={id:'synthetic',description:jd,canonicalContentStatus:'AVAILABLE',verificationStatus:'LISTED',freshnessBand:'NEW'};
  const raw={roleFamily:'frontend-product',modifiers:[],facts:[],requirements:specs.map(s=>({kind:s[1],excerpt:s[0],centrality:s[1]==='preferred'?'preferred':s[1]==='responsibility'?'core':'standard',centralityExcerpt:s[0]}))};
  const c=sourceRequirements(raw,jd);
  const matches=validateMatches({matches:c.requirements.map((r,i)=>({requirementId:r.id,strength:specs[i][2],relationship:specs[i][3],evidenceIds:specs[i][2]==='Missing'?[]:['e']}))},c.requirements,[evidence]);
  return {fit:scoreAssessment(job,c.extraction,c.requirements,matches,profile),matches,c,job,evidence};
}
const stack:Spec[]=[['React required','hard','Strong','direct'],['TypeScript required','hard','Strong','direct'],['Testing required','hard','Strong','direct'],['Accessibility required','hard','Strong','direct']];
const frontend:Spec[]=[...stack,['3+ years professional React experience','hard','Strong','direct'],['Deliver reusable frontend product components','responsibility','Strong','direct']];
export const archetypes=()=>({
  'Direct frontend':scenario(frontend).fit,
  'Strong frontend/design system':scenario([...frontend,['Own the production design system','responsibility','Strong','direct']]).fit,
  'Strong with one gap':scenario([...frontend,['Deliver GraphQL UI integrations','responsibility','Moderate','direct']]).fit,
  'Senior frontend stretch':scenario([...stack,['5+ years professional React experience','hard','Strong','direct'],['Independent technical design through launch required','hard','Moderate','direct'],['Deliver frontend product UI','responsibility','Strong','direct'],['Experimentation and instrumentation','responsibility','Moderate','direct'],['Mentoring and architectural guidance','responsibility','Moderate','adjacent']]).fit,
  'Marketing/CMS specialization':scenario([...stack,['Production marketing sites','responsibility','Moderate','adjacent'],['Enterprise CMS architecture','responsibility','Moderate','adjacent'],['Publishing workflows','responsibility','Moderate','adjacent'],['Core Web Vitals','responsibility','Moderate','direct'],['CMS enablement','responsibility','Weak','adjacent']]).fit,
  'Backend-heavy full stack':scenario([...stack,['GraphQL required','hard','Strong','direct'],['3–5 years production backend services','hard','Strong','direct'],['Production Node Express ownership required','hard','Strong','direct'],['Own production backend services','responsibility','Strong','direct'],['Operate cloud backend infrastructure','responsibility','Weak','adjacent']],{...professional('Built Node Express GraphQL personal project.'),context:'Personal',sourceType:'personal-project'}).fit,
  'Forward deployed/data implementation':scenario([...stack,['Implement webhooks and ingestion','responsibility','Moderate','adjacent'],['Own data mapping and transformation','responsibility','Weak','adjacent'],['Deliver customer pilots and technical implementation','responsibility','Weak','adjacent']]).fit,
});

test('relationship arithmetic has strict order and coverage discounts adjacency',()=>{
  const q=QUALIFICATION_COEFFICIENTS,c=COVERAGE_COEFFICIENTS;
  const ordered=[q.Strong.direct,q.Moderate.direct,q.Moderate.adjacent,q.Weak.direct,q.Weak.adjacent,q.Missing.none];
  assert.ok(ordered.every((v,i)=>i===0 || ordered[i-1]>v));
  const direct=scenario([['React required','hard','Moderate','direct']]).fit;
  const adjacent=scenario([['React required','hard','Moderate','adjacent']]).fit;
  assert.ok(direct.qualificationFit!>adjacent.qualificationFit!);
  assert.ok(direct.evidenceCoverage!>adjacent.evidenceCoverage!);
  assert.ok(c.Moderate.direct>c.Moderate.adjacent);
});
test('project evidence cannot equal production depth; unknown tenure cannot invent duration',()=>{
  const req:Spec[]=[['3+ years production React experience','hard','Strong','direct']];
  assert.equal(scenario(req).matches[0].strength,'Strong');
  const personal=scenario(req,{...professional('3 years React personal project'),context:'Personal',sourceType:'personal-project'});
  assert.equal(personal.matches[0].strength,'Weak');assert.equal(personal.matches[0].relationship,'adjacent');
  const unknown=scenario(req,professional('Production React components'));
  assert.equal(unknown.matches[0].strength,'Weak');
  for(const text of ['5 years accounting experience. Built React personal demo.','Did not have 5 years production React experience.','5 years accounting experience. Built production React components.']) {
    assert.equal(scenario(req,professional(text)).matches[0].strength,'Weak',text);
  }
  assert.equal(scenario([['5+ years professional React experience','hard','Strong','direct']],professional('3–5 years professional React experience')).matches[0].strength,'Weak');
  assert.ok(personal.fit.qualificationFit!<scenario(req).fit.qualificationFit!);
});
test('critical minimum and core mismatch resist dilution by generic stack matches',()=>{
  const trivial:Spec[]=Array.from({length:80},(_,i)=>[`Generic capability ${i} required`,'hard','Strong','direct']);
  const critical=scenario([...trivial,['5+ years professional React experience','hard','Strong','direct']]);
  assert.ok(critical.fit.qualificationFit!<=7.4);assert.notEqual(critical.fit.applicationPriority,'APPLY FIRST');
  const core=scenario([...trivial,['Own ingestion pipelines','responsibility','Missing','none']]);
  assert.ok(core.fit.qualificationFit!<=6.4);
  assert.ok(scenario([...stack,['Deliver product UI','responsibility','Strong','direct']]).fit.qualificationFit!>core.fit.qualificationFit!+2);
  const minor=scenario([...frontend,['Minor optional utility required','hard','Missing','none']]);
  assert.ok(minor.fit.qualificationFit!>7.4,'minor hard gaps do not trigger critical cap');
  assert.ok(scenario([...frontend,['Minor production logging utility required','hard','Missing','none']]).fit.qualificationFit!>7.4,'production keyword alone does not establish criticality');
  const partial=scenario([...trivial.slice(0,70),...Array.from({length:8},(_,i)=>[`Core delivery ${i}`,'responsibility','Strong','direct'] as Spec),['Independent technical design through launch required','hard','Moderate','direct'],['Senior-level architectural ownership required','hard','Moderate','direct']]);
  assert.ok(partial.fit.qualificationFit!<=8.4);assert.notEqual(partial.fit.applicationPriority,'APPLY FIRST');
});
test('top tier requires central direct support while strong imperfect applications stay viable',()=>{
  const a=archetypes();
  for(const [name,fit] of Object.entries(a)) console.log(`${name}: ${fit.qualificationFit}/10, coverage ${fit.evidenceCoverage}, ${fit.applicationPriority}, ${fit.recommendation}`);
  assert.equal(a['Direct frontend'].applicationPriority,'APPLY FIRST');
  assert.equal(a['Strong frontend/design system'].applicationPriority,'APPLY FIRST');
  assert.equal(a['Strong with one gap'].recommendation,'APPLY');
  assert.equal(a['Strong with one gap'].applicationPriority,'STRONG WITH GAP');
  assert.ok(a['Direct frontend'].qualificationFit!>a['Strong with one gap'].qualificationFit!);
  assert.ok(a['Strong with one gap'].qualificationFit!>a['Senior frontend stretch'].qualificationFit!);
  assert.ok(a['Senior frontend stretch'].qualificationFit!>a['Marketing/CMS specialization'].qualificationFit!);
  assert.ok(a['Marketing/CMS specialization'].qualificationFit!>a['Forward deployed/data implementation'].qualificationFit!);
  for(const name of ['Senior frontend stretch','Marketing/CMS specialization','Backend-heavy full stack','Forward deployed/data implementation'])assert.notEqual(a[name].applicationPriority,'APPLY FIRST');
  const adjacent=scenario([...stack,['Core product delivery','responsibility','Moderate','adjacent']]);
  assert.notEqual(adjacent.fit.applicationPriority,'APPLY FIRST');
  assert.equal(adjacent.fit.applicationPriority,'STRONG WITH GAP');
});
test('source-backed centrality rejects arbitrary weights, invented context and title-derived core',()=>{
  const raw:any={roleFamily:'frontend-product',modifiers:[],facts:[],requirements:[{kind:'hard',excerpt:'React required',centrality:'core',centralityExcerpt:'React required'}]};
  assert.throws(()=>sourceRequirements(raw,'React required'));
  assert.throws(()=>sourceRequirements({...raw,requirements:[{...raw.requirements[0],centrality:'critical',centralityExcerpt:'Invented minimum React required'}]},'React required'));
  assert.throws(()=>sourceRequirements({...raw,requirements:[{kind:'hard',excerpt:'React required',weight:100}]},'React required'));
  const base=scenario(frontend);const metadata=assessmentMetadata(base.job,[base.evidence] as any,profile);
  assert.equal(isCurrent({...metadata,algorithmVersion:'phase4-v1'},metadata),false);
  for(const key of ['context','employer','role','period','sourceType','sourceLocation'])assert.equal(isCurrent(metadata,assessmentMetadata(base.job,[{...base.evidence,[key]:'changed'}] as any,profile)),false);
});
