import type { FastifyRequest } from "fastify";
import { clientIp } from "../auth/auth.rateLimit";

/** Wrong tokens allowed per IP before it gets 429s instead of 401s. */
export const MCP_FAILURE_LIMIT = { max: 20, windowSeconds: 10 * 60 };

/**
 * Counts a request with a wrong or missing token and returns how many seconds the IP has to wait,
 * or null while it is still under the limit.
 *
 * Only failures count, and a valid token is never refused: Claude's connectors call from shared
 * cloud IPs, so blocking everything from an IP would let anyone lock Claude out by sending junk from
 * the same range. Guessing a 64-character token is out of reach anyway; this stops scanners, keeps
 * the logs readable and tells clients plainly to back off. Floods are better stopped at Cloudflare.
 *
 * Redis being down never blocks anyone: the limiter fails open.
 */
export async function recordMcpFailure(request: FastifyRequest): Promise<number | null> {
  try {
    const key = `ratelimit:mcp-fail:${clientIp(request)}`;
    const count = await request.server.redis.incr(key);
    if (count === 1) await request.server.redis.expire(key, MCP_FAILURE_LIMIT.windowSeconds);
    if (count <= MCP_FAILURE_LIMIT.max) return null;

    // Logged once, when the IP crosses the limit, not on every rejected request after it.
    if (count === MCP_FAILURE_LIMIT.max + 1) {
      request.log.warn({ ip: clientIp(request) }, "MCP: too many requests with a wrong token");
    }
    const ttl = await request.server.redis.ttl(key);
    return ttl > 0 ? ttl : MCP_FAILURE_LIMIT.windowSeconds;
  } catch (error) {
    request.log.error(error, "MCP rate limiter unavailable");
    return null;
  }
}
