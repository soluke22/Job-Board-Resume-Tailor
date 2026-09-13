import express, { type Express, type RequestHandler } from 'express';
import { randomUUID } from 'node:crypto';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { put, get, del } from '@vercel/blob';
import { z } from 'zod';
import { requireWorkspaceOwner, privateNoStore } from './auth';
import { assertBoundedJson } from './inputBounds';
import { reserveProviderCall, ProviderBudgetExceeded } from './providerBudget';
import { createPrivateFileRepository, type FileRecord, type FileRepository } from './privateFileRepository';
export type { FileRepository } from './privateFileRepository';

export const MAX_PRIVATE_FILE_BYTES = 2 * 1024 * 1024;
const uploadSchema = z.object({
  originalFilename: z.string().min(1).max(200).regex(/^[^/\\:*?"<>|\x00-\x1f\x7f]+$/).refine(value => {
    try { encodeURIComponent(value); return !/^\.+$/.test(value); } catch { return false; }
  }),
  mimeType: z.enum(['application/pdf', 'text/plain', 'application/x-tex', 'text/x-tex', 'application/json']),
  purpose: z.enum(['master-resume', 'evidence', 'resume-source', 'generated-resume', 'application-history']),
  sourceType: z.enum(['user-upload', 'legacy-import', 'generated']),
  contentBase64: z.string().min(4).max(Math.ceil(MAX_PRIVATE_FILE_BYTES / 3) * 4).regex(/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/),
}).strict();
export function validateUpload(input: unknown) {
  const data = uploadSchema.parse(input);
  const content = Buffer.from(data.contentBase64, 'base64');
  if (content.toString('base64') !== data.contentBase64) throw new Error('Invalid base64 encoding');
  if (!content.length || content.length > MAX_PRIVATE_FILE_BYTES) throw new Error('Invalid file size');
  if (data.mimeType === 'application/pdf') {
    if (content.subarray(0, 5).toString() !== '%PDF-') throw new Error('Invalid PDF file');
  } else {
    const text = new TextDecoder('utf-8', { fatal: true }).decode(content);
    if (text.includes('\0')) throw new Error('Invalid text file');
    if (data.mimeType === 'application/json') assertBoundedJson(JSON.parse(text));
  }
  return { ...data, content };
}
const repository = createPrivateFileRepository();
const blobStore = { put, get, del };
function publicMetadata(record: FileRecord) { const { blobPath, ownerId, ...metadata } = record; return metadata; }
export function installPrivateFiles(app: Express, deps: { guard?: RequestHandler; repository?: FileRepository; blobs?: typeof blobStore; budget?: typeof reserveProviderCall } = {}) {
  const guard = deps.guard ?? requireWorkspaceOwner;
  const files = deps.repository ?? repository;
  const blobs = deps.blobs ?? blobStore;
  const budget = deps.budget ?? reserveProviderCall;
  const boundedMutation: RequestHandler = async (_req, res, next) => {
    try { await budget(res.locals.ownerId, 'files'); next(); }
    catch (error) { res.status(error instanceof ProviderBudgetExceeded ? 429 : 503).json({ error: 'Private file budget unavailable or exceeded; retry later' }); }
  };
  app.use('/api/private/files', privateNoStore);
  const cleanup = async (ownerId: string) => {
    const abortSignal = AbortSignal.timeout(15_000);
    return files.reconcile(ownerId, path => blobs.del(path, { abortSignal }));
  };
  app.get('/api/private/files', guard, async (_req, res) => {
    try { res.json({ files: (await files.list(res.locals.ownerId)).map(publicMetadata) }); }
    catch { res.status(503).json({ error: 'Private file storage is unavailable' }); }
  });
  app.post('/api/private/files', guard, boundedMutation, express.json({ limit: '3mb' }), async (req, res) => {
    let data: ReturnType<typeof validateUpload>;
    try { data = validateUpload(req.body); } catch { res.status(400).json({ error: 'Upload requires a valid PDF, UTF-8 text, LaTeX or JSON file up to 2 MiB' }); return; }
    const id = randomUUID();
    const path = `private/${res.locals.ownerId}/${id}`;
    try {
      // Prior unresolved uploads remain recoverable across process restarts.
      await cleanup(res.locals.ownerId);
      const record = await files.upload({ id, ownerId: res.locals.ownerId, blobPath: path, originalFilename: data.originalFilename, mimeType: data.mimeType, size: data.content.length, purpose: data.purpose, sourceType: data.sourceType }, async () => {
        const blob = await blobs.put(path, data.content, { access: 'private', contentType: data.mimeType, addRandomSuffix: false, allowOverwrite: false, abortSignal: AbortSignal.timeout(15_000) });
        if (blob.pathname !== path) throw new Error('Unexpected private Blob path');
      });
      res.status(201).json(publicMetadata(record));
    } catch {
      // If DB/Blob is down this may fail too; the committed intent remains for
      // explicit reconciliation/next upload. Never delete a saved ambiguous commit.
      await cleanup(res.locals.ownerId).catch(() => {});
      res.status(503).json({ error: 'Private file upload failed; retry later' });
    }
  });
  app.post('/api/private/files/reconcile', guard, boundedMutation, async (_req, res) => {
    try { res.json({ checked: await cleanup(res.locals.ownerId) }); }
    catch { res.status(503).json({ error: 'Private file cleanup is unavailable; retry later' }); }
  });
  app.get('/api/private/files/:id', guard, boundedMutation, async (req, res) => {
    try {
      const record = await files.find(res.locals.ownerId, req.params.id);
      if (!record) { res.status(404).json({ error: 'File not found' }); return; }
      const result = await blobs.get(record.blobPath, { access: 'private', useCache: false, abortSignal: AbortSignal.timeout(15_000) });
      if (!result) { res.status(404).json({ error: 'File not found' }); return; }
      if (result.statusCode !== 200 || !result.stream) throw new Error('Private Blob returned an unexpected response');
      res.setHeader('Content-Type', record.mimeType);
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Content-Security-Policy', "default-src 'none'; sandbox");
      res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(record.originalFilename)}`);
      await pipeline(Readable.fromWeb(result.stream as any), res);
    } catch { if (!res.headersSent) res.status(503).json({ error: 'Private file download failed' }); else res.destroy(); }
  });
  app.delete('/api/private/files/:id', guard, boundedMutation, async (req, res) => {
    try {
      const record = await files.find(res.locals.ownerId, req.params.id);
      if (!record) { res.status(404).json({ error: 'File not found' }); return; }
      await blobs.del(record.blobPath, { abortSignal: AbortSignal.timeout(15_000) });
      await files.remove(res.locals.ownerId, record.id);
      res.status(204).end();
    } catch { res.status(503).json({ error: 'Private file deletion failed; retry later' }); }
  });
}
