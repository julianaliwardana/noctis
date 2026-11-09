import fp from "fastify-plugin";
import type { FastifyPluginAsync, FastifyRequest } from "fastify";

const UNSAFE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

/** Browser-only header; anything other than these means another site started the request. */
const ALLOWED_FETCH_SITES = new Set(["same-origin", "none"]);

/**
 * SameSite=Lax stops cross-*site* requests, but every *.julianwardana.dev host counts as the same
 * site — so a page on omniroute or the portfolio could still POST to Noctis with the session
 * cookies attached. The browser's Sec-Fetch-Site / Origin headers say where a request really came
 * from, and neither can be set by page script.
 *
 * Non-browser callers (curl, the MCP connector) send neither header and aren't cookie-authenticated
 * anyway, so they pass through untouched.
 */
const csrfPlugin: FastifyPluginAsync<{ allowedOrigins: string[] }> = async (fastify, { allowedOrigins }) => {
  const origins = new Set(allowedOrigins);

  function crossOrigin(request: FastifyRequest): boolean {
    const site = request.headers["sec-fetch-site"];
    if (typeof site === "string") return !ALLOWED_FETCH_SITES.has(site);

    // Older browsers without Fetch Metadata still send Origin on unsafe requests.
    const origin = request.headers.origin;
    return typeof origin === "string" && !origins.has(origin);
  }

  fastify.addHook("onRequest", async (request, reply) => {
    if (!UNSAFE_METHODS.has(request.method)) return;
    // Bearer-token endpoint, called server-to-server; cookies play no part in it.
    if (request.url === "/mcp" || request.url.startsWith("/mcp/") || request.url.startsWith("/mcp?")) return;

    if (crossOrigin(request)) {
      request.log.warn({ origin: request.headers.origin, site: request.headers["sec-fetch-site"] }, "blocked cross-origin request");
      return reply.code(403).send({ error: "Cross-origin request blocked" });
    }
  });
};

export default fp(csrfPlugin);
