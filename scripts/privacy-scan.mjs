import { readdir, readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';
const strict = process.argv.includes('--strict');
const rootArg = process.argv.indexOf('--root');
const roots = rootArg >= 0 ? [process.argv[rootArg + 1]] : ['src', 'server', 'server.ts', 'dist/client'];
if(roots.some(root => !root)) throw Error('--root requires a path');
const findings = [];
let built = false;
const rules = [
 ['credential literal', /(?:api[_-]?key|secret|token|password)\s*[:=]\s*["'][^"'\s]{16,}["']/i],
 ['personal email', /[A-Z0-9._%+-]+@(?:gmail|outlook|hotmail|yahoo)\.com\b/i],
 ['private seed payload', /(?:rawEvidence|fullName|phone|email)\s*:\s*["'][^"']+["']/i],
 ['embedded owner default', /OWNER_EMAIL\s*\|\|\s*["'][^"']+["']/i],
];
async function walk(path) {
 const s = await stat(path).catch(e => { if(e.code === 'ENOENT') return null; throw e; });
 if (!s) return;
 if (path === 'dist/client') built = true;
 if(s.isDirectory()) { for(const item of await readdir(path)) await walk(join(path,item)); return; }
 if(!/\.(?:tsx?|jsx?|mjs|cjs|json|html|css)$/.test(path)) return;
 const value = await readFile(path,'utf8');
 for(const [label,pattern] of rules) {
  // Synthetic fixtures intentionally contain fictional contacts/evidence.
  if(label === 'private seed payload' && !/privateSeedTemplate/.test(path)) continue;
  if(pattern.test(value)) findings.push({path,rule:label});
 }
}
for(const root of roots) await walk(root);
if(process.argv.includes('--require-build') && !built) throw Error('Missing dist/client; build first');
for(const item of findings) console.log(item.path + ': ' + item.rule);
console.log('Privacy triage: ' + findings.length + ' finding(s); public build ' + (built?'scanned':'not present'));
if(strict && findings.length) process.exitCode = 1;
