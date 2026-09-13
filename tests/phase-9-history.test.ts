import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve, sep } from 'node:path';
import { randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';

test('history scan redacts values, traces cleared records and scopes owner disposition without allowing current leakage', async () => {
  const root = await mkdtemp(join(tmpdir(), 'phase91-history-synthetic-'));
  const scanner = resolve('scripts/history-privacy-scan.mjs');
  const contact = `fixture-${randomUUID()}@gmail.com`;
  const fakeKey = 'AIza' + 'a'.repeat(35);
  const git = (args: string[]) => {
    const result = spawnSync('git', args, { cwd: root, encoding: 'utf8' });
    assert.equal(result.status, 0, 'Synthetic Git fixture command failed');
    return result.stdout.trim();
  };
  const scan = () => spawnSync(process.execPath, [scanner], { cwd: root, encoding: 'utf8' });
  try {
    git(['init', '--quiet']); git(['config', 'user.name', 'Synthetic fixture']); git(['config', 'user.email', 'fixture@example.invalid']);
    await writeFile(join(root, 'fixture.js'), `const contact = '${contact}'; const key = '${fakeKey}'; const demo = 'demo@example.invalid';`);
    git(['add', 'fixture.js']); git(['commit', '--quiet', '-m', 'Synthetic introduction']);
    const first = git(['rev-parse', 'HEAD']); const object = git(['rev-parse', 'HEAD:fixture.js']);
    await writeFile(join(root, 'fixture.js'), 'const cleared = true;');
    git(['add', 'fixture.js']); git(['commit', '--quiet', '-m', 'Clear synthetic values']);
    let result = scan(); assert.equal(result.status, 0);
    assert.equal(result.stdout.includes(contact), false); assert.equal(result.stdout.includes(fakeKey), false);
    let report = JSON.parse(result.stdout);
    assert.equal(report.findings.length, 2); assert.deepEqual(report.currentHits, []);
    for (const finding of report.findings) { assert.equal(finding.first.commit, first); assert.equal(finding.last.commit, first); assert.equal(finding.classification, 'E'); }
    await writeFile(join(root, 'dispositions.json'), JSON.stringify({ markers: [{ object, path: 'fixture.js', ownerConfirmed: true, classification: 'B', disposition: 'INTENDED PUBLIC DATA' }] }));
    result = spawnSync(process.execPath, [scanner, '--dispositions', join(root, 'dispositions.json')], { cwd: root, encoding: 'utf8' });
    assert.equal(result.status, 0); report = JSON.parse(result.stdout);
    assert.equal(report.findings.find((f: any) => f.type === 'email').classification, 'B');
    assert.equal(report.findings.find((f: any) => f.type === 'provider-key').classification, 'E');
    await writeFile(join(root, 'fixture.js'), `const contact = '${contact}';`);
    result = spawnSync(process.execPath, [scanner, '--dispositions', join(root, 'dispositions.json')], { cwd: root, encoding: 'utf8' });
    assert.equal(result.status, 1); assert.equal(JSON.parse(result.stdout).currentHits.length, 1);
    assert.equal(result.stdout.includes(contact), false);
  } finally {
    assert.ok(resolve(root).startsWith(resolve(tmpdir()) + sep)); assert.ok(root.includes('phase91-history-synthetic-'));
    await rm(root, { recursive: true, force: true });
  }
});
