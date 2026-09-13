import test from 'node:test';
import assert from 'node:assert/strict';
import { createDatabaseBoundary, getDb, withRequestDatabase } from '../server/db/client';
import { getAuth } from '../server/auth';

function boundary() {
  let created = 0, ended = 0;
  const instance = createDatabaseBoundary(() => 'postgres://synthetic.invalid/test', () => {
    created++;
    return { on: () => {}, end: async () => { ended++; } } as any;
  });
  return { instance, counts: () => ({ created, ended }) };
}
test('database configuration fails explicitly; persistent boundary reuses and closes pools', async () => {
  const absent = createDatabaseBoundary(() => undefined, () => { throw new Error('must not construct'); });
  assert.throws(() => absent.getDb(), /not configured/); await absent.close();
  const b = boundary(); const db = b.instance.getDb();
  assert.equal(b.instance.getDb(), db); assert.deepEqual(b.counts(), { created: 1, ended: 0 });
  await b.instance.close(); assert.deepEqual(b.counts(), { created: 1, ended: 1 });
  assert.throws(() => b.instance.getDb(), /boundary is closed/);
  await b.instance.close(); assert.deepEqual(b.counts(), { created: 1, ended: 1 });
  const recreated = boundary(); assert.notEqual(recreated.instance.getDb(), db); await recreated.instance.close();
});

test('late async route continuation cannot reopen a pool after response close cleanup', async () => {
  const b = boundary();
  let resume!: () => void, late!: Promise<void>;
  const gate = new Promise<void>(resolve => { resume = resolve; });
  await withRequestDatabase(async () => {
    getDb();
    // Like Express after a disconnect: the response completes before route work.
    late = gate.then(() => { assert.throws(getDb, /boundary is closed/); });
  }, b.instance);
  resume(); await late;
  assert.deepEqual(b.counts(), { created: 1, ended: 1 });
});
test('request-local pools and Better Auth instances do not leak across requests; failures close', async () => {
  const a = boundary(), b = boundary(), publicRequest = boundary();
  await withRequestDatabase(async () => {}, publicRequest.instance);
  assert.deepEqual(publicRequest.counts(), { created: 0, ended: 0 });
  Object.assign(process.env, { OWNER_EMAIL: 'owner-a@example.invalid', DATABASE_URL: 'postgres://synthetic.invalid/test', BETTER_AUTH_SECRET: 'synthetic-secret-long-enough-for-authentication', BETTER_AUTH_URL: 'http://localhost:3000', GOOGLE_CLIENT_ID: 'synthetic', GOOGLE_CLIENT_SECRET: 'synthetic' });
  let authA: ReturnType<typeof getAuth>;
  await Promise.all([
    withRequestDatabase(async () => { const dbA = getDb(); authA = getAuth(); await Promise.resolve(); assert.equal(getDb(), dbA); assert.equal(getAuth(), authA); }, a.instance),
    withRequestDatabase(async () => { await Promise.resolve(); assert.notEqual(getAuth(), authA); }, b.instance),
  ]);
  assert.deepEqual(a.counts(), { created: 1, ended: 1 }); assert.deepEqual(b.counts(), { created: 1, ended: 1 });
  const failed = boundary();
  await assert.rejects(withRequestDatabase(async () => { getDb(); throw new Error('synthetic request failure'); }, failed.instance), /synthetic request failure/);
  assert.deepEqual(failed.counts(), { created: 1, ended: 1 });
});
