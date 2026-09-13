import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, statSync } from 'node:fs';

// Read-only triage. Values stay in memory; never pass matches to git arguments,
// log contents, or persist them. Ref/commit/path metadata is not classification.
function scanHistory() {
const git = args => execFileSync('git', args, { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore'] });
const rules = [
  ['email', /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi],
  ['provider-key', /\b(?:AIza[0-9A-Za-z_-]{35}|sk-(?:proj-)?[0-9A-Za-z_-]{40,}|gh[pousr]_[0-9A-Za-z]{36,}|vercel_blob_rw_[0-9A-Za-z_]{24,})\b/g],
  ['private-key', /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/g],
  ['database-credential', /postgres(?:ql)?:\/\/[^\s/:"']+:[^\s/@"']{8,}@[^\s/"']+/gi],
  ['bearer-JWT', /Bearer\s+eyJ[0-9A-Za-z_-]{12,}\.[0-9A-Za-z_-]{12,}\.[0-9A-Za-z_-]{12,}/g],
];
const reservedEmail = value => /@(?:[^@]*\.)?(?:example\.(?:com|net|org)|[^@]+\.(?:example|invalid|test))$/i.test(value);
const refs = git(['for-each-ref', '--format=%(refname)', 'refs/heads', 'refs/remotes', 'refs/tags']).trim().split('\n').filter(Boolean);
const commits = git(['rev-list', '--all', '--reverse', '--topo-order']).trim().split('\n').filter(Boolean);
const blobs = new Map();
const records = new Map();
const values = new Map();
let skippedReservedEmailMatches = 0;
let nonTextLocations = new Set();
const nonTextObjects = new Set();
const legacyTextObjects = new Set();
for (const commit of commits) {
  for (const entry of git(['ls-tree', '-rz', commit]).split('\0').filter(Boolean)) {
    const parsed = entry.match(/^\d+ blob ([0-9a-f]+)\t(.*)$/s);
    if (!parsed) continue;
    const [, object, path] = parsed;
    if (nonTextObjects.has(object)) { nonTextLocations.add(path); continue; }
    let hits = blobs.get(object);
    if (!hits) {
      const bytes = execFileSync('git', ['cat-file', 'blob', object], { maxBuffer: 32 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore'] });
      let content;
      try {
        if (bytes.includes(0)) throw new Error('Binary object');
        try { content = new TextDecoder('utf-8', { fatal: true }).decode(bytes); }
        catch {
          // Historical Windows text predates UTF-8 plan normalization. Only
          // known text extensions qualify for this fallback, never media.
          if (!/\.(?:md|txt|tsx?|jsx?|json|ya?ml|toml|sql|mjs|cjs|css|html|lock)$/i.test(path)) throw new Error('Unsupported encoding');
          content = new TextDecoder('windows-1252').decode(bytes);
          legacyTextObjects.add(object);
        }
      } catch { nonTextObjects.add(object); nonTextLocations.add(path); continue; }
      hits = [];
      for (const [type, rule] of rules) for (const match of content.matchAll(rule)) {
        if (type === 'email' && reservedEmail(match[0])) { skippedReservedEmailMatches++; continue; }
        const value = type === 'email' ? match[0].toLowerCase() : match[0];
        const fingerprint = createHash('sha256').update(value).digest('hex');
        values.set(fingerprint, { type, value });
        hits.push({ type, fingerprint, line: content.slice(0, match.index).split('\n').length });
      }
      blobs.set(object, hits);
    }
    for (const hit of hits) {
      const key = `${object}:${path}:${hit.fingerprint}`;
      let record = records.get(key);
      if (!record) {
        record = { type: hit.type, fingerprint: hit.fingerprint, object, path, lines: new Set(), commits: [] };
        records.set(key, record);
      }
      record.lines.add(hit.line);
      if (record.commits.at(-1) !== commit) record.commits.push(commit);
    }
  }
}
const currentHits = [];
const currentFiles = new Set(git(['ls-files', '-z']).split('\0').filter(Boolean));
function builtFiles(path) {
  let stats; try { stats = statSync(path); } catch (error) { if (error.code === 'ENOENT') return; throw error; }
  if (stats.isDirectory()) { for (const child of readdirSync(path)) builtFiles(`${path}/${child}`); }
  else currentFiles.add(path);
}
builtFiles('dist/client'); builtFiles('dist/server.mjs');
for (const path of currentFiles) {
  let content; try { content = readFileSync(path, 'utf8'); } catch (error) { if (error.code === 'ENOENT') continue; throw error; }
  for (const [fingerprint, { type, value }] of values) {
    if ((type === 'email' ? content.toLowerCase() : content).includes(value)) currentHits.push({ path, fingerprint });
  }
}
const metadata = commit => {
  const [authoredAt, committedAt] = git(['show', '-s', '--format=%aI%n%cI', commit]).trim().split('\n');
  return { commit, authoredAt, committedAt };
};
const containingRefs = commit => git(['for-each-ref', `--contains=${commit}`, '--format=%(refname)', 'refs/heads', 'refs/remotes', 'refs/tags']).trim().split('\n').filter(Boolean);
const groups = new Map([...values.keys()].map((fingerprint, index) => [fingerprint, `value-group-${index + 1}`]));
const dispositionArg = process.argv.indexOf('--dispositions');
const dispositionPath = dispositionArg >= 0 ? process.argv[dispositionArg + 1] : 'docs/exec-plans/active/phase-9-history-dispositions.json';
if (!dispositionPath) throw new Error('Missing disposition file argument');
let dispositions = [];
try { dispositions = JSON.parse(readFileSync(dispositionPath, 'utf8')).markers; }
catch (error) { if (error.code !== 'ENOENT') throw new Error('Invalid disposition file'); }
const accepted = new Map(dispositions.filter(d => d.ownerConfirmed === true && d.classification === 'B' && d.disposition === 'INTENDED PUBLIC DATA').map(d => [`${d.object}:${d.path}`, d]));
const findings = [...records.values()].map((record, index) => ({
  id: `historical-marker-${index + 1}`, type: record.type, valueGroup: groups.get(record.fingerprint),
  object: record.object, path: record.path, lines: [...record.lines],
  first: metadata(record.commits[0]), last: metadata(record.commits.at(-1)),
  containingCommits: record.commits, reachableRefs: containingRefs(record.commits[0]),
  classification: accepted.has(`${record.object}:${record.path}`) && record.type === 'email' ? 'B' : 'E',
  disposition: accepted.has(`${record.object}:${record.path}`) && record.type === 'email' ? 'INTENDED PUBLIC DATA' : 'NEEDS_USER_CONFIRMATION',
}));
const result = {
  scope: 'Locally reachable refs; textual Git blobs and exact current/build value propagation. No OCR, dangling objects, remote deleted refs, or comprehensive DLP.',
  refs, commitCount: commits.length, textBlobCount: blobs.size, legacyTextBlobCount: legacyTextObjects.size, skippedReservedEmailMatches,
  nonTextLocationCount: nonTextLocations.size, findings,
  currentHits: currentHits.map(hit => ({ path: hit.path, valueGroup: groups.get(hit.fingerprint) })),
  clientBuildPresent: currentFiles.has('dist/client/index.html'), serverBuildPresent: currentFiles.has('dist/server.mjs'),
};
// Fingerprints are used for equality internally; neutral groups avoid publishing
// guessable hashes of contact data. Output never includes value-derived masks.
// Paths/refs could themselves contain contacts. Sanitize metadata too, without
// suppressing the finding. Credential-shaped filenames are handled identically.
const safeMetadata = JSON.stringify(result, null, 2).replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, '[contact-marker]');
let output = safeMetadata;
for (const { value } of values.values()) output = output.split(value).join('[historical-marker]');
console.log(output);
if (process.argv.includes('--require-build') && (!result.clientBuildPresent || !result.serverBuildPresent)) process.exitCode = 1;
if (currentHits.length) process.exitCode = 1;
if (process.argv.includes('--strict') && findings.some(f => f.disposition === 'NEEDS_USER_CONFIRMATION')) process.exitCode = 1;
}
try { scanHistory(); }
catch { console.error('History privacy scan failed; historical content suppressed'); process.exitCode = 1; }
