/**
 * Self-check for name resolution — every delete/complete/log intent routes through it,
 * so a wrong match here silently destroys the wrong record.
 * Run from ai/agent: pnpm exec tsx src/tools.check.ts
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolveByName } from "./tools";

const tasks = [{ title: "Buy milk" }, { title: "Buy milk for the cake" }, { title: "Call mum" }];
const name = (task: { title: string }) => task.title;

function expectOk<T>(result: { ok: true; item: T } | { ok: false; message: string }): T {
  assert.equal(result.ok, true, `expected a match, got: ${result.ok ? "" : result.message}`);
  return (result as { ok: true; item: T }).item;
}

function expectFail(result: { ok: boolean; message?: string }): string {
  assert.equal(result.ok, false, "expected no match");
  return result.message as string;
}

// Exact match wins even when it is also a prefix of a longer title.
assert.equal(expectOk(resolveByName(tasks, name, "Buy milk", "task")).title, "Buy milk");
assert.equal(expectOk(resolveByName(tasks, name, "  bUy MILK  ", "task")).title, "Buy milk", "trimmed, case-insensitive");

// A unique substring is enough.
assert.equal(expectOk(resolveByName(tasks, name, "cake", "task")).title, "Buy milk for the cake");
assert.equal(expectOk(resolveByName(tasks, name, "mum", "task")).title, "Call mum");

// Ambiguity asks instead of guessing — this is the case that would delete the wrong row.
const ambiguous = expectFail(resolveByName(tasks, name, "buy", "task"));
assert.match(ambiguous, /More than one task/);
assert.match(ambiguous, /Buy milk, Buy milk for the cake/);

// Two records with the identical name are ambiguous, not a silent first-wins.
const twins = [{ title: "Groceries" }, { title: "Groceries" }];
assert.match(expectFail(resolveByName(twins, name, "Groceries", "task")), /More than one/);

// Misses and blanks are reported, never matched.
assert.match(expectFail(resolveByName(tasks, name, "dentist", "task")), /couldn't find a task matching "dentist"/);
assert.match(expectFail(resolveByName(tasks, name, "   ", "habit")), /Which habit did you mean\?/);
assert.match(expectFail(resolveByName([], name, "anything", "task")), /couldn't find/);

// Deletes must only ever be proposed — the client confirms them through the REST endpoints.
// Reading the source is the cheap way to assert this without standing up a database.
const source = readFileSync(new URL("./tools.ts", import.meta.url), "utf8");

for (const fn of ["deleteTask", "deleteHabit", "deleteTransaction", "deleteCategory"]) {
  const start = source.indexOf(`export async function ${fn}(`);
  assert.notEqual(start, -1, `${fn} is gone`);
  const body = source.slice(start, source.indexOf("\nexport ", start + 1));

  assert.match(body, /pendingDelete: \{/, `${fn} must propose a delete`);
  assert.doesNotMatch(body, /db\.\w+\.delete|db\.\$transaction/, `${fn} must not delete anything itself`);
}

console.log("tools: all checks passed");
