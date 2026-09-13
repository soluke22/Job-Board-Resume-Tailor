import assert from 'node:assert/strict';
import { readFile, readdir, stat } from 'node:fs/promises';
import { resolve } from 'node:path';

assert.equal(Number(process.versions.node.split('.')[0]), 24, 'Run runtime acceptance with Node 24.x');
const pkg = JSON.parse(await readFile('package.json', 'utf8'));
const config = JSON.parse(await readFile('vercel.json', 'utf8'));
assert.equal(pkg.engines.node, '24.x');
const locks = (await readdir('.')).filter(name => /^(?:bun.lockb?|yarn.lock|pnpm-lock.yaml|vlt-lock.json|package-lock.json)$/.test(name));
assert.deepEqual(locks, ['package-lock.json']);
assert.equal(config.installCommand, 'npm ci');
assert.equal(config.framework, 'vite'); assert.equal(config.outputDirectory, 'dist/client');
assert.equal(config.buildCommand, 'npm run build');
assert.deepEqual(Object.keys(config.functions), ['api/index.ts']);
assert.equal(config.functions['api/index.ts'].maxDuration, 300);
assert.deepEqual(config.rewrites[0], { source: '/api/:path*', destination: '/api' });
const spa = new RegExp(`^${config.rewrites[1].source}$`);
for (const path of ['/', '/dashboard', '/other/client/route']) assert(spa.test(path));
for (const path of ['/api', '/api/health', '/api/private/files/reconcile', '/assets', '/assets/example.js']) assert(!spa.test(path));

const root = resolve('dist/client');
const html = await readFile(resolve(root, 'index.html'), 'utf8');
const asset = html.match(/src="(\/assets\/[^"/]+-[^"/]+\.js)"/)?.[1];
assert(asset, 'Expected hashed Vite client asset'); await stat(resolve(root, '.' + asset));
const names = ['GEMINI_API_KEY','DATABASE_URL','BETTER_AUTH_SECRET','BETTER_AUTH_URL','GOOGLE_CLIENT_ID','GOOGLE_CLIENT_SECRET','OWNER_EMAIL','BLOB_READ_WRITE_TOKEN','BLOB_STORE_ID','VERCEL_OIDC_TOKEN'];
let bytes = 0, files = 0;
async function scan(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) { await scan(path); continue; }
    const data = await readFile(path); bytes += data.length; files++;
    const text = data.toString('utf8');
    assert(!/postgres(?:ql)?:\/\/|vercel_blob_rw_|@neondatabase\/serverless|better-auth\/adapters|drizzle-orm\/neon/.test(text), 'Server configuration/module marker in client build');
    for (const name of names) {
      assert(!text.includes(name), 'Server environment variable name in client build');
      const value = process.env[name]?.trim();
      // Avoid false positives for short generic values; never print values.
      if (value && value.length >= 8) assert(!text.includes(value), 'Server environment value in client build');
    }
  }
}
await scan(root);
console.log(`Local runtime/config/client contract passed: Node ${process.versions.node}, npm lock, ${files} client files, ${bytes} bytes. Actual Vercel routing/output/Function size remain external gates.`);
