import type { Express, RequestHandler } from 'express';
import { betterAuth, type BetterAuthOptions } from 'better-auth';
import { APIError } from 'better-auth/api';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { fromNodeHeaders, toNodeHandler } from 'better-auth/node';
import { getDb } from './db/client';
import * as schema from './db/schema';

export function authConfiguration() {
  const names = ['OWNER_EMAIL', 'DATABASE_URL', 'BETTER_AUTH_SECRET', 'BETTER_AUTH_URL', 'GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET'] as const;
  if (names.some(name => !process.env[name]?.trim())) throw new Error('Private authentication is not configured');
  const url = new URL(process.env.BETTER_AUTH_URL!);
  if (url.pathname !== '/' || url.search || url.hash || url.username || url.password || (url.protocol !== 'https:' && !(process.env.NODE_ENV !== 'production' && url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname)))) throw new Error('Invalid authentication origin');
  if (process.env.BETTER_AUTH_SECRET!.length < 32) throw new Error('Authentication secret must contain at least 32 characters');
  return { origin: url.origin, ownerEmail: process.env.OWNER_EMAIL!.trim().toLowerCase() };
}
export function isOwnerIdentity(user: { email?: string; emailVerified?: boolean } | null | undefined) {
  const owner = process.env.OWNER_EMAIL?.trim().toLowerCase();
  return Boolean(owner && user?.emailVerified === true && user.email?.trim().toLowerCase() === owner);
}
let auth: ReturnType<typeof betterAuth> | undefined;
export function getAuth() {
  const config = authConfiguration();
  if (!auth) auth = betterAuth<BetterAuthOptions>({
    appName: 'CareerOS', baseURL: config.origin, secret: process.env.BETTER_AUTH_SECRET!,
    database: drizzleAdapter(getDb(), { provider: 'pg', schema }),
    trustedOrigins: [config.origin],
    emailAndPassword: { enabled: false, disableSignUp: true },
    socialProviders: { google: { clientId: process.env.GOOGLE_CLIENT_ID!, clientSecret: process.env.GOOGLE_CLIENT_SECRET!, prompt: 'select_account' } },
    account: { accountLinking: { enabled: false } },
    session: { expiresIn: 60 * 60 * 24, updateAge: 60 * 60, cookieCache: { enabled: false } },
    advanced: { useSecureCookies: config.origin.startsWith('https:'), defaultCookieAttributes: { httpOnly: true, sameSite: 'lax', path: '/' } },
    databaseHooks: {
      user: {
        create: { before: async user => { if (!isOwnerIdentity(user)) throw new APIError('FORBIDDEN', { message: 'Private workspace access denied' }); return { data: user }; } },
        update: { before: async user => { if (user.email !== undefined || user.emailVerified !== undefined) throw new APIError('FORBIDDEN', { message: 'Identity changes are disabled' }); return { data: user }; } },
      },
      session: { create: { before: async session => {
        const owner = await getDb().query.user.findFirst({ where: (u, { eq }) => eq(u.id, session.userId) });
        if (!isOwnerIdentity(owner)) throw new APIError('FORBIDDEN', { message: 'Private workspace access denied' });
        return { data: session };
      } } },
    },
  });
  return auth;
}
export const privateNoStore: RequestHandler = (_req, res, next) => {
  res.setHeader('Cache-Control', 'private, no-store, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Vary', 'Cookie');
  next();
};
export type SessionReader = (req: Parameters<RequestHandler>[0]) => Promise<{ user: { id: string; email: string; emailVerified: boolean; name?: string }; session: { expiresAt: Date } } | null>;
const readSession: SessionReader = req => getAuth().api.getSession({ headers: fromNodeHeaders(req.headers), query: { disableCookieCache: true } });
export function createOwnerGuard(reader: SessionReader = readSession): RequestHandler {
  return async (req, res, next) => {
    privateNoStore(req, res, () => {});
    try {
      const { origin } = authConfiguration();
      if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method) && req.headers.origin !== origin) { res.status(403).json({ error: 'Invalid request origin' }); return; }
      const session = await reader(req);
      if (!session || new Date(session.session.expiresAt).getTime() <= Date.now()) { res.status(401).json({ error: 'Authentication required' }); return; }
      if (!isOwnerIdentity(session.user)) { res.status(403).json({ error: 'Private workspace access denied' }); return; }
      res.locals.ownerId = session.user.id;
      next();
    } catch { res.status(503).json({ error: 'Private authentication is unavailable' }); }
  };
}
export const requireWorkspaceOwner = createOwnerGuard();
export function installAuth(app: Express) {
  app.use('/api/auth', privateNoStore);
  app.get('/api/auth/session', async (req, res) => {
    try {
      authConfiguration();
      const session = await readSession(req);
      if (!session || !isOwnerIdentity(session.user) || new Date(session.session.expiresAt).getTime() <= Date.now()) { res.json({ authenticated: false, isOwner: false }); return; }
      res.json({ authenticated: true, isOwner: true, user: { id: session.user.id, email: session.user.email, name: session.user.name } });
    } catch { res.status(503).json({ error: 'Private authentication is unavailable' }); }
  });
  app.all('/api/auth/*', async (req, res) => {
    try {
      const { origin } = authConfiguration();
      if (!['GET', 'HEAD'].includes(req.method) && req.headers.origin !== origin) { res.status(403).json({ error: 'Invalid request origin' }); return; }
      await toNodeHandler(getAuth())(req, res);
    } catch { if (!res.headersSent) res.status(503).json({ error: 'Private authentication is unavailable' }); }
  });
}

