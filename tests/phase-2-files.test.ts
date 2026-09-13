import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import express from 'express';
import { sql, eq } from 'drizzle-orm';
import { installPrivateFiles, validateUpload, MAX_PRIVATE_FILE_BYTES } from '../server/privateFiles';
import { createPrivateFileRepository } from '../server/privateFileRepository';
import * as s from '../server/db/schema';
import { persistenceDb, syntheticFile } from './helpers/persistence';

const body = { originalFilename: 'synthetic résumé.txt', mimeType: 'text/plain', purpose: 'evidence', sourceType: 'user-upload', contentBase64: Buffer.from('synthetic').toString('base64') };

test('upload size/type/encoding boundaries reject invalid inputs and accept exact 2 MiB', () => {
  const invalid = [
    { contentBase64: Buffer.alloc(MAX_PRIVATE_FILE_BYTES + 1).toString('base64') },
    { contentBase64: '!!!!' }, { contentBase64: '' }, { contentBase64: '====' }, { contentBase64: 'YR==' },
    { mimeType: 'application/pdf' }, { contentBase64: Buffer.from([0xff, 0xfe]).toString('base64') },
    { mimeType: 'application/json', contentBase64: Buffer.from('{bad').toString('base64') },
    ...['../file', 'dir\\file', 'bad\0file', 'bad\nfile', 'bad:file', 'bad|file', '..', '\ud800'].map(originalFilename => ({ originalFilename })),
    { mimeType: 'application/javascript' }, { purpose: 'executable' }, { sourceType: 'unknown' },
  ];
  for (const change of invalid) assert.throws(() => validateUpload({ ...body, ...change }));
  assert.equal(validateUpload({ ...body, contentBase64: Buffer.alloc(MAX_PRIVATE_FILE_BYTES, 65).toString('base64') }).content.length, MAX_PRIVATE_FILE_BYTES);
  assert.equal(validateUpload({ ...body, mimeType: 'application/pdf', contentBase64: Buffer.from('%PDF-synthetic').toString('base64') }).mimeType, 'application/pdf');
  assert.equal(validateUpload({ ...body, mimeType: 'application/json', contentBase64: Buffer.from('{}').toString('base64') }).content.toString(), '{}');
});

test('real file repository: owner scope, durable recovery, upload/download/delete failure matrix', async () => {
  const path = await mkdtemp(join(tmpdir(), 'careeros-files-'));
  let { pg, db } = await persistenceDb(path);
  let repo = createPrivateFileRepository(() => db as any);
  const objects = new Map<string, string>(); // Synthetic Blob boundary, not a live provider.
  let currentOwner = 'owner-a', putFailure = false, deleteFailure = false, blobReadFailure = false;
  let dbReadFailure = false, removeFailure = false, cleanupFailure = false, failCleanupAfterPut = false, streamFailure = false;
  let gets = 0, puts = 0, unexpectedStatus = 0;
  const app = express();
  installPrivateFiles(app, {
    budget: async () => {},
    guard: (_req, res, next) => { res.locals.ownerId = currentOwner; next(); },
    repository: {
      list: owner => { if (dbReadFailure) throw new Error('synthetic DB outage'); return repo.list(owner); },
      find: (owner, id) => { if (dbReadFailure) throw new Error('synthetic DB outage'); return repo.find(owner, id); },
      insert: record => repo.insert(record),
      remove: (owner, id) => { if (removeFailure) throw new Error('synthetic DB outage'); return repo.remove(owner, id); },
      upload: (record, write) => repo.upload(record, write),
      reconcile: (owner, del) => { if (cleanupFailure) throw new Error('synthetic DB outage'); return repo.reconcile(owner, del); },
    },
    blobs: {
      put: async (blobPath: string, _data: unknown, options: any) => {
        puts++; assert.equal(options.access, 'private'); assert.equal(options.allowOverwrite, false); assert(options.abortSignal);
        if (putFailure) throw new Error('synthetic Blob outage');
        objects.set(blobPath, 'synthetic'); if (failCleanupAfterPut) deleteFailure = true;
        return { pathname: blobPath };
      },
      del: async (blobPath: string, options: any) => { assert(options.abortSignal); if (deleteFailure) throw new Error('synthetic Blob outage'); objects.delete(blobPath); },
      get: async (blobPath: string, options: any) => {
        gets++; assert.equal(options.access, 'private'); assert.equal(options.useCache, false);
        if (blobReadFailure) throw new Error('synthetic Blob outage');
        if (unexpectedStatus) return { statusCode: unexpectedStatus };
        if (!objects.has(blobPath)) return null;
        const stream = new ReadableStream({ start(c) { c.enqueue(new TextEncoder().encode('synthetic')); if (streamFailure) setTimeout(() => c.error(new Error('synthetic stream failure')), 10); else c.close(); } });
        return { statusCode: 200, stream };
      },
    } as any,
  });
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server.once('listening', resolve));
  const url = `http://127.0.0.1:${(server.address() as any).port}/api/private/files`;
  const upload = () => fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const reconcile = () => fetch(`${url}/reconcile`, { method: 'POST' });
  try {
    await repo.insert(syntheticFile('owner-a')); await repo.insert(syntheticFile('owner-b'));
    assert.equal((await repo.find('owner-a', 'same-file-id'))!.blobPath, 'private/owner-a/same-file-id');
    assert.equal(await repo.find('owner-a', 'owner-b-only'), undefined);
    await repo.remove('owner-a', 'same-file-id'); assert(await repo.find('owner-b', 'same-file-id'));
    assert.throws(() => repo.list(''), /Owner identity/);
    putFailure = true; assert.equal((await upload()).status, 503);
    assert.equal((await repo.list('owner-a')).length, 0); assert.equal(objects.size, 0); putFailure = false;
    const invalid = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...body, ownerId: 'owner-b' }) });
    assert.equal(invalid.status, 400); assert.match(invalid.headers.get('cache-control')!, /private.*no-store/);
    await db.execute(sql`CREATE FUNCTION fail_synthetic_file() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'synthetic metadata insert failure'; END $$`);
    await db.execute(sql`CREATE TRIGGER fail_synthetic_file BEFORE INSERT ON private_files FOR EACH ROW EXECUTE FUNCTION fail_synthetic_file()`);
    assert.equal((await upload()).status, 503); assert.equal(objects.size, 0, 'compensation removes Blob after real metadata failure');
    failCleanupAfterPut = true;
    assert.equal((await upload()).status, 503); assert.equal(objects.size, 1);
    assert.equal((await repo.list('owner-a')).length, 0, 'unresolved upload is not exposed');
    const orphanPath = [...objects.keys()][0];
    assert((await db.select().from(s.privateFileUploads)).some(row => row.blobPath === orphanPath));
    await pg.close(); ({ pg, db } = await persistenceDb(path)); repo = createPrivateFileRepository(() => db as any);
    assert(await repo.find('owner-b', 'same-file-id'), 'metadata survives DB/repository recreation');
    failCleanupAfterPut = false; deleteFailure = false;
    assert.equal((await reconcile()).status, 200); assert.equal(objects.size, 0, 'restart recovery uses durable intent');
    objects.set(orphanPath, 'synthetic late put');
    assert.equal((await reconcile()).status, 200); assert.equal(objects.size, 0, 'retained tombstone removes a late put');
    assert((await db.select().from(s.privateFileUploads)).some(row => row.blobPath === orphanPath && row.state === 'abandoned'));
    await db.execute(sql`DROP TRIGGER fail_synthetic_file ON private_files`);
    await db.execute(sql`DROP FUNCTION fail_synthetic_file()`);
    cleanupFailure = true; const beforePuts = puts;
    assert.equal((await upload()).status, 503); assert.equal(puts, beforePuts, 'DB outage before intent never starts Blob write');
    assert.equal((await reconcile()).status, 503); cleanupFailure = false;
    await db.execute(sql`CREATE FUNCTION fail_synthetic_intent() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'synthetic intent write outage'; END $$`);
    await db.execute(sql`CREATE TRIGGER fail_synthetic_intent BEFORE INSERT ON private_file_uploads FOR EACH ROW EXECUTE FUNCTION fail_synthetic_intent()`);
    assert.equal((await upload()).status, 503); assert.equal(puts, beforePuts, 'real intent write failure creates no Blob');
    await db.execute(sql`DROP TRIGGER fail_synthetic_intent ON private_file_uploads`);
    await db.execute(sql`DROP FUNCTION fail_synthetic_intent()`);
    const savedResponse = await upload(); assert.equal(savedResponse.status, 201);
    assert.match(savedResponse.headers.get('cache-control')!, /private.*no-store/);
    const metadata = await savedResponse.json(); assert.equal(metadata.ownerId, undefined); assert.equal(metadata.blobPath, undefined);
    assert(metadata.createdAt); assert(metadata.updatedAt); assert.equal(metadata.size, 9);
    const saved = (await repo.find('owner-a', metadata.id))!;
    assert(!(await db.select().from(s.privateFileUploads)).some(row => row.id === metadata.id));
    assert.equal((await reconcile()).status, 200); assert(objects.has(saved.blobPath), 'saved Blob is never compensated');
    currentOwner = 'owner-b';
    assert.equal((await fetch(`${url}/${metadata.id}`)).status, 404);
    assert.equal((await fetch(`${url}/${metadata.id}`, { method: 'DELETE' })).status, 404);
    assert.equal(gets, 0); assert(await repo.find('owner-a', metadata.id)); currentOwner = 'owner-a';
    const downloadUrl = `${url}/${metadata.id}`;
    const download = await fetch(downloadUrl); assert.equal(download.status, 200); assert.equal(await download.text(), 'synthetic');
    assert.equal(download.headers.get('content-type'), 'text/plain'); assert.equal(download.headers.get('x-content-type-options'), 'nosniff');
    assert.match(download.headers.get('content-disposition')!, /^attachment; filename\*=UTF-8''/);
    assert.match(download.headers.get('cache-control')!, /private.*no-store/);
    dbReadFailure = true; assert.equal((await fetch(url)).status, 503); assert.equal((await fetch(downloadUrl)).status, 503); dbReadFailure = false;
    blobReadFailure = true; assert.equal((await fetch(downloadUrl)).status, 503); blobReadFailure = false;
    unexpectedStatus = 503; assert.equal((await fetch(downloadUrl)).status, 503); unexpectedStatus = 0;
    streamFailure = true; const partial = await fetch(downloadUrl); assert.equal(partial.status, 200);
    assert.equal(partial.headers.get('content-type'), 'text/plain'); await assert.rejects(partial.text(), /terminated|aborted/i); streamFailure = false;
    deleteFailure = true; assert.equal((await fetch(downloadUrl, { method: 'DELETE' })).status, 503);
    assert(await repo.find('owner-a', metadata.id)); assert(objects.has(saved.blobPath));
    deleteFailure = false; removeFailure = true;
    assert.equal((await fetch(downloadUrl, { method: 'DELETE' })).status, 503);
    assert(await repo.find('owner-a', metadata.id)); assert(!objects.has(saved.blobPath)); assert.equal((await fetch(downloadUrl)).status, 404);
    removeFailure = false; assert.equal((await fetch(downloadUrl, { method: 'DELETE' })).status, 204);
    assert.equal(await repo.find('owner-a', metadata.id), undefined); assert(await repo.find('owner-b', 'same-file-id'));
  } finally {
    server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve()));
    await pg.close(); await rm(path, { recursive: true, force: true });
  }
});

test('reconciliation fences a delayed uploader; lost commit acknowledgement never deletes a saved Blob', async () => {
  const { pg, db } = await persistenceDb();
  const repo = createPrivateFileRepository(() => db as any);
  let release!: () => void, waiting!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  const reached = new Promise<void>(resolve => { waiting = resolve; });
  const delayedDb = new Proxy(db, { get(target, key) {
    if (key === 'transaction') return async (callback: any) => { waiting(); await gate; return target.transaction(callback); };
    const method = Reflect.get(target, key); return typeof method === 'function' ? method.bind(target) : method;
  } });
  try {
    let puts = 0;
    const pending = createPrivateFileRepository(() => delayedDb as any).upload(syntheticFile('owner-a', 'delayed'), async () => { puts++; });
    const rejected = assert.rejects(pending, /abandoned/);
    await reached; await repo.reconcile('owner-a', async () => {}); release(); await rejected;
    assert.equal(puts, 0); assert.equal(await repo.find('owner-a', 'delayed'), undefined);
    const ambiguousDb = new Proxy(db, { get(target, key) {
      if (key === 'transaction') return async (callback: any) => { await target.transaction(callback); throw new Error('synthetic lost commit acknowledgement'); };
      const method = Reflect.get(target, key); return typeof method === 'function' ? method.bind(target) : method;
    } });
    await assert.rejects(createPrivateFileRepository(() => ambiguousDb as any).upload(syntheticFile('owner-a', 'committed'), async () => { puts++; }), /lost commit acknowledgement/);
    assert(await repo.find('owner-a', 'committed'));
    await repo.reconcile('owner-a', async path => { assert(!path.endsWith('/committed')); });
  } finally { release(); await pg.close(); }
});

test('reconciliation preserves saved metadata, isolates owners and serializes upload finalization', async () => {
  const { pg, db } = await persistenceDb(); const repo = createPrivateFileRepository(() => db as any);
  const record = syntheticFile();
  try {
    await repo.insert(record);
    await db.insert(s.privateFileUploads).values({ ownerId: record.ownerId, id: record.id, blobPath: record.blobPath });
    let deletes = 0; await repo.reconcile('owner-a', async () => { deletes++; });
    assert.equal(deletes, 0); assert(await repo.find('owner-a', record.id));
    await repo.remove('owner-a', record.id);
    await assert.rejects(repo.upload(record, async () => { throw new Error('synthetic interrupted put'); }), /synthetic interrupted/);
    await repo.reconcile('owner-a', async () => { deletes++; });
    assert.equal((await db.select().from(s.privateFileUploads))[0].state, 'abandoned');
    await db.insert(s.privateFileUploads).values({ ownerId: 'owner-b', id: 'other', blobPath: 'private/owner-b/other' });
    await repo.reconcile('owner-a', async path => { assert(!path.includes('owner-b')); });
    assert.equal((await db.select().from(s.privateFileUploads).where(eq(s.privateFileUploads.ownerId, 'owner-b'))).length, 1);
    // PGlite executes real locking SQL but serializes transactions on one connection.
    // Live multi-connection locking/transport failure remains a provider gate.
    const raced = await Promise.all([repo.upload(syntheticFile('owner-a', 'raced'), async () => {}), repo.reconcile('owner-a', async path => { assert(!path.endsWith('/raced')); })]);
    assert(raced[0]); assert(await repo.find('owner-a', 'raced'));
  } finally { await pg.close(); }
});
