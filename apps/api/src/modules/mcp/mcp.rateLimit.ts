import type { FastifyRequest } from "fastify";
import { clientIp } from "../auth/auth.rateLimit";

/** Wrong tokens allowed per IP before it gets 429s instead of 401s. */
export const MCP_FAILURE_LIMIT = { max: 20, windowSeconds: 10 * 60 };

/** Counts a bad-token request; returns seconds to wait, or null. A valid token is never refused (Claude shares cloud IPs). Fails open without Redis. */
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
