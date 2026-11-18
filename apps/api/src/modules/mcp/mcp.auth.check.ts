/**
 * Self-check for reading the bearer token.
 * Run from apps/api: pnpm exec tsx src/modules/mcp/mcp.auth.check.ts
 */
import assert from "node:assert/strict";
import { bearerFrom } from "./mcp.auth";

const token = "nat_" + "a".repeat(43);
assert.equal(bearerFrom(`Bearer ${token}`), token);
assert.equal(bearerFrom(`bearer   ${token}  `), token, "case-insensitive, trimmed");
assert.equal(bearerFrom(`Basic ${token}`), undefined);
assert.equal(bearerFrom(undefined), undefined);

console.log("mcp.auth: all checks passed");
