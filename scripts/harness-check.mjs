import { readFile, readdir, access, mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import assert from 'node:assert/strict';
import { validateEvidence } from './validate-evidence.mjs';
const skills = ['repo-context','workspace-security','ats-verification','job-ranking','evidence-provenance','resume-tailoring','vercel-deployment','release-validation'];
const agents = { 'code-mapper':['terra','medium'], 'docs-researcher':['luna','medium'], 'test-triager':['terra','medium'], 'security-reviewer':['sol','high'] };
const router = await readFile('AGENTS.md','utf8');
assert(router.split('\n').length <= 100, 'Router exceeds 100 lines');
for(const skill of skills) {
 const text = await readFile('.agents/skills/'+skill+'/SKILL.md','utf8');
 assert(text.startsWith('---\n') || text.startsWith('---\r\n'));
 assert(text.includes('name: '+skill));
 assert(/^description: .+/m.test(text));
 assert(router.includes(skill),'Unrouted skill');
 for(const path of text.match(/docs\/[A-Za-z0-9_./-]+\.md/g)||[]) await access(path);
}
assert.deepEqual((await readdir('.codex/agents')).filter(n=>n.endsWith('.toml')).sort(),Object.keys(agents).map(n=>n+'.toml').sort());
for(const [name,[model,effort]]of Object.entries(agents)) {
 const text = await readFile('.codex/agents/'+name+'.toml','utf8');
 for(const expected of ['name = "'+name+'"','model = "gpt-5.6-'+model+'"','model_reasoning_effort = "'+effort+'"','sandbox_mode = "read-only"','developer_instructions = "']) assert(text.includes(expected),name+': missing '+expected);
}
const config = await readFile('.codex/config.toml','utf8');
assert(config.includes('max_threads = 2')); assert(config.includes('model = "gpt-5.6-sol"'));
const plan = await readFile('docs/exec-plans/active/productionization.md','utf8');
for(const heading of ['Project Goal','Current Branch','Current Phase','Current Status','Architecture Decisions','Completed Work','Acceptance Criteria','Tests Passed','Tests Failing','Known Blockers','External Configuration Needed','Files / Modules Currently Involved','Last Known Good Commit','Next Exact Step','Remaining Phases']) assert(plan.includes('## '+heading),'Missing plan section '+heading);
for(const name of (await readdir('docs')).filter(n=>n.endsWith('.md')).map(n=>'docs/'+n).concat('AGENTS.md')) {
 const text = await readFile(name,'utf8');
 assert(!/skills\/(private-workspace-security|job-discovery|evidence-grounding|vercel-productionization|verify-release)\//.test(text),'Stale routing in '+name);
 for(const match of text.matchAll(/\]\(([^)]+)\)/g)) {
  if(!/^(?:https?:|#)/.test(match[1])) await access(resolve(dirname(name),match[1].split('#')[0]));
 }
}
const good = {evidence:[{id:'e1',verificationStatus:'verified',enabled:true,ownerId:'a'}],ownerId:'a',records:[{supportingEvidenceId:'e1'}]};
assert(validateEvidence(good));
for(const id of ['missing',null]) assert.throws(()=>validateEvidence({...good,records:[{evidenceIds:[id]}]}));
for(const changed of [{enabled:false},{verificationStatus:'rejected'},{ownerId:'b'}]) assert.throws(()=>validateEvidence({...good,evidence:[{...good.evidence[0],...changed}]}));
assert.throws(()=>validateEvidence({...good,evidence:[...good.evidence,...good.evidence]}));
const scratch = await mkdtemp(resolve(tmpdir(), 'careeros-harness-'));
try {
 const sample = resolve(scratch, 'privateSeedTemplate.ts');
 await writeFile(sample, 'export const api_key = "synthetic-negative-fixture-token";');
 const negative = spawnSync(process.execPath, ['scripts/privacy-scan.mjs','--strict','--root',scratch], {encoding:'utf8'});
 assert.equal(negative.status,1);
 assert(negative.stdout.includes('credential literal'));
 assert(!negative.stdout.includes('synthetic-negative-fixture-token'));
 await writeFile(sample, 'export const privateProfile = {};');
 const positive = spawnSync(process.execPath, ['scripts/privacy-scan.mjs','--strict','--root',scratch], {encoding:'utf8'});
 assert.equal(positive.status,0);
} finally { await rm(scratch,{recursive:true,force:true}); }
console.log('Harness integrity, evidence and privacy positive/negative fixtures passed');
