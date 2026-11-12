import type { FastifyInstance, FastifyPluginAsync, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { ipRateLimit } from "../auth/auth.rateLimit";
import { resolveMcpUserId } from "../mcp/mcp.user";
import { SUPPORTED_SCOPES } from "./oauth.core";
import * as oauthService from "./oauth.service";
import { OAuthError } from "./oauth.service";
import { metadataUrls, oauthUrls } from "./oauth.urls";
import type { OAuthUrls } from "./oauth.urls";

const REGISTER_LIMIT = { name: "oauth-register", max: 10, windowSeconds: 60 * 60 };
const TOKEN_LIMIT = { name: "oauth-token", max: 30, windowSeconds: 60 };

/** Bodies of /oauth/token and /oauth/revoke are form-encoded (RFC 6749); Fastify has no parser for it. */
function addFormParser(fastify: FastifyInstance): void {
  fastify.addContentTypeParser("application/x-www-form-urlencoded", { parseAs: "string", bodyLimit: 16 * 1024 }, (_request, body, done) => {
    done(null, Object.fromEntries(new URLSearchParams(body as string)));
  });
}

function stringFields(body: unknown): Record<string, string> {
  if (typeof body !== "object" || body === null) return {};
  return Object.fromEntries(Object.entries(body).filter((entry): entry is [string, string] => typeof entry[1] === "string"));
}

function sendOAuthError(reply: FastifyReply, error: unknown): FastifyReply {
  if (error instanceof OAuthError) {
    return reply.code(error.status).header("Cache-Control", "no-store").send({ error: error.code, error_description: error.message });
  }
  throw error;
}

const authorizeQuery = z.object({
  response_type: z.string().optional(),
  client_id: z.string().max(100).optional(),
  redirect_uri: z.string().max(2000).optional(),
  scope: z.string().max(200).optional(),
  state: z.string().max(1000).optional(),
  code_challenge: z.string().max(200).optional(),
  code_challenge_method: z.string().max(20).optional(),
  resource: z.string().max(2000).optional(),
});

const decision = z.object({
  request: authorizeQuery,
  approve: z.boolean(),
  scopes: z.array(z.enum(SUPPORTED_SCOPES)).max(SUPPORTED_SCOPES.length).optional(),
});

/** Metadata, registration, token and revocation — public, called by MCP clients. */
function publicRoutes(fastify: FastifyInstance, urls: OAuthUrls): void {
  const { protectedResource } = metadataUrls(urls);

  // RFC 9728. Clients try the path-suffixed form first (…/oauth-protected-resource/mcp).
  const resourceMetadata = async () => ({
    resource: urls.mcp,
    authorization_servers: [urls.api],
    scopes_supported: [...SUPPORTED_SCOPES],
    bearer_methods_supported: ["header"],
    resource_name: "Noctis",
  });
  fastify.get("/.well-known/oauth-protected-resource", resourceMetadata);
  fastify.get("/.well-known/oauth-protected-resource/mcp", resourceMetadata);

  // RFC 8414.
  fastify.get("/.well-known/oauth-authorization-server", async () => ({
    issuer: urls.api,
    authorization_endpoint: `${urls.web}/oauth/authorize`,
    token_endpoint: `${urls.api}/oauth/token`,
    registration_endpoint: `${urls.api}/oauth/register`,
    revocation_endpoint: `${urls.api}/oauth/revoke`,
    scopes_supported: [...SUPPORTED_SCOPES],
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code", "refresh_token"],
    code_challenge_methods_supported: ["S256"],
    token_endpoint_auth_methods_supported: ["none"],
    revocation_endpoint_auth_methods_supported: ["none"],
  }));

  fastify.post("/oauth/register", { preHandler: ipRateLimit(REGISTER_LIMIT) }, async (request, reply) => {
    try {
      const client = await oauthService.registerClient((request.body ?? {}) as oauthService.RegistrationInput);
      request.log.info({ clientId: client.client_id, clientName: client.client_name }, "OAuth client registered");
      return reply.code(201).header("Cache-Control", "no-store").send(client);
    } catch (error) {
      return sendOAuthError(reply, error);
    }
  });

  fastify.post("/oauth/token", { preHandler: ipRateLimit(TOKEN_LIMIT) }, async (request, reply) => {
    try {
      const tokens = await oauthService.exchangeToken(stringFields(request.body), urls.mcp);
      return reply.header("Cache-Control", "no-store").header("Pragma", "no-cache").send(tokens);
    } catch (error) {
      return sendOAuthError(reply, error);
    }
  });

  // RFC 7009: always 200, whether or not the token was ours.
  fastify.post("/oauth/revoke", { preHandler: ipRateLimit(TOKEN_LIMIT) }, async (request, reply) => {
    await oauthService.revoke(stringFields(request.body).token);
    return reply.header("Cache-Control", "no-store").send({});
  });

  fastify.log.info({ resourceMetadata: protectedResource }, "OAuth for MCP enabled");
}

/** The consent screen and Connected apps list — the web app calls these with the session cookie. */
async function accountRoutes(fastify: FastifyInstance, urls: OAuthUrls): Promise<void> {
  fastify.addHook("preHandler", fastify.authenticate);

  /** Only the account the MCP endpoint serves may hand out access to it. */
  async function ensureMcpUser(request: FastifyRequest, reply: FastifyReply): Promise<boolean> {
    if ((await resolveMcpUserId()) === request.user.userId) return true;
    await reply.code(403).send({ error: "not_allowed", error_description: "This Noctis account can't connect apps." });
    return false;
  }

  fastify.get("/oauth/authorize/info", async (request, reply) => {
    if (!(await ensureMcpUser(request, reply))) return reply;
    try {
      const validated = await oauthService.validateAuthorizeRequest(authorizeQuery.parse(request.query), urls.mcp);
      return {
        clientName: validated.clientName,
        redirectHost: new URL(validated.redirectUri).host,
        scopes: validated.scopes,
      };
    } catch (error) {
      return sendOAuthError(reply, error);
    }
  });

  fastify.post("/oauth/authorize", async (request, reply) => {
    if (!(await ensureMcpUser(request, reply))) return reply;
    const body = decision.parse(request.body);
    try {
      const validated = await oauthService.validateAuthorizeRequest(body.request, urls.mcp);
      const redirectTo = await oauthService.decide(validated, request.user.userId, body.approve, body.scopes);
      request.log.info({ clientId: validated.clientId, approved: body.approve, scopes: body.scopes }, "OAuth consent");
      return { redirectTo };
    } catch (error) {
      return sendOAuthError(reply, error);
    }
  });

  fastify.get("/oauth/grants", async (request) => oauthService.listConnections(request.user.userId));

  fastify.delete<{ Params: { id: string } }>("/oauth/grants/:id", async (request, reply) => {
    const revoked = await oauthService.revokeConnection(request.params.id, request.user.userId);
    if (!revoked) return reply.code(404).send({ error: "Connection not found" });
    return reply.code(204).send();
  });
}

/**
 * OAuth 2.1 authorization server for the MCP endpoint, so a client can connect by signing in
 * instead of pasting a static token. Needs API_PUBLIC_URL; without it only static tokens work.
 */
export const oauthModule: FastifyPluginAsync = async (fastify) => {
  const urls = oauthUrls();
  if (!urls) {
    fastify.log.info("OAuth for MCP disabled: set API_PUBLIC_URL (and WEB_PUBLIC_URL or WEB_ORIGIN) to enable it");
    return;
  }
  addFormParser(fastify);
  publicRoutes(fastify, urls);
  await fastify.register(async (scoped) => accountRoutes(scoped, urls));
};
