import type { FastifyPluginAsync, FastifyReply } from "fastify";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { bearerFrom, tokenMatches } from "./mcp.auth";
import { buildMcpServer } from "./mcp.server";
import { findUserByEmail } from "../auth/auth.service";

/**
 * Remote MCP endpoint for Claude (added as a custom connector with an `Authorization: Bearer`
 * request header). Stateless Streamable HTTP: every POST gets a fresh server and transport,
 * so nothing is kept between calls and any replica can answer.
 */
export const mcpModule: FastifyPluginAsync = async (fastify) => {
  const token = process.env.MCP_TOKEN?.trim();
  // Prefer the account id: it never changes, whereas editing your email on the profile page used to
  // silently break MCP_USER_EMAIL and with it every scheduled import.
  const userId = process.env.MCP_USER_ID?.trim();
  const email = process.env.MCP_USER_EMAIL?.trim();

  if (!token || (!userId && !email)) {
    fastify.log.info("MCP endpoint disabled: set MCP_TOKEN and MCP_USER_ID (or MCP_USER_EMAIL) to enable it");
    return;
  }
  if (token.length < 32) throw new Error("MCP_TOKEN must be at least 32 characters");
  if (!userId) fastify.log.warn("MCP is bound by MCP_USER_EMAIL; set MCP_USER_ID instead so an email change can't break it");

  async function resolveUserId(): Promise<string | null> {
    if (userId) {
      const user = await fastify.db.user.findUnique({ where: { id: userId }, select: { id: true } });
      return user?.id ?? null;
    }
    return (await findUserByEmail(email!))?.id ?? null;
  }

  fastify.post("/", async (request, reply) => {
    if (!tokenMatches(bearerFrom(request.headers.authorization), token)) {
      return reply.code(401).header("WWW-Authenticate", 'Bearer realm="noctis-mcp"').send({ error: "Unauthorized" });
    }

    const boundUserId = await resolveUserId();
    if (!boundUserId) {
      request.log.error(userId ? "MCP_USER_ID does not match any Noctis account" : "MCP_USER_EMAIL does not match any Noctis account");
      return reply.code(500).send({ error: "MCP user not found" });
    }

    const server = buildMcpServer(boundUserId, { redis: fastify.redis });
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
