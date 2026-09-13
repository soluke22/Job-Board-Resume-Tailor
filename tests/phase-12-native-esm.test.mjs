import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, mkdir, rm } from 'node:fs/promises';
import { resolve, dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import ts from 'typescript';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

test('unbundled Function graph imports and serves public health in native Node24 ESM', async () => {
  assert.equal(Number(process.versions.node.split('.')[0]), 24, 'Use Node24 for native Function acceptance');
  // Emit separate modules: no bundler or specifier rewriting can mask Node resolution.
  // Under node_modules only to resolve installed packages without copying credentials.
  const output = await mkdtemp(join(root, 'node_modules', '.phase12-esm-'));
  const emitted = new Set();
  async function emit(source) {
    if (emitted.has(source)) return;
    emitted.add(source);
    const text = await readFile(source, 'utf8');
    const javascript = ts.transpileModule(text, { fileName: source, compilerOptions: {
      target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext,
      experimentalDecorators: true, useDefineForClassFields: false,
    } }).outputText;
    const destination = join(output, relative(root, source).replace(/\.ts$/, '.js'));
    await mkdir(dirname(destination), { recursive: true });
    await writeFile(destination, javascript);
    const ast = ts.createSourceFile(destination, javascript, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
    const imports = [];
    function visit(node) {
      if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) imports.push(node.moduleSpecifier.text);
      if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword && ts.isStringLiteral(node.arguments[0])) imports.push(node.arguments[0].text);
      ts.forEachChild(node, visit);
    }
    visit(ast);
    for (const specifier of imports.filter(value => value.startsWith('.'))) {
      const resolved = ts.resolveModuleName(specifier, source, {
        moduleResolution: ts.ModuleResolutionKind.Bundler,
      }, ts.sys).resolvedModule;
      assert(resolved && resolve(resolved.resolvedFileName).startsWith(root), 'Runtime relative module must resolve inside source tree');
      await emit(resolve(resolved.resolvedFileName));
    }
  }
  try {
    await writeFile(join(output, 'package.json'), JSON.stringify({ type: 'module' }));
    await emit(join(root, 'api/index.ts'));
    await writeFile(join(output, 'probe.mjs'), `
      import assert from 'node:assert/strict';
      import { createServer } from 'node:http';
      import handler from './api/index.js';
      const server = createServer((req, res) => {
        Promise.resolve(handler(req, res)).catch(() => { res.statusCode = 500; res.end(); });
      });
      await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
      try {
        const response = await fetch('http://127.0.0.1:' + server.address().port + '/api/health');
        assert.equal(response.status, 200);
        assert.match(response.headers.get('content-type'), /application\\/json/);
        assert.deepEqual(await response.json(), { status: 'ok' });
      } finally { await new Promise(resolve => server.close(resolve)); }
      console.log('Native Node24 Function import and unconfigured public health passed');
    `);
    // Child has no inherited tsx loader, NODE_OPTIONS, private env, or dotenv files.
    const environment = Object.fromEntries(Object.entries(process.env).filter(([name]) =>
      /^(?:PATH|SystemRoot|WINDIR|TEMP|TMP|COMSPEC|PATHEXT)$/i.test(name)));
    const result = spawnSync(process.execPath, ['probe.mjs'], {
      cwd: output, env: environment, encoding: 'utf8', timeout: 20000,
    });
    assert.ifError(result.error);
    assert.equal(result.status, 0, result.stderr || result.stdout);
    console.log(`Native Function graph: ${emitted.size} separate source modules; health200 JSON; no private configuration`);
  } finally { await rm(output, { recursive: true, force: true }); }
});
