import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from 'ws';
import { AsyncLocalStorage } from 'node:async_hooks';
import * as schema from './schema';

neonConfig.webSocketConstructor = ws;
export function createDatabaseBoundary(configuration = () => process.env.DATABASE_URL,
  createPool: (url: string) => Pool = url => new Pool({ connectionString: url, connectionTimeoutMillis: 10_000, idleTimeoutMillis: 10_000 }), closeTimeoutMs = 5_000) {
  let database: ReturnType<typeof drizzle<typeof schema>> | undefined;
  let pool: Pool | undefined;
  let closed = false;
  return {
    getDb() {
      if (closed) throw new Error('Database boundary is closed');
      const url = configuration()?.trim();
      if (!url) throw new Error('Database is not configured');
      if (!database) {
        pool = createPool(url);
        // Idle socket errors otherwise become unhandled events. Never log the
        // library error object, which may contain credentials/query parameters.
        pool.on('error', () => console.warn('Database connection is unavailable'));
        database = drizzle(pool, { schema });
      }
      return database;
    },
    async close() {
      closed = true;
      const previous = pool;
      pool = undefined; database = undefined;
      if (!previous) return;
      let timer: ReturnType<typeof setTimeout> | undefined;
      try {
        await Promise.race([previous.end(), new Promise<never>((_resolve, reject) => {
          timer = setTimeout(() => reject(new Error('Database cleanup timed out')), closeTimeoutMs);
          timer.unref();
        })]);
      } finally { clearTimeout(timer); }
    },
  };
}
const localDatabase = createDatabaseBoundary();
const requests = new AsyncLocalStorage<ReturnType<typeof createDatabaseBoundary>>();
export function getDb() { return (requests.getStore() ?? localDatabase).getDb(); }
export async function closeDb() { await localDatabase.close(); }
// Node serverless requests share configuration, not live WebSocket connections.
// Lazy boundaries keep public/demo requests independent of private providers.
export async function withRequestDatabase<T>(run: () => Promise<T>, boundary = createDatabaseBoundary()) {
  return requests.run(boundary, async () => { try { return await run(); } finally { await boundary.close(); } });
}
