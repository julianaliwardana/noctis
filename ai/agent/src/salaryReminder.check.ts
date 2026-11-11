/**
 * Self-check for the "has your salary arrived?" nudge.
 * Run from ai/agent: pnpm exec tsx src/salaryReminder.check.ts
 */
import assert from "node:assert/strict";
import { currentSalaryCycle } from "@noctis/utils";
import { salaryReminder } from "./salaryReminder";

const october = [new Date("2026-10-27T03:00:00Z")];

assert.equal(salaryReminder(currentSalaryCycle(october, 27, new Date("2026-11-20T14:00:00Z")), 13_000_000), null, "mid-cycle: quiet");

const today = salaryReminder(currentSalaryCycle(october, 27, new Date("2026-11-27T14:00:00Z")), 13_000_000);
assert.equal(today?.title, "Has your salary arrived?");
assert.match(today?.message ?? "", /^Payday is today\./);
assert.match(today?.message ?? "", /usually Rp\s?13\.000\.000/);

const late = salaryReminder(currentSalaryCycle(october, 27, new Date("2026-11-29T14:00:00Z")), null);
assert.match(late?.message ?? "", /^Salary was expected 27 Nov, 2 days ago\./);
assert.doesNotMatch(late?.message ?? "", /usually/, "no amount when no income is set");

const logged = [...october, new Date("2026-11-28T03:00:00Z")];
assert.equal(salaryReminder(currentSalaryCycle(logged, 27, new Date("2026-11-29T14:00:00Z")), 13_000_000), null, "logged: quiet");

assert.equal(salaryReminder(currentSalaryCycle([], 27, new Date("2026-11-27T14:00:00Z")), 13_000_000), null, "never logged: no nagging");

console.log("salaryReminder: all checks passed");
