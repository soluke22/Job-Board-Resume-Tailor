import express, { type Express, type RequestHandler } from 'express';
import { randomUUID } from 'node:crypto';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { put, get, del } from '@vercel/blob';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { getDb } from './db/client';
import { privateFiles } from './db/schema';
import { requireWorkspaceOwner } from './auth';

export const MAX_PRIVATE_FILE_BYTES = 2 * 1024 * 1024;
const uploadSchema = z.object({
  originalFilename: z.string().min(1).max(200).regex(/^[^/\\\x00-\x1f\x7f]+$/),
  mimeType: z.enum(['application/pdf', 'text/plain', 'application/x-tex', 'text/x-tex', 'application/json']),
  purpose: z.enum(['master-resume', 'evidence', 'resume-source', 'generated-resume', 'application-history']),
  sourceType: z.enum(['user-upload', 'legacy-import', 'generated']),
  contentBase64: z.string().min(4).max(Math.ceil(MAX_PRIVATE_FILE_BYTES / 3) * 4).regex(/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/),
}).strict();
export function validateUpload(input: unknown) {
  const data = uploadSchema.parse(input);
  const content = Buffer.from(data.contentBase64, 'base64');
  if (!content.length || content.length > MAX_PRIVATE_FILE_BYTES) throw new Error('Invalid file size');
  if (data.mimeType === 'application/pdf') {
    if (content.subarray(0, 5).toString() !== '%PDF-') throw new Error('Invalid PDF file');
  } else {
    const text = new TextDecoder('utf-8', { fatal: true }).decode(content);
    if (text.includes('\0')) throw new Error('Invalid text file');
    if (data.mimeType === 'application/json') JSON.parse(text);
  }
  return { ...data, content };
}
type FileRecord = typeof privateFiles.$inferSelect;
export interface FileRepository {
  list(ownerId: string): Promise<FileRecord[]>;
  find(ownerId: string, id: string): Promise<FileRecord | undefined>;
  insert(record: typeof privateFiles.$inferInsert): Promise<FileRecord>;
  remove(ownerId: string, id: string): Promise<void>;
}
const repository: FileRepository = {
  list: ownerId => getDb().select().from(privateFiles).where(eq(privateFiles.ownerId, ownerId)),
  find: async (ownerId, id) => (await getDb().select().from(privateFiles).where(and(eq(privateFiles.ownerId, ownerId), eq(privateFiles.id, id))).limit(1))[0],
  insert: async record => (await getDb().insert(privateFiles).values(record).returning())[0],
  remove: async (ownerId, id) => { await getDb().delete(privateFiles).where(and(eq(privateFiles.ownerId, ownerId), eq(privateFiles.id, id))); },
};
const blobStore = { put, get, del };
function publicMetadata(record: FileRecord) { const { blobPath, ownerId, ...metadata } = record; return metadata; }
export function installPrivateFiles(app: Express, deps: { guard?: RequestHandler; repository?: FileRepository; blobs?: typeof blobStore } = {}) {
  const guard = deps.guard ?? requireWorkspaceOwner;
  const files = deps.repository ?? repository;
  const blobs = deps.blobs ?? blobStore;
  app.get('/api/private/files', guard, async (_req, res) => {
    try { res.json({ files: (await files.list(res.locals.ownerId)).map(publicMetadata) }); }
    catch { res.status(503).json({ error: 'Private file storage is unavailable' }); }
  });
  app.post('/api/private/files', guard, express.json({ limit: '3mb' }), async (req, res) => {
    let data: ReturnType<typeof validateUpload>;
    try { data = validateUpload(req.body); } catch { res.status(400).json({ error: 'Upload requires a valid PDF, UTF-8 text, LaTeX or JSON file up to 2 MiB' }); return; }
    const id = randomUUID();
    let path: string | undefined;
    try {
      const blob = await blobs.put(`private/${res.locals.ownerId}/${id}`, data.content, { access: 'private', contentType: data.mimeType, addRandomSuffix: false });
      path = blob.pathname;
      const record = await files.insert({ id, ownerId: res.locals.ownerId, blobPath: path, originalFilename: data.originalFilename, mimeType: data.mimeType, size: data.content.length, purpose: data.purpose, sourceType: data.sourceType });
      res.status(201).json(publicMetadata(record));
    } catch {
      if (path) await blobs.del(path).catch(() => {});
      res.status(503).json({ error: 'Private file upload failed; retry later' });
    }
  });
  app.get('/api/private/files/:id', guard, async (req, res) => {
    try {
      const record = await files.find(res.locals.ownerId, req.params.id);
      if (!record) { res.status(404).json({ error: 'File not found' }); return; }
      const result = await blobs.get(record.blobPath, { access: 'private' });
      if (!result || result.statusCode !== 200 || !result.stream) { res.status(404).json({ error: 'File not found' }); return; }
      res.setHeader('Content-Type', record.mimeType);
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Content-Security-Policy', "default-src 'none'; sandbox");
      res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(record.originalFilename)}`);
      await pipeline(Readable.fromWeb(result.stream as any), res);
    } catch { if (!res.headersSent) res.status(503).json({ error: 'Private file download failed' }); else res.destroy(); }
  });
  app.delete('/api/private/files/:id', guard, async (req, res) => {
    try {
      const record = await files.find(res.locals.ownerId, req.params.id);
      if (!record) { res.status(404).json({ error: 'File not found' }); return; }
      await blobs.del(record.blobPath);
      await files.remove(res.locals.ownerId, record.id);
      res.status(204).end();
    } catch { res.status(503).json({ error: 'Private file deletion failed; retry later' }); }
  });
}
