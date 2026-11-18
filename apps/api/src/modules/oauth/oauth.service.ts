import * as oauthRepository from "./oauth.repository";
import {
  ACCESS_TOKEN_SECONDS,
  CODE_SECONDS,
  REFRESH_REUSE_GRACE_SECONDS,
  REFRESH_TOKEN_SECONDS,
  isAllowedRedirectUri,
  isValidChallenge,
  mintClientId,
  mintToken,
  normalizeScopes,
  parseScope,
  pkceMatches,
  redirectUriMatches,
  redirectWith,
  resourceMatches,
  sha256,
} from "./oauth.core";

/** OAuth error codes travel as `{ error, error_description }` with a 400 or 401. */
export class OAuthError extends Error {
  constructor(
    public readonly code: string,
    description: string,
    public readonly status = 400,
  ) {
    super(description);
  }
}

// Registration (RFC 7591)

export interface RegistrationInput {
  client_name?: unknown;
  redirect_uris?: unknown;
  grant_types?: unknown;
  response_types?: unknown;
  token_endpoint_auth_method?: unknown;
}

const MAX_REDIRECT_URIS = 5;

export async function registerClient(input: RegistrationInput) {
  const uris = input.redirect_uris;
  if (!Array.isArray(uris) || uris.length === 0 || uris.length > MAX_REDIRECT_URIS || !uris.every((uri) => typeof uri === "string")) {
    throw new OAuthError("invalid_redirect_uri", `redirect_uris must list 1 to ${MAX_REDIRECT_URIS} URLs`);
  }
  const bad = uris.find((uri) => !isAllowedRedirectUri(uri));
  if (bad) throw new OAuthError("invalid_redirect_uri", `Not allowed as a redirect URI: ${bad}`);

  const method = input.token_endpoint_auth_method ?? "none";
  if (method !== "none") throw new OAuthError("invalid_client_metadata", "Only public clients (token_endpoint_auth_method none, with PKCE) are supported");

  const grantTypes = Array.isArray(input.grant_types) ? input.grant_types : ["authorization_code", "refresh_token"];
  if (!grantTypes.every((type) => type === "authorization_code" || type === "refresh_token")) {
    throw new OAuthError("invalid_client_metadata", "Supported grant types: authorization_code, refresh_token");
  }

  const rawName = typeof input.client_name === "string" ? input.client_name.trim() : "";
  const client = await oauthRepository.createClient({
    id: mintClientId(),
    name: (rawName || "MCP client").slice(0, 100),
    redirectUris: uris as string[],
  });

  return {
    client_id: client.id,
    client_id_issued_at: Math.floor(client.createdAt.getTime() / 1000),
    client_name: client.name,
    redirect_uris: client.redirectUris,
    grant_types: ["authorization_code", "refresh_token"],
    response_types: ["code"],
    token_endpoint_auth_method: "none",
  };
}

// Authorization request

export interface AuthorizeParams {
  response_type?: string;
  client_id?: string;
  redirect_uri?: string;
  scope?: string;
  state?: string;
  code_challenge?: string;
  code_challenge_method?: string;
  resource?: string;
}

export interface ValidatedRequest {
  clientId: string;
  clientName: string;
  redirectUri: string;
  scopes: string[];
  state: string | undefined;
  codeChallenge: string;
  resource: string | null;
}

/** Validates an authorization request. Errors render on the page, never redirect: an unverified redirect_uri would be an open redirect. */
export async function validateAuthorizeRequest(params: AuthorizeParams, mcpUrl: string): Promise<ValidatedRequest> {
  const client = params.client_id ? await oauthRepository.findClient(params.client_id) : null;
  if (!client) throw new OAuthError("invalid_client", "This app isn't registered with Noctis. Start the connection again from the app.");
  if (!params.redirect_uri || !redirectUriMatches(client.redirectUris, params.redirect_uri)) {
    throw new OAuthError("invalid_request", "The app asked to return to an address it didn't register.");
  }
  if (params.response_type !== "code") throw new OAuthError("unsupported_response_type", "Only the authorization code flow is supported.");
  if (params.code_challenge_method !== "S256" || !params.code_challenge || !isValidChallenge(params.code_challenge)) {
    throw new OAuthError("invalid_request", "The app must use PKCE with S256.");
  }
  const scopes = parseScope(params.scope);
  if (!scopes) throw new OAuthError("invalid_scope", `Unknown scope. Noctis offers: noctis:read, noctis:write.`);
  if (!resourceMatches(params.resource, mcpUrl)) throw new OAuthError("invalid_target", "The app asked for access to a different server.");

  return {
    clientId: client.id,
    clientName: client.name,
    redirectUri: params.redirect_uri,
    scopes: normalizeScopes(scopes),
    state: params.state,
    codeChallenge: params.code_challenge,
    resource: params.resource ?? null,
  };
}

/** The consent decision. Returns where to send the browser: back to the app with a code, or with access_denied. */
export async function decide(
  request: ValidatedRequest,
  userId: string,
  approved: boolean,
  grantedScopes: string[] | undefined,
): Promise<string> {
  if (!approved) return redirectWith(request.redirectUri, { error: "access_denied", state: request.state });

  // The user can narrow what the app asked for, never widen it.
  const scopes = normalizeScopes((grantedScopes ?? request.scopes).filter((scope) => request.scopes.includes(scope)));
  if (scopes.length === 0) return redirectWith(request.redirectUri, { error: "access_denied", state: request.state });

  const code = mintToken("nac");
  await oauthRepository.createCode({
    codeHash: sha256(code),
    clientId: request.clientId,
    userId,
    redirectUri: request.redirectUri,
    scope: scopes.join(" "),
    codeChallenge: request.codeChallenge,
    resource: request.resource,
    expiresAt: new Date(Date.now() + CODE_SECONDS * 1000),
  });
  return redirectWith(request.redirectUri, { code, state: request.state });
}

// Token endpoint

export interface TokenResponse {
  access_token: string;
  token_type: "Bearer";
  expires_in: number;
  refresh_token: string;
  scope: string;
}

async function issuePair(grantId: string, scope: string): Promise<TokenResponse> {
  const access = mintToken("nat");
  const refresh = mintToken("nrt");
  const now = Date.now();
  await oauthRepository.createToken({ tokenHash: sha256(access), kind: "access", grantId, expiresAt: new Date(now + ACCESS_TOKEN_SECONDS * 1000) });
  await oauthRepository.createToken({ tokenHash: sha256(refresh), kind: "refresh", grantId, expiresAt: new Date(now + REFRESH_TOKEN_SECONDS * 1000) });
  return { access_token: access, token_type: "Bearer", expires_in: ACCESS_TOKEN_SECONDS, refresh_token: refresh, scope };
}

export interface TokenParams {
  grant_type?: string;
  code?: string;
  redirect_uri?: string;
  client_id?: string;
  code_verifier?: string;
  refresh_token?: string;
  scope?: string;
  resource?: string;
}

const invalidGrant = (why: string) => new OAuthError("invalid_grant", why);

export async function exchangeToken(params: TokenParams, mcpUrl: string): Promise<TokenResponse> {
  if (!params.client_id || !(await oauthRepository.findClient(params.client_id))) {
    throw new OAuthError("invalid_client", "Unknown client_id", 401);
  }
  if (!resourceMatches(params.resource, mcpUrl)) throw new OAuthError("invalid_target", "Tokens are only issued for this server's MCP endpoint");
  if (params.grant_type === "authorization_code") return exchangeCode(params);
  if (params.grant_type === "refresh_token") return refresh(params);
  throw new OAuthError("unsupported_grant_type", "Use authorization_code or refresh_token");
}

async function exchangeCode(params: TokenParams): Promise<TokenResponse> {
  if (!params.code || !params.code_verifier || !params.redirect_uri) throw new OAuthError("invalid_request", "code, code_verifier and redirect_uri are required");

  const code = await oauthRepository.findCodeByHash(sha256(params.code));
  if (!code) throw invalidGrant("Unknown code");

  // A code presented twice was intercepted: whatever it already produced is cut off too.
  if (code.usedAt) {
    if (code.grantId) await oauthRepository.revokeGrant(code.grantId);
    throw invalidGrant("Code already used");
  }
  if (code.expiresAt.getTime() < Date.now()) throw invalidGrant("Code expired");
  if (code.clientId !== params.client_id) throw invalidGrant("Code was issued to another client");
  if (code.redirectUri !== params.redirect_uri) throw invalidGrant("redirect_uri does not match the authorization request");
  if (!pkceMatches(params.code_verifier, code.codeChallenge)) throw invalidGrant("PKCE verification failed");
  if (!(await oauthRepository.claimCode(code.id))) throw invalidGrant("Code already used");

  const grant = await oauthRepository.createGrant({ clientId: code.clientId, userId: code.userId, scope: code.scope, resource: code.resource });
  await oauthRepository.attachGrantToCode(code.id, grant.id);
  return issuePair(grant.id, grant.scope);
}

async function refresh(params: TokenParams): Promise<TokenResponse> {
  if (!params.refresh_token) throw new OAuthError("invalid_request", "refresh_token is required");

  const token = await oauthRepository.findTokenByHash(sha256(params.refresh_token));
  if (!token || token.kind !== "refresh") throw invalidGrant("Unknown refresh token");
  if (token.grant.clientId !== params.client_id) throw invalidGrant("Refresh token was issued to another client");
  if (token.grant.revokedAt) throw invalidGrant("This connection was revoked");
  if (token.expiresAt.getTime() < Date.now()) throw invalidGrant("Refresh token expired");

  if (token.revokedAt) {
    const sinceRotation = (Date.now() - token.revokedAt.getTime()) / 1000;
    // Two runs refreshing at once: hand the latecomer its own pair rather than cutting the app off.
    if (sinceRotation > REFRESH_REUSE_GRACE_SECONDS) {
      await oauthRepository.revokeGrant(token.grantId);
      throw invalidGrant("Refresh token reused; the connection has been revoked");
    }
  } else {
    await oauthRepository.revokeToken(token.id);
  }

  // Scope lives on the grant, so a refresh can't widen it.
  const granted = token.grant.scope.split(" ");
  const asked = params.scope ? parseScope(params.scope) : granted;
  if (!asked || asked.some((scope) => !granted.includes(scope))) throw new OAuthError("invalid_scope", "Can't widen the scope on refresh");

  return issuePair(token.grantId, token.grant.scope);
}

/** RFC 7009: revoking either token of a connection ends the whole connection. Unknown tokens are fine. */
export async function revoke(tokenValue: string | undefined): Promise<void> {
  if (!tokenValue) return;
  const token = await oauthRepository.findTokenByHash(sha256(tokenValue));
  if (token) await oauthRepository.revokeGrant(token.grantId);
}

// Access token check (MCP endpoint)

export type AccessCheck =
  | { status: "valid"; userId: string; scopes: Set<string>; grantId: string }
  /** One of ours, but expired or revoked: the client should refresh or reconnect. */
  | { status: "expired" }
  | { status: "unknown" };

const TOUCH_EVERY_MS = 5 * 60 * 1000;

export async function checkAccessToken(value: string | undefined): Promise<AccessCheck> {
  if (!value || !value.startsWith("nat_")) return { status: "unknown" };
  const token = await oauthRepository.findTokenByHash(sha256(value));
  if (!token || token.kind !== "access") return { status: "unknown" };
  if (token.revokedAt || token.grant.revokedAt || token.expiresAt.getTime() < Date.now()) return { status: "expired" };

  const last = token.grant.lastUsedAt?.getTime() ?? 0;
  if (Date.now() - last > TOUCH_EVERY_MS) void oauthRepository.touchGrant(token.grantId).catch(() => undefined);

  return { status: "valid", userId: token.grant.userId, scopes: new Set(token.grant.scope.split(" ").filter(Boolean)), grantId: token.grantId };
}

// Connected apps (profile page)

export async function listConnections(userId: string) {
  const grants = await oauthRepository.findActiveGrants(userId);
  return grants.map((grant) => ({
    id: grant.id,
    clientName: grant.client.name,
    scopes: grant.scope.split(" ").filter(Boolean),
    createdAt: grant.createdAt.toISOString(),
    lastUsedAt: grant.lastUsedAt?.toISOString() ?? null,
  }));
}

export async function revokeConnection(id: string, userId: string): Promise<boolean> {
  const grant = await oauthRepository.findGrant(id, userId);
  if (!grant) return false;
  await oauthRepository.revokeGrant(grant.id);
  return true;
}
