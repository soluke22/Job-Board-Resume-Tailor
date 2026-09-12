import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { installPrivateFiles } from '../server/privateFiles';

test('private file partial failures never report false success; deletion retry and download headers', async () => {
  const record: any = { id: 'synthetic-file', ownerId: 'owner-a', blobPath: 'private/owner-a/synthetic-file', originalFilename: 'synthetic résumé.txt', mimeType: 'text/plain' };
  let metadata: any;
  let failPut = false, failInsert = false, failDelete = false, failRemove = false, failGet = false;
  let objectExists = false, cleanupCalls = 0, insertCalls = 0, getCalls = 0;
  const app = express();
  installPrivateFiles(app, {
    guard: (_req, res, next) => { res.locals.ownerId = 'owner-a'; res.set('Cache-Control', 'private, no-store'); next(); },
    repository: {
      list: async () => metadata ? [metadata] : [],
      find: async (owner, id) => metadata?.ownerId === owner && metadata?.id === id ? metadata : undefined,
      insert: async data => { insertCalls++; if (failInsert) throw new Error('synthetic DB outage'); metadata = { ...record, ...data }; return metadata; },
      remove: async () => { if (failRemove) throw new Error('synthetic DB outage'); metadata = undefined; },
    },
    blobs: {
      put: async (_path: string, _content: unknown, options: any) => { assert.equal(options.access, 'private'); if (failPut) throw new Error('synthetic Blob outage'); objectExists = true; return { pathname: record.blobPath }; },
      del: async () => { cleanupCalls++; if (failDelete) throw new Error('synthetic Blob outage'); objectExists = false; },
      get: async (_path: string, options: any) => { getCalls++; assert.equal(options.access, 'private'); if (failGet) throw new Error('synthetic Blob outage'); return objectExists ? { statusCode: 200, stream: new ReadableStream({ start(c) { c.enqueue(new TextEncoder().encode('synthetic')); c.close(); } }) } : null; },
    } as any,
  });
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server.once('listening', resolve));
  const url = `http://127.0.0.1:${(server.address() as any).port}/api/private/files`;
  const upload = () => fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ originalFilename: record.originalFilename, mimeType: 'text/plain', purpose: 'evidence', sourceType: 'user-upload', contentBase64: Buffer.from('synthetic').toString('base64') }) });
  try {
    failPut = true;
    assert.equal((await upload()).status, 503);
    assert.equal(insertCalls, 0); assert.equal(metadata, undefined);
    failPut = false; failInsert = true;
    assert.equal((await upload()).status, 503);
    assert.equal(cleanupCalls, 1); assert.equal(objectExists, false); assert.equal(metadata, undefined);
    failDelete = true;
    assert.equal((await upload()).status, 503);
    assert.equal(objectExists, true, 'demonstrates orphan when compensation fails');
    assert.equal(metadata, undefined, 'orphan is not exposed by metadata API');
    failDelete = false; failInsert = false;
    const saved = await upload(); assert.equal(saved.status, 201);
    const clientMetadata = await saved.json();
    assert.equal(clientMetadata.blobPath, undefined); assert.equal(clientMetadata.ownerId, undefined);
    const downloadUrl = `${url}/${metadata.id}`;
    assert.equal((await fetch(`${url}/other-owner-id`)).status, 404); assert.equal(getCalls, 0);
    const download = await fetch(downloadUrl);
    assert.equal(download.status, 200); assert.equal(await download.text(), 'synthetic');
    assert.equal(download.headers.get('content-type'), 'text/plain');
    assert.equal(download.headers.get('x-content-type-options'), 'nosniff');
    assert.match(download.headers.get('content-disposition')!, /^attachment; filename\*=UTF-8''/);
    failGet = true; assert.equal((await fetch(downloadUrl)).status, 503); failGet = false;
    failDelete = true; assert.equal((await fetch(downloadUrl, { method: 'DELETE' })).status, 503);
    assert(metadata); assert.equal(objectExists, true);
    failDelete = false; failRemove = true;
    assert.equal((await fetch(downloadUrl, { method: 'DELETE' })).status, 503);
    assert(metadata); assert.equal(objectExists, false);
    assert.equal((await fetch(downloadUrl)).status, 404);
    failRemove = false;
    assert.equal((await fetch(downloadUrl, { method: 'DELETE' })).status, 204);
    assert.equal(metadata, undefined);
  } finally {
    server.closeAllConnections();
    await new Promise<void>(resolve => server.close(() => resolve()));
  }
});
