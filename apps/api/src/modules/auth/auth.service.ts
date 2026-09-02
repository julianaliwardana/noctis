import bcrypt from "bcrypt";
import type { CookieSerializeOptions } from "@fastify/cookie";
import type { FastifyInstance, FastifyReply } from "fastify";
import { db } from "@noctis/db";
import type { User } from "@noctis/db";

const SALT_ROUNDS = 12;

export const ACCESS_COOKIE = "noctis_access";
export const REFRESH_COOKIE = "noctis_refresh";

const ACCESS_MAX_AGE = 15 * 60;
const REFRESH_MAX_AGE = 30 * 24 * 60 * 60;

/**
 * `httpOnly` is the point of the whole arrangement: an XSS payload can ride the session while the
 * page is open, but it can no longer read the tokens out and keep them for 30 days.
 *
 * `sameSite: lax` is sufficient CSRF cover because the web app and the API share a registrable
 * domain (COOKIE_DOMAIN), so no genuinely cross-site request ever carries these. Left unset in dev,
 * where both sides are `localhost` and the cookie is host-only.
 */
const isProduction = process.env.NODE_ENV === "production";

const cookieOptions: CookieSerializeOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: "lax",
  // Not scoped to /auth: the web app's middleware reads the refresh cookie on every navigation to
  // decide whether there is a session at all.
  path: "/",
  // Production only, on purpose. A `Domain` the current host doesn't sit under makes the browser
  // drop the cookie without a word — so a prod value left in a dev .env would silently bounce every
  // login back to /login. Dev is always localhost, where a host-only cookie already reaches both.
  domain: isProduction ? process.env.COOKIE_DOMAIN || undefined : undefined,
};

export async function createUser(email: string, password: string): Promise<User> {
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  return db.user.create({ data: { email, passwordHash } });
}

export async function verifyCredentials(email: string, password: string): Promise<User | null> {
  const user = await db.user.findUnique({ where: { email } });
  if (!user) return null;

  const valid = await bcrypt.compare(password, user.passwordHash);
  return valid ? user : null;
}

export function setAccessCookie(app: FastifyInstance, reply: FastifyReply, userId: string): void {
  const token = app.jwt.sign({ userId, type: "access" }, { expiresIn: "15m" });
  reply.setCookie(ACCESS_COOKIE, token, { ...cookieOptions, maxAge: ACCESS_MAX_AGE });
}

export function setRefreshCookie(app: FastifyInstance, reply: FastifyReply, userId: string): void {
  const token = app.jwt.sign({ userId, type: "refresh" }, { expiresIn: "30d" });
  reply.setCookie(REFRESH_COOKIE, token, { ...cookieOptions, maxAge: REFRESH_MAX_AGE });
}

export function clearAuthCookies(reply: FastifyReply): void {
  reply.clearCookie(ACCESS_COOKIE, cookieOptions);
  reply.clearCookie(REFRESH_COOKIE, cookieOptions);
}

export function verifyRefreshToken(app: FastifyInstance, token: string): string | null {
  try {
    const payload = app.jwt.verify<{ userId: string; type?: string }>(token);
    return payload.type === "refresh" ? payload.userId : null;
  } catch {
    return null;
  }
}
