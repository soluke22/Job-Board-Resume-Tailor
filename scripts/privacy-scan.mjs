import { readdir, readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
const strict = process.argv.includes('--strict');
const rootArg = process.argv.indexOf('--root');
const roots = rootArg >= 0 ? [process.argv[rootArg + 1]] : [...execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8' }).split('\0').filter(Boolean), 'dist/client'];
if(roots.some(root => !root)) throw Error('--root requires a path');
const findings = [];
let built = false;
const rules = [
 ['credential literal', /(?:api[_-]?key|secret|token|password)\s*[:=]\s*["'][^"'\s]{16,}["']/i],
 ['personal email', /[A-Z0-9._%+-]+@(?:gmail|outlook|hotmail|yahoo)\.com\b/i],
 ['private seed payload', /(?:rawEvidence|fullName|phone|email)\s*:\s*["'][^"']+["']/i],
 ['embedded owner default', /OWNER_EMAIL\s*\|\|\s*["'][^"']+["']/i],
 ['private key marker', /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/],
 ['provider key shape', /\b(?:AIza[0-9A-Za-z_-]{35}|sk-(?:proj-)?[0-9A-Za-z_-]{40,}|gh[pousr]_[0-9A-Za-z]{36,}|vercel_blob_rw_[0-9A-Za-z_]{24,})\b/],
 ['database credential URL', /postgres(?:ql)?:\/\/[^\s/:"']+:[^\s/@"']{8,}@(?!(?:localhost|127\.0\.0\.1|[^\s/]*example\.(?:com|invalid))(?::|\/|\b))[^\s/"']+/i],
 ['bearer JWT literal', /Bearer\s+eyJ[0-9A-Za-z_-]{12,}\.[0-9A-Za-z_-]{12,}\.[0-9A-Za-z_-]{12,}/],
];
async function walk(path) {
 const s = await stat(path).catch(e => { if(e.code === 'ENOENT') return null; throw e; });
 if (!s) return;
 if (path === 'dist/client') built = true;
 if(s.isDirectory()) { for(const item of await readdir(path)) await walk(join(path,item)); return; }
 if (/(?:^|[\\/])\.env(?:\.|$)/.test(path) && !path.endsWith('.env.example')) findings.push({path, rule:'tracked environment file'});
 if(!/\.(?:tsx?|jsx?|mjs|cjs|json|html|css|md|map|pem|key|ya?ml|toml|example)$/.test(path) && !/(?:^|[\\/])\.env/.test(path)) return;
 const value = await readFile(path,'utf8');
 for(const [label,pattern] of rules) {
  // Test credentials are explicitly synthetic. Strong key/URL/key-file rules
  // still apply to tests; generic literal triage applies to runtime source/build.
  if(label === 'credential literal' && /^(?:tests|scripts|docs)[\\/]/.test(path)) continue;
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
