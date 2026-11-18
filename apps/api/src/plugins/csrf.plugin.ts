import fp from "fastify-plugin";
import type { FastifyPluginAsync, FastifyRequest } from "fastify";

const UNSAFE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

/** Browser-only header; anything other than these means another site started the request. */
const ALLOWED_FETCH_SITES = new Set(["same-origin", "none"]);

/** SameSite can't stop sibling *.julianwardana.dev hosts; Sec-Fetch-Site and Origin can. Non-browser callers send neither and pass. */
const TOKEN_ENDPOINTS = ["/mcp", "/oauth/token", "/oauth/register", "/oauth/revoke"];

function isTokenEndpoint(url: string): boolean {
  const path = url.split("?")[0] ?? url;
  return TOKEN_ENDPOINTS.some((endpoint) => path === endpoint || (endpoint === "/mcp" && path.startsWith("/mcp/")));
}

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
    // Bearer-token and OAuth client endpoints, called by MCP clients; cookies play no part in them.
    if (isTokenEndpoint(request.url)) return;

    if (crossOrigin(request)) {
      request.log.warn({ origin: request.headers.origin, site: request.headers["sec-fetch-site"] }, "blocked cross-origin request");
      return reply.code(403).send({ error: "Cross-origin request blocked" });
    }
  });
};

export default fp(csrfPlugin);
