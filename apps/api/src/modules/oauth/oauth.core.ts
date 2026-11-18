import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * The pure parts of the OAuth server: scopes, lifetimes, PKCE, redirect-URI rules and token
 * minting. No database, no request — checked by oauth.core.check.ts.
 */

export const SCOPE_READ = "noctis:read";
export const SCOPE_WRITE = "noctis:write";
export const SUPPORTED_SCOPES = [SCOPE_READ, SCOPE_WRITE] as const;

export const ACCESS_TOKEN_SECONDS = 60 * 60;
export const REFRESH_TOKEN_SECONDS = 30 * 24 * 60 * 60;
export const CODE_SECONDS = 10 * 60;
/**
 * A refresh token presented again within this window of being rotated gets a fresh pair instead of
 * revoking the whole grant: two runs of the same app can refresh at once. Later than this, a reused
 * refresh token means it was copied, and the grant is revoked.
 */
export const REFRESH_REUSE_GRACE_SECONDS = 60;

export function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

/** An opaque random token with a readable prefix ("nat_" access, "nrt_" refresh, "nac_" code). */
export function mintToken(prefix: "nat" | "nrt" | "nac" | "ncs"): string {
  return `${prefix}_${randomBytes(32).toString("base64url")}`;
}

export function mintClientId(): string {
  return `noctis_${randomBytes(16).toString("hex")}`;
}

/** How a client may authenticate at the token endpoint. PKCE is required for all of them. */
export const CLIENT_AUTH_METHODS = ["none", "client_secret_post", "client_secret_basic"] as const;
export type ClientAuthMethod = (typeof CLIENT_AUTH_METHODS)[number];

export function isClientAuthMethod(value: unknown): value is ClientAuthMethod {
  return CLIENT_AUTH_METHODS.includes(value as ClientAuthMethod);
}

/** Client id and secret from an `Authorization: Basic` header (RFC 6749 §2.3.1: both form-url-encoded). */
export function parseBasicAuth(header: string | undefined): { clientId: string; clientSecret: string } | null {
  const match = header?.match(/^Basic\s+([A-Za-z0-9+/=]+)\s*$/i);
  if (!match) return null;
  const decoded = Buffer.from(match[1] as string, "base64").toString("utf8");
  const colon = decoded.indexOf(":");
  if (colon < 1) return null;
  try {
    const decode = (part: string) => decodeURIComponent(part.replace(/\+/g, " "));
    return { clientId: decode(decoded.slice(0, colon)), clientSecret: decode(decoded.slice(colon + 1)) };
  } catch {
    return null;
  }
}

/** Constant-time check of a presented secret against its stored hash. */
export function secretMatches(secret: string, secretHash: string): boolean {
  const a = Buffer.from(sha256(secret), "hex");
  const b = Buffer.from(secretHash, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

/** PKCE S256: base64url(sha256(verifier)) must equal the challenge sent with the authorization request. */
export function pkceMatches(verifier: string, challenge: string): boolean {
  // RFC 7636: 43-128 characters from the unreserved set.
  if (!/^[A-Za-z0-9\-._~]{43,128}$/.test(verifier)) return false;
  const expected = Buffer.from(createHash("sha256").update(verifier).digest("base64url"));
  const given = Buffer.from(challenge);
  return expected.length === given.length && timingSafeEqual(expected, given);
}

/** A challenge is base64url of 32 bytes: 43 characters. */
export function isValidChallenge(challenge: string): boolean {
  return /^[A-Za-z0-9_-]{43}$/.test(challenge);
}

const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

/**
 * Where an app may receive its code: https anywhere, or plain http on this machine only (native
 * clients like Claude Code listen on a loopback port). No fragments, no credentials in the URL.
 */
export function isAllowedRedirectUri(value: string): boolean {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  if (url.hash || url.username || url.password) return false;
  if (url.protocol === "https:") return true;
  return url.protocol === "http:" && LOOPBACK_HOSTS.has(url.hostname);
}

/**
 * Registered and presented redirect URIs must match exactly — except a loopback URI's port, which
 * native apps pick at run time (RFC 8252 §7.3).
 */
export function redirectUriMatches(registered: string[], presented: string): boolean {
  if (registered.includes(presented)) return true;
  let given: URL;
  try {
    given = new URL(presented);
  } catch {
    return false;
  }
  if (given.protocol !== "http:" || !LOOPBACK_HOSTS.has(given.hostname)) return false;
  return registered.some((uri) => {
    const known = new URL(uri);
    return known.protocol === "http:" && known.hostname === given.hostname && known.pathname === given.pathname && known.search === given.search;
  });
}

/** Requested scopes, filtered to the ones we know. No scope asked for means everything. */
export function parseScope(scope: string | undefined | null): string[] | null {
  const asked = (scope ?? "").split(/\s+/).filter(Boolean);
  if (asked.length === 0) return [...SUPPORTED_SCOPES];
  const known = asked.filter((entry) => (SUPPORTED_SCOPES as readonly string[]).includes(entry));
  return known.length === 0 ? null : [...new Set(known)];
}

/** Write without read makes no sense: a client that may change data may also see it. */
export function normalizeScopes(scopes: string[]): string[] {
  const set = new Set(scopes);
  if (set.has(SCOPE_WRITE)) set.add(SCOPE_READ);
  return SUPPORTED_SCOPES.filter((scope) => set.has(scope));
}

/** The resource (RFC 8707) is accepted when it is the MCP endpoint on this server, trailing slash or not. */
export function resourceMatches(resource: string | undefined | null, mcpUrl: string): boolean {
  if (!resource) return true;
  const trim = (value: string): string => value.replace(/\/+$/, "");
  try {
    const given = new URL(resource);
    const ours = new URL(mcpUrl);
    return given.origin === ours.origin && (trim(given.pathname) === trim(ours.pathname) || trim(given.pathname) === "");
  } catch {
    return false;
  }
}

/** redirect_uri with the result appended, keeping any query it already had. */
export function redirectWith(redirectUri: string, params: Record<string, string | undefined>): string {
  const url = new URL(redirectUri);
  for (const [key, value] of Object.entries(params)) if (value !== undefined) url.searchParams.set(key, value);
  return url.toString();
}
