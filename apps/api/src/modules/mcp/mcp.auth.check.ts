/**
 * Self-check for MCP token parsing and matching.
 * Run from apps/api: pnpm exec tsx src/modules/mcp/mcp.auth.check.ts
 */
import assert from "node:assert/strict";
import { bearerFrom, matchToken, parseTokens } from "./mcp.auth";

const a = "a".repeat(64);
const b = "b".repeat(64);
const c = "c".repeat(64);

const tokens = parseTokens({ MCP_TOKENS: ` claude-ai:${a} , mac:${b},`, MCP_TOKEN: c });
assert.deepEqual([...tokens.keys()], ["claude-ai", "mac", "default"], "names kept, spaces and a trailing comma ignored");
assert.equal(matchToken(a, tokens), "claude-ai");
assert.equal(matchToken(b, tokens), "mac");
assert.equal(matchToken(c, tokens), "default", "the old single MCP_TOKEN still works");
assert.equal(matchToken("nope", tokens), null);
assert.equal(matchToken(undefined, tokens), null);
assert.equal(matchToken(a.slice(1), tokens), null, "a prefix is not a match");

assert.equal(parseTokens({}).size, 0, "nothing set: endpoint stays off");
assert.equal(parseTokens({ MCP_TOKEN: `  ${a}  ` }).get("default"), a, "the single token is trimmed");

assert.throws(() => parseTokens({ MCP_TOKENS: `mac:${"x".repeat(31)}` }), /at least 32/);
assert.throws(() => parseTokens({ MCP_TOKENS: a }), /name:token/, "missing name");
assert.throws(() => parseTokens({ MCP_TOKENS: `:${a}` }), /name:token/, "empty name");
assert.throws(() => parseTokens({ MCP_TOKENS: `mac:${a},mac:${b}` }), /listed twice/);
assert.throws(() => parseTokens({ MCP_TOKENS: `default:${a}`, MCP_TOKEN: b }), /listed twice/, "default is taken by MCP_TOKEN");
assert.throws(() => parseTokens({ MCP_TOKENS: `my mac:${a}` }), /invalid client name/);

// A token may itself contain ':' — only the first one separates the name.
assert.equal(parseTokens({ MCP_TOKENS: `mac:${a}:${b}` }).get("mac"), `${a}:${b}`);

assert.equal(bearerFrom(`Bearer ${a}`), a);
assert.equal(bearerFrom(`bearer   ${a}  `), a);

console.log("mcp.auth: all checks passed");
