import bcrypt from "bcrypt";
import type { CookieSerializeOptions } from "@fastify/cookie";
import type { FastifyInstance, FastifyReply } from "fastify";
import { db } from "@noctis/db";
import type { User } from "@noctis/db";

const SALT_ROUNDS = 12;

const isProduction = process.env.NODE_ENV === "production";

/** `__Host-` in production pins cookies to this host. Dev uses bare names (Safari drops Secure cookies on http://localhost). Must match apps/web/src/lib/authCookies.ts. */
const COOKIE_PREFIX = isProduction ? "__Host-" : "";
export const ACCESS_COOKIE = `${COOKIE_PREFIX}noctis_access`;
export const REFRESH_COOKIE = `${COOKIE_PREFIX}noctis_refresh`;

const ACCESS_MAX_AGE = 15 * 60;
const REFRESH_MAX_AGE = 30 * 24 * 60 * 60;

/** Host-only (the browser reaches the API through the web app's /api) and httpOnly. CSRF is handled by the csrf plugin. */
const cookieOptions: CookieSerializeOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: "lax",
  // Not scoped to /auth: the web app's middleware reads the refresh cookie on every navigation.
  path: "/",
};

/** Expires the old parent-domain cookies on COOKIE_DOMAIN. Remove once they've aged out (after 2026-12-10). */
const LEGACY_COOKIE_DOMAIN = isProduction ? process.env.COOKIE_DOMAIN?.trim() || undefined : undefined;
const LEGACY_COOKIES = ["noctis_access", "noctis_refresh"];

/** Emails are compared case-insensitively everywhere; store and look them up lowercased. */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** Case-insensitive, so older mixed-case emails still match. */
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

/** Compared against unknown emails, so response timing doesn't reveal which accounts exist. */
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

/** Revokes every refresh token (checked through `ver`). Issued access tokens live out their 15 minutes. */
export async function revokeAllSessions(userId: string): Promise<User> {
  return db.user.update({ where: { id: userId }, data: { tokenVersion: { increment: 1 } } });
}
