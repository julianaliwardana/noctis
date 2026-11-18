/**
 * Self-check for the OAuth building blocks.
 * Run from apps/api: pnpm exec tsx src/modules/oauth/oauth.core.check.ts
 */
import assert from "node:assert/strict";
import { createHash, randomBytes } from "node:crypto";
import {
  isAllowedRedirectUri,
  isClientAuthMethod,
  parseBasicAuth,
  secretMatches,
  sha256,
  isValidChallenge,
  mintToken,
  normalizeScopes,
  parseScope,
  pkceMatches,
  redirectUriMatches,
  redirectWith,
  resourceMatches,
} from "./oauth.core";

// PKCE, with the RFC 7636 appendix B example.
const verifier = "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk";
const challenge = "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM";
assert.equal(pkceMatches(verifier, challenge), true);
assert.equal(pkceMatches(verifier.slice(0, -1) + "l", challenge), false);
assert.equal(pkceMatches("short", challenge), false, "verifier under 43 characters");
assert.equal(pkceMatches(verifier + "!", challenge), false, "character outside the unreserved set");
const ownVerifier = randomBytes(32).toString("base64url");
assert.equal(pkceMatches(ownVerifier, createHash("sha256").update(ownVerifier).digest("base64url")), true);
assert.equal(isValidChallenge(challenge), true);
assert.equal(isValidChallenge("plain-text-challenge"), false);

// Tokens are long, prefixed and never repeat.
const token = mintToken("nat");
assert.match(token, /^nat_[A-Za-z0-9_-]{43}$/);
assert.notEqual(mintToken("nat"), token);

// Client authentication (Claude.ai registers with client_secret_post).
assert.ok(isClientAuthMethod("none"));
assert.ok(isClientAuthMethod("client_secret_post"));
assert.ok(isClientAuthMethod("client_secret_basic"));
assert.ok(!isClientAuthMethod("private_key_jwt"));
const basic = (raw: string) => `Basic ${Buffer.from(raw).toString("base64")}`;
assert.deepEqual(parseBasicAuth(basic("noctis_abc:s3cret")), { clientId: "noctis_abc", clientSecret: "s3cret" });
assert.deepEqual(parseBasicAuth(basic("id:a%3Ab+c")), { clientId: "id", clientSecret: "a:b c" }, "form-url-encoded parts");
assert.equal(parseBasicAuth(basic("no-colon")), null);
assert.equal(parseBasicAuth("Bearer abc"), null);
assert.equal(parseBasicAuth(undefined), null);
const secret = mintToken("ncs");
assert.ok(secretMatches(secret, sha256(secret)));
assert.ok(!secretMatches(`${secret}x`, sha256(secret)));
assert.ok(!secretMatches(secret, "not-hex"));

// Redirect URIs.
assert.equal(isAllowedRedirectUri("https://claude.ai/api/mcp/auth_callback"), true);
assert.equal(isAllowedRedirectUri("http://localhost:53123/callback"), true, "native app on loopback");
assert.equal(isAllowedRedirectUri("http://127.0.0.1:9000/cb"), true);
assert.equal(isAllowedRedirectUri("http://evil.example/callback"), false, "plain http off the machine");
assert.equal(isAllowedRedirectUri("https://claude.ai/cb#frag"), false);
assert.equal(isAllowedRedirectUri("https://user:pw@claude.ai/cb"), false);
assert.equal(isAllowedRedirectUri("javascript:alert(1)"), false);
assert.equal(isAllowedRedirectUri("not a url"), false);

const registered = ["https://claude.ai/api/mcp/auth_callback", "http://localhost:53123/callback"];
assert.equal(redirectUriMatches(registered, "https://claude.ai/api/mcp/auth_callback"), true);
assert.equal(redirectUriMatches(registered, "https://claude.ai/api/mcp/auth_callback?x=1"), false, "https must match exactly");
assert.equal(redirectUriMatches(registered, "http://localhost:61000/callback"), true, "loopback port may change");
assert.equal(redirectUriMatches(registered, "http://localhost:61000/other"), false, "but not the path");
assert.equal(redirectUriMatches(registered, "http://127.0.0.1:53123/callback"), false, "nor the host");

// Scopes.
assert.deepEqual(parseScope(undefined), ["noctis:read", "noctis:write"], "nothing asked: everything");
assert.deepEqual(parseScope("noctis:read"), ["noctis:read"]);
assert.deepEqual(parseScope("openid noctis:write noctis:write"), ["noctis:write"], "unknown dropped, duplicates removed");
assert.equal(parseScope("openid profile"), null, "nothing we know");
assert.deepEqual(normalizeScopes(["noctis:write"]), ["noctis:read", "noctis:write"], "write implies read");
assert.deepEqual(normalizeScopes(["noctis:read"]), ["noctis:read"]);

// Resource indicators.
const mcp = "https://noctis-api.julianwardana.dev/mcp";
assert.equal(resourceMatches(undefined, mcp), true);
assert.equal(resourceMatches("https://noctis-api.julianwardana.dev/mcp/", mcp), true);
assert.equal(resourceMatches("https://noctis-api.julianwardana.dev", mcp), true, "origin alone");
assert.equal(resourceMatches("https://evil.example/mcp", mcp), false);
assert.equal(resourceMatches("https://noctis-api.julianwardana.dev/other", mcp), false);

assert.equal(
  redirectWith("https://claude.ai/cb?keep=1", { code: "abc", state: "s t", error: undefined }),
  "https://claude.ai/cb?keep=1&code=abc&state=s+t",
);

console.log("oauth.core: all checks passed");
