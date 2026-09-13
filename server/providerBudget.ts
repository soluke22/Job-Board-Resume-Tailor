import { and, eq, lt, sql } from 'drizzle-orm';
import { getDb } from './db/client';
import { providerUsage } from './db/schema';

export class ProviderBudgetExceeded extends Error {}
// Count each Gemini invocation (including proof batches); uploads/fetches count
// operations. No success refund: retries and failed provider calls can still cost.
export function createProviderBudget(database: () => Pick<ReturnType<typeof getDb>, 'transaction'> = getDb) {
  return async (ownerId: string, category: 'ai' | 'external' | 'files', now = Date.now()) => {
    if (!ownerId) throw new Error('Owner identity required');
    const limits = category === 'ai' ? [60, 200] : [120, 500];
    await database().transaction(async tx => {
      await tx.delete(providerUsage).where(and(eq(providerUsage.ownerId, ownerId), lt(providerUsage.expiresAt, new Date(now))));
      for (const [index, duration] of [3_600_000, 86_400_000].entries()) {
        const start = Math.floor(now / duration) * duration;
        const rows = await tx.insert(providerUsage).values({ ownerId, category, window: `${duration}:${start}`, count: 1, expiresAt: new Date(start + duration) })
          .onConflictDoUpdate({ target: [providerUsage.ownerId, providerUsage.category, providerUsage.window], set: { count: sql`${providerUsage.count} + 1` }, setWhere: lt(providerUsage.count, limits[index]) }).returning();
        if (!rows.length) throw new ProviderBudgetExceeded('Provider budget exceeded; retry after the current window');
      }
    });
  };
}
export const reserveProviderCall = createProviderBudget();
export function isBudgetedExternalPath(path: string) {
  return ['/fetch-job-url', '/verify-ats', '/discover-jobs'].includes(path.toLowerCase().replace(/\/+$/, ''));
}
