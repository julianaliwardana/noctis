import bcrypt from "bcrypt";
import type { CookieSerializeOptions } from "@fastify/cookie";
import type { FastifyInstance, FastifyReply } from "fastify";
import { db } from "@noctis/db";
import type { User } from "@noctis/db";

const SALT_ROUNDS = 12;

const isProduction = process.env.NODE_ENV === "production";

/**
 * `__Host-` makes the browser itself enforce what the options below promise: Secure, Path=/ and
 * no Domain, so the cookie can only ever go back to the exact host that set it. Production only —
 * Safari won't store a Secure cookie on http://localhost, so dev keeps the bare names.
 *
 * The web app's middleware has to read the same name; see apps/web/src/lib/authCookies.ts.
 */
const COOKIE_PREFIX = isProduction ? "__Host-" : "";
export const ACCESS_COOKIE = `${COOKIE_PREFIX}noctis_access`;
export const REFRESH_COOKIE = `${COOKIE_PREFIX}noctis_refresh`;

const ACCESS_MAX_AGE = 15 * 60;
const REFRESH_MAX_AGE = 30 * 24 * 60 * 60;

/**
 * Host-only on purpose. The browser talks to this API through the web app's own origin
 * (Next rewrites /api/* to it), so there is no second host the cookies need to reach — and a
 * parent-domain cookie would also be sent to every sibling subdomain (omniroute, cdn, …).
 *
 * `httpOnly`: an XSS payload can ride the session while the page is open, but can't read the
 * tokens out and keep them. CSRF from sibling subdomains (which SameSite treats as same-site) is
 * handled separately by the csrf plugin.
 */
const cookieOptions: CookieSerializeOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: "lax",
  // Not scoped to /auth: the web app's middleware reads the refresh cookie on every navigation.
  path: "/",
};

/**
 * Before the move to host-only cookies they were set on COOKIE_DOMAIN (e.g. julianwardana.dev).
 * Those copies live up to 30 days in existing browsers and keep leaking to sibling subdomains, so
 * every login/logout/failed refresh also expires them. Drop COOKIE_DOMAIN from the env once the
 * last old cookie has aged out.
 */
const LEGACY_COOKIE_DOMAIN = isProduction ? process.env.COOKIE_DOMAIN?.trim() || undefined : undefined;
const LEGACY_COOKIES = ["noctis_access", "noctis_refresh"];

/** Emails are compared case-insensitively everywhere; store and look them up lowercased. */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Case-insensitive so accounts created before emails were normalised (e.g. `Julian@…`) still
 * match their lowercased input.
 */
export function findUserByEmail(email: string): Promise<User | null> {
  return db.user.findFirst({ where: { email: { equals: normalizeEmail(email), mode: "insensitive" } } });
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function createUser(email: string, password: string): Promise<User> {
  const passwordHash = await hashPassword(password);
  return db.user.create({ data: { email: normalizeEmail(email), passwordHash } });
}

/**
 * Compared against when the email is unknown, so a miss costs the same bcrypt time as a wrong
 * password and response timing doesn't reveal which emails have accounts.
 */
const DUMMY_HASH = bcrypt.hashSync("noctis-timing-equaliser", SALT_ROUNDS);

export async function verifyCredentials(email: string, password: string): Promise<User | null> {
  const user = await findUserByEmail(email);
  const valid = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);
  return user && valid ? user : null;
}

export async function passwordMatches(user: Pick<User, "passwordHash">, password: string): Promise<boolean> {
  return bcrypt.compare(password, user.passwordHash);
}

type SessionUser = Pick<User, "id" | "tokenVersion">;

export function setAccessCookie(app: FastifyInstance, reply: FastifyReply, user: SessionUser): void {
  const token = app.jwt.sign({ userId: user.id, type: "access", ver: user.tokenVersion }, { expiresIn: "15m" });
  reply.setCookie(ACCESS_COOKIE, token, { ...cookieOptions, maxAge: ACCESS_MAX_AGE });
}

export function setRefreshCookie(app: FastifyInstance, reply: FastifyReply, user: SessionUser): void {
  const token = app.jwt.sign({ userId: user.id, type: "refresh", ver: user.tokenVersion }, { expiresIn: "30d" });
  reply.setCookie(REFRESH_COOKIE, token, { ...cookieOptions, maxAge: REFRESH_MAX_AGE });
}

export function startSession(app: FastifyInstance, reply: FastifyReply, user: SessionUser): void {
  clearLegacyCookies(reply);
  setAccessCookie(app, reply, user);
  setRefreshCookie(app, reply, user);
}

function clearLegacyCookies(reply: FastifyReply): void {
  if (!LEGACY_COOKIE_DOMAIN) return;
  for (const name of LEGACY_COOKIES) {
    reply.clearCookie(name, { ...cookieOptions, secure: true, domain: LEGACY_COOKIE_DOMAIN });
  }
}

export function clearAuthCookies(reply: FastifyReply): void {
  reply.clearCookie(ACCESS_COOKIE, cookieOptions);
  reply.clearCookie(REFRESH_COOKIE, cookieOptions);
  clearLegacyCookies(reply);
}

export interface RefreshClaims {
  userId: string;
  ver: number;
}

export function verifyRefreshToken(app: FastifyInstance, token: string): RefreshClaims | null {
  try {
    const payload = app.jwt.verify<{ userId: string; type?: string; ver?: unknown }>(token);
    if (payload.type !== "refresh" || typeof payload.ver !== "number") return null;
    return { userId: payload.userId, ver: payload.ver };
  } catch {
    return null;
  }
}

/**
 * Kills every outstanding refresh token for this user: the next /auth/refresh compares the token's
 * `ver` against this counter and refuses. Access tokens already issued keep working until they
 * lapse (≤15 min) — checking them would cost a DB read on every request.
 */
export async function revokeAllSessions(userId: string): Promise<User> {
  return db.user.update({ where: { id: userId }, data: { tokenVersion: { increment: 1 } } });
}
