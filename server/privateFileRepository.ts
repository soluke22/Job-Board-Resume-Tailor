import { and, asc, eq } from 'drizzle-orm';
import { getDb } from './db/client';
import { privateFiles, privateFileUploads } from './db/schema';

export type FileRecord = typeof privateFiles.$inferSelect;
type FileInput = typeof privateFiles.$inferInsert;
export interface FileRepository {
  list(ownerId: string): Promise<FileRecord[]>;
  find(ownerId: string, id: string): Promise<FileRecord | undefined>;
  insert(record: FileInput): Promise<FileRecord>;
  remove(ownerId: string, id: string): Promise<void>;
  upload(record: FileInput, writeBlob: () => Promise<void>): Promise<FileRecord>;
  reconcile(ownerId: string, deleteBlob: (path: string) => Promise<void>): Promise<number>;
}

export function createPrivateFileRepository(database: () => ReturnType<typeof getDb> = getDb): FileRepository {
  const owner = (ownerId: string) => { if (!ownerId) throw new Error('Owner identity required'); return ownerId; };
  const fileKey = (ownerId: string, id: string) => and(eq(privateFiles.ownerId, owner(ownerId)), eq(privateFiles.id, id));
  const uploadKey = (ownerId: string, id: string) => and(eq(privateFileUploads.ownerId, owner(ownerId)), eq(privateFileUploads.id, id));
  return {
    list: ownerId => database().select().from(privateFiles).where(eq(privateFiles.ownerId, owner(ownerId))),
    find: async (ownerId, id) => (await database().select().from(privateFiles).where(fileKey(ownerId, id)).limit(1))[0],
    insert: async record => { owner(record.ownerId); return (await database().insert(privateFiles).values(record).returning())[0]; },
    remove: async (ownerId, id) => { await database().delete(privateFiles).where(fileKey(ownerId, id)); },
    async upload(record, writeBlob) {
      owner(record.ownerId);
      // Do not put a Blob if the durable recovery record cannot be committed.
      await database().insert(privateFileUploads).values({ ownerId: record.ownerId, id: record.id, blobPath: record.blobPath });
      return database().transaction(async tx => {
        const [intent] = await tx.select().from(privateFileUploads).where(uploadKey(record.ownerId, record.id)).for('update');
        if (!intent || intent.state !== 'pending') throw new Error('Upload was abandoned; retry with a new file');
        await writeBlob();
        const [saved] = await tx.insert(privateFiles).values(record).returning();
        await tx.delete(privateFileUploads).where(uploadKey(record.ownerId, record.id));
        return saved;
      });
    },
    async reconcile(ownerId, deleteBlob) {
      owner(ownerId);
      return database().transaction(async tx => {
        // Skip active upload locks. This also fences delayed uploads that have
        // not yet acquired the row lock: they cannot write an abandoned intent.
        const intents = await tx.select().from(privateFileUploads)
          .where(eq(privateFileUploads.ownerId, ownerId))
          .orderBy(asc(privateFileUploads.updatedAt), asc(privateFileUploads.id))
          .limit(20).for('update', { skipLocked: true });
        for (const intent of intents) {
          const [saved] = await tx.select().from(privateFiles).where(fileKey(ownerId, intent.id)).limit(1);
          if (saved) {
            // A saved object is never compensated, even after an ambiguous commit.
            await tx.delete(privateFileUploads).where(uploadKey(ownerId, intent.id));
            continue;
          }
          await deleteBlob(intent.blobPath);
          // Retain a tombstone: an aborted put may still complete remotely. A
          // later reconciliation retries this unique path rather than losing it.
          await tx.update(privateFileUploads).set({ state: 'abandoned', updatedAt: new Date() }).where(uploadKey(ownerId, intent.id));
        }
        return intents.length;
      });
    },
  };
}
