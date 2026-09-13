import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
const commands = [['typecheck'],['build'],['harness:check']];
const pkg = JSON.parse(readFileSync('package.json','utf8'));
if(pkg.scripts.test) commands.push(['test']); else console.log('Product test suite unavailable: release coverage remains incomplete');
commands.push(['privacy:scan','--','--strict','--require-build']);
commands.push(['runtime:check']);
let failed = false;
for(const args of commands) {
 const npmCli = process.env.npm_execpath;
 if(!npmCli) throw Error('Run this command through npm run release:check');
 const result = spawnSync(process.execPath,[npmCli,'run',...args],{stdio:'inherit'});
 if(result.error || result.status !== 0) failed = true;
}
if(!pkg.scripts.test) failed = true;
process.exitCode = failed ? 1 : 0;
