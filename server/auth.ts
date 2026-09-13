import type { Express, RequestHandler } from 'express';
import { betterAuth, type BetterAuthOptions } from 'better-auth';
import { APIError, createAuthMiddleware } from 'better-auth/api';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { fromNodeHeaders, toNodeHandler } from 'better-auth/node';
import { getDb } from './db/client';
import * as schema from './db/schema';

export function authConfiguration() {
  const names = ['OWNER_EMAIL', 'DATABASE_URL', 'BETTER_AUTH_SECRET', 'BETTER_AUTH_URL', 'GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET'] as const;
  if (names.some(name => !process.env[name]?.trim())) throw new Error('Private authentication is not configured');
  const url = new URL(process.env.BETTER_AUTH_URL!);
  if (url.pathname !== '/' || url.search || url.hash || url.username || url.password || (url.protocol !== 'https:' && !(process.env.NODE_ENV !== 'production' && url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname)))) throw new Error('Invalid authentication origin');
  if (process.env.BETTER_AUTH_SECRET!.trim().length < 32) throw new Error('Authentication secret must contain at least 32 characters');
  return { origin: url.origin, ownerEmail: process.env.OWNER_EMAIL!.trim().toLowerCase() };
}
export function isOwnerIdentity(user: { email?: string; emailVerified?: boolean } | null | undefined) {
  const owner = process.env.OWNER_EMAIL?.trim().toLowerCase();
  return Boolean(owner && user?.emailVerified === true && user.email?.trim().toLowerCase() === owner);
}
// The adapter/owner lookup seam lets deterministic tests use the exact production
// options and hooks without external Google or Neon credentials.
export function createAuthOptions(database: BetterAuthOptions['database'], findOwner: (id: string) => Promise<{ email: string; emailVerified: boolean } | undefined>): BetterAuthOptions {
  const config = authConfiguration();
  return {
    appName: 'CareerOS', baseURL: config.origin, secret: process.env.BETTER_AUTH_SECRET!,
    // Library error objects can contain provider/query/session internals. Route
    // boundaries expose generic operational failures instead of logging them.
    logger: { disabled: true },
    database,
    trustedOrigins: [config.origin],
    emailAndPassword: { enabled: false, disableSignUp: true },
    socialProviders: { google: { clientId: process.env.GOOGLE_CLIENT_ID!, clientSecret: process.env.GOOGLE_CLIENT_SECRET!, prompt: 'select_account',
      mapProfileToUser: profile => {
        // Check the current provider profile even for an already-linked account.
        if (!isOwnerIdentity({ email: profile.email, emailVerified: profile.email_verified })) throw new APIError('FORBIDDEN', { message: 'Private workspace access denied' });
        return {};
      },
    } },
    account: { accountLinking: { enabled: false } },
    session: { expiresIn: 60 * 60 * 24, updateAge: 60 * 60, cookieCache: { enabled: false } },
    advanced: { useSecureCookies: config.origin.startsWith('https:'), defaultCookieAttributes: { httpOnly: true, sameSite: 'lax', path: '/' } },
    hooks: { before: createAuthMiddleware(async ctx => {
      if (ctx.path !== '/sign-out') return;
      // Better Auth 1.7.4 catches deletion errors in signOut. Revoke through its
      // own adapter first so an outage cannot be reported as successful logout.
      const token = await ctx.getSignedCookie(ctx.context.authCookies.sessionToken.name, ctx.context.secret);
      if (token) {
        try { await ctx.context.internalAdapter.deleteSession(token); }
        catch { throw new APIError('SERVICE_UNAVAILABLE', { message: 'Server sign-out is unavailable; retry sign-out' }); }
      }
    }) },
    databaseHooks: {
      user: {
        create: { before: async user => { if (!isOwnerIdentity(user)) throw new APIError('FORBIDDEN', { message: 'Private workspace access denied' }); return { data: user }; } },
        update: { before: async user => { if (user.email !== undefined || user.emailVerified !== undefined) throw new APIError('FORBIDDEN', { message: 'Identity changes are disabled' }); return { data: user }; } },
      },
      session: { create: { before: async session => {
        const owner = await findOwner(session.userId);
        if (!isOwnerIdentity(owner)) throw new APIError('FORBIDDEN', { message: 'Private workspace access denied' });
        return { data: session };
      } } },
    },
  };
}
const authInstances = new WeakMap<ReturnType<typeof getDb>, ReturnType<typeof betterAuth>>();
export function getAuth() {
  authConfiguration();
  const db = getDb();
  let auth = authInstances.get(db);
  if (!auth) {
    auth = betterAuth(createAuthOptions(drizzleAdapter(db, { provider: 'pg', schema }), id => db.query.user.findFirst({ where: (u, { eq }) => eq(u.id, id) })));
    authInstances.set(db, auth);
  }
  return auth;
}
export const privateNoStore: RequestHandler = (_req, res, next) => {
  res.setHeader('Cache-Control', 'private, no-store, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Vary', 'Cookie');
  next();
};
export type SessionReader = (req: Parameters<RequestHandler>[0]) => Promise<{ user: { id: string; email: string; emailVerified: boolean; name?: string }; session: { expiresAt: Date } } | null>;
export const readSession: SessionReader = req => getAuth().api.getSession({ headers: fromNodeHeaders(req.headers), query: { disableCookieCache: true } });
export function hasValidSession(session: Awaited<ReturnType<SessionReader>>) {
  const expires = session && new Date(session.session.expiresAt).getTime();
  return Boolean(session && Number.isFinite(expires) && expires > Date.now());
}
export function createOwnerGuard(reader: SessionReader = readSession): RequestHandler {
  return async (req, res, next) => {
    privateNoStore(req, res, () => {});
    try {
      const { origin } = authConfiguration();
      if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method) && req.headers.origin !== origin) { res.status(403).json({ error: 'Invalid request origin' }); return; }
      const session = await reader(req);
      if (!hasValidSession(session)) { res.status(401).json({ error: 'Authentication required' }); return; }
      if (!isOwnerIdentity(session.user)) { res.status(403).json({ error: 'Private workspace access denied' }); return; }
      res.locals.ownerId = session.user.id;
      next();
    } catch { res.status(503).json({ error: 'Private authentication is unavailable' }); }
  };
}
export const requireWorkspaceOwner = createOwnerGuard();
export function installAuth(app: Express, authProvider = getAuth) {
  const sessionReader: SessionReader = req => authProvider().api.getSession({ headers: fromNodeHeaders(req.headers), query: { disableCookieCache: true } });
  app.use('/api/auth', privateNoStore);
  app.get('/api/auth/session', async (req, res) => {
    try {
      authConfiguration();
      const session = await sessionReader(req);
      if (!hasValidSession(session) || !isOwnerIdentity(session?.user)) { res.json({ authenticated: false, isOwner: false }); return; }
      res.json({ authenticated: true, isOwner: true, expiresAt: session.session.expiresAt, user: { id: session.user.id, email: session.user.email, name: session.user.name } });
    } catch { res.status(503).json({ error: 'Private authentication is unavailable' }); }
  });
  app.all('/api/auth/*', async (req, res) => {
    try {
      const { origin } = authConfiguration();
      if (!['GET', 'HEAD'].includes(req.method) && req.headers.origin !== origin) { res.status(403).json({ error: 'Invalid request origin' }); return; }
      await toNodeHandler(authProvider())(req, res);
    } catch { if (!res.headersSent) res.status(503).json({ error: 'Private authentication is unavailable' }); }
  });
}

