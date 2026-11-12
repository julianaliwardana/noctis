import { createHash, timingSafeEqual } from "node:crypto";

export function bearerFrom(header: string | undefined): string | undefined {
  const match = header?.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim();
}

/** Hashing first gives both sides the same length, which `timingSafeEqual` requires. */
export function tokenMatches(presented: string | undefined, expected: string): boolean {
  if (!presented) return false;
  const a = createHash("sha256").update(presented).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b);
}

/** Shortest token accepted; `openssl rand -hex 32` gives 64 characters. */
export const MIN_TOKEN_LENGTH = 32;

/**
 * The tokens allowed to call the MCP endpoint, by client name. `MCP_TOKENS` is a comma-separated
 * list of `name:token` pairs (e.g. `claude-ai:<t1>,mac:<t2>`), so one leaked token can be revoked
 * without breaking the other clients. The older single `MCP_TOKEN` still works, as client `default`.
 * Throws on a malformed entry, a duplicate name, or a token under MIN_TOKEN_LENGTH.
 */
export function parseTokens(env: { MCP_TOKEN?: string; MCP_TOKENS?: string }): Map<string, string> {
  const tokens = new Map<string, string>();

  const add = (name: string, token: string): void => {
    if (!/^[a-z0-9][a-z0-9_-]{0,31}$/i.test(name)) throw new Error(`MCP_TOKENS: invalid client name "${name}"`);
    if (tokens.has(name)) throw new Error(`MCP_TOKENS: client "${name}" is listed twice`);
    if (token.length < MIN_TOKEN_LENGTH) throw new Error(`MCP token for "${name}" must be at least ${MIN_TOKEN_LENGTH} characters`);
    tokens.set(name, token);
  };

  for (const entry of (env.MCP_TOKENS ?? "").split(",")) {
    const trimmed = entry.trim();
    if (trimmed === "") continue;
    const separator = trimmed.indexOf(":");
    if (separator <= 0) throw new Error("MCP_TOKENS: each entry must be name:token");
    add(trimmed.slice(0, separator).trim(), trimmed.slice(separator + 1).trim());
  }

  const single = env.MCP_TOKEN?.trim();
  if (single) add("default", single);

  return tokens;
}

/**
 * Name of the client whose token matches, or null. Every token is compared, with no early exit,
 * so the response time doesn't reveal how far down the list a guess got.
 */
export function matchToken(presented: string | undefined, tokens: Map<string, string>): string | null {
  let matched: string | null = null;
  for (const [name, token] of tokens) {
    if (tokenMatches(presented, token) && matched === null) matched = name;
  }
  return matched;
}
