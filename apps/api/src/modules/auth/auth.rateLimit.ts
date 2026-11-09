import type { FastifyReply, FastifyRequest } from "fastify";

/**
 * The real visitor IP. The API sits behind Cloudflare → cloudflared → (Next rewrite), so the socket
 * address is always one of our own containers — keying on it put every visitor in one bucket, and
 * ten junk logins a minute from anywhere locked everyone out. Cloudflare overwrites
 * `CF-Connecting-IP` at its edge, so clients can't forge it as long as the API is only reachable
 * through Cloudflare. Without the header (local dev) the socket address is the client.
 */
export function clientIp(request: FastifyRequest): string {
  const header = request.headers["cf-connecting-ip"];
  const value = Array.isArray(header) ? header[0] : header;
  return value?.trim() || request.ip;
}

interface Limit {
  /** Redis key namespace; each limit counts separately. */
  name: string;
  max: number;
  windowSeconds: number;
}

/** Login and register share a budget; refresh gets its own so attackers can't starve sessions. */
export const CREDENTIAL_LIMIT: Limit = { name: "auth", max: 10, windowSeconds: 60 };
export const REFRESH_LIMIT: Limit = { name: "refresh", max: 30, windowSeconds: 60 };

/** Failed logins per account, whatever IP they come from — the backstop if IPs are rotated. */
const LOGIN_FAILURE_LIMIT = { max: 10, windowSeconds: 15 * 60 };

async function tooMany(reply: FastifyReply, retryAfter: number): Promise<FastifyReply> {
  return reply
    .code(429)
    .header("Retry-After", String(retryAfter))
    .send({ error: "Too many requests, try again later", retryAfter });
}

export function ipRateLimit(limit: Limit) {
  return async function rateLimit(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply | void> {
    const key = `ratelimit:${limit.name}:${clientIp(request)}`;
    const count = await request.server.redis.incr(key);
    if (count === 1) await request.server.redis.expire(key, limit.windowSeconds);
    if (count > limit.max) {
      const ttl = await request.server.redis.ttl(key);
      return tooMany(reply, ttl > 0 ? ttl : limit.windowSeconds);
    }
  };
}

function failureKey(email: string): string {
  return `ratelimit:login-fail:${email}`;
}

/** Call before checking the password; replies 429 and returns true when the account is cooling off. */
export async function loginLockedOut(request: FastifyRequest, reply: FastifyReply, email: string): Promise<boolean> {
  const key = failureKey(email);
  const failures = Number((await request.server.redis.get(key)) ?? 0);
  if (failures < LOGIN_FAILURE_LIMIT.max) return false;

  const ttl = await request.server.redis.ttl(key);
  await tooMany(reply, ttl > 0 ? ttl : LOGIN_FAILURE_LIMIT.windowSeconds);
  return true;
}

export async function recordLoginFailure(request: FastifyRequest, email: string): Promise<void> {
  const key = failureKey(email);
  const count = await request.server.redis.incr(key);
  if (count === 1) await request.server.redis.expire(key, LOGIN_FAILURE_LIMIT.windowSeconds);
}

export async function clearLoginFailures(request: FastifyRequest, email: string): Promise<void> {
  await request.server.redis.del(failureKey(email));
}
