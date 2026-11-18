import type { FastifyPluginAsync, FastifyReply } from "fastify";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { bearerFrom, matchToken, parseTokens } from "./mcp.auth";
import { recordMcpFailure } from "./mcp.rateLimit";
import { buildMcpServer } from "./mcp.server";
import { mcpUserConfig, resolveMcpUserId } from "./mcp.user";
import { SCOPE_WRITE } from "../oauth/oauth.core";
import { checkAccessToken } from "../oauth/oauth.service";
import { metadataUrls, oauthUrls } from "../oauth/oauth.urls";

/**
 * Remote MCP endpoint for Claude. Two ways in: a static token from MCP_TOKENS (sent as an
 * `Authorization: Bearer` header), or an OAuth access token from signing in through the consent
 * page. Stateless Streamable HTTP: every POST gets a fresh server and transport, so nothing is kept
 * between calls and any replica can answer.
 */
export const mcpModule: FastifyPluginAsync = async (fastify) => {
  // Throws on a malformed MCP_TOKENS or a short token: better a failed start than a weak endpoint.
  const tokens = parseTokens(process.env);
  const urls = oauthUrls();
  const { userId, email } = mcpUserConfig();

  if ((tokens.size === 0 && !urls) || (!userId && !email)) {
    fastify.log.info(
      "MCP endpoint disabled: set MCP_USER_ID (or MCP_USER_EMAIL) plus MCP_TOKENS and/or API_PUBLIC_URL (for OAuth) to enable it",
    );
    return;
  }
  fastify.log.info({ clients: [...tokens.keys()], oauth: Boolean(urls) }, "MCP endpoint enabled");
  if (!userId) fastify.log.warn("MCP is bound by MCP_USER_EMAIL; set MCP_USER_ID instead so an email change can't break it");

  // Tells a client where to sign in (RFC 9728). Without OAuth it just names the realm.
  const challenge = (error?: "invalid_token") => {
    const parts = ['realm="noctis-mcp"'];
    if (error) parts.push(`error="${error}"`);
    if (urls) parts.push(`resource_metadata="${metadataUrls(urls).protectedResource}"`);
    return `Bearer ${parts.join(", ")}`;
  };

  fastify.post("/", async (request, reply) => {
    const presented = bearerFrom(request.headers.authorization);
    const boundUserId = await resolveMcpUserId();
    if (!boundUserId) {
      request.log.error(userId ? "MCP_USER_ID does not match any Noctis account" : "MCP_USER_EMAIL does not match any Noctis account");
      return reply.code(500).send({ error: "MCP user not found" });
    }

    let canWrite = true;
    const client = matchToken(presented, tokens);
    let clientName = client ?? "unknown";
    if (client) {
      request.log.info({ mcpClient: client }, "MCP call");
    } else {
      const check = urls ? await checkAccessToken(presented) : ({ status: "unknown" } as const);
      // Expired or revoked tokens were ours once: the client should refresh, it isn't guessing.
      if (check.status === "expired") {
        return reply.code(401).header("WWW-Authenticate", challenge("invalid_token")).send({ error: "Token expired or revoked" });
      }
      // A connection approved before MCP_USER_ID changed must not follow it to another account.
      if (check.status !== "valid" || check.userId !== boundUserId) {
        // No header at all is a client asking how to sign in, not a guess.
        const retryAfter = presented ? await recordMcpFailure(request) : null;
        if (retryAfter !== null) {
          return reply.code(429).header("Retry-After", String(retryAfter)).send({ error: "Too many requests", retryAfter });
        }
        return reply.code(401).header("WWW-Authenticate", challenge(presented ? "invalid_token" : undefined)).send({ error: "Unauthorized" });
      }
      canWrite = check.scopes.has(SCOPE_WRITE);
      clientName = `oauth:${check.grantId}`;
      request.log.info({ mcpClient: `oauth:${check.grantId}`, canWrite }, "MCP call");
    }

    const server = buildMcpServer(boundUserId, { redis: fastify.redis, canWrite, client: clientName });
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });

    // The transport writes the response itself, so Fastify must step aside.
    reply.hijack();
    reply.raw.on("close", () => {
      void transport.close();
      void server.close();
    });

    try {
      await server.connect(transport);
      await transport.handleRequest(request.raw, reply.raw, request.body);
    } catch (error) {
      request.log.error(error, "MCP request failed");
      if (!reply.raw.headersSent) {
        reply.raw.writeHead(500, { "content-type": "application/json" });
        reply.raw.end(JSON.stringify({ jsonrpc: "2.0", error: { code: -32603, message: "Internal error" }, id: null }));
      }
    }
  });

  // Stateless server: no SSE stream to open and no session to end.
  const notAllowed = async (_request: unknown, reply: FastifyReply) =>
    reply
      .code(405)
      .header("Allow", "POST")
      .send({ jsonrpc: "2.0", error: { code: -32000, message: "Method not allowed" }, id: null });
  fastify.get("/", notAllowed);
  fastify.delete("/", notAllowed);
};
