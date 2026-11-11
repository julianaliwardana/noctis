/**
 * Self-check for the evening "needs a category" reminder wording.
 * Run from ai/agent: pnpm exec tsx src/reviewReminder.check.ts
 */
import assert from "node:assert/strict";
import { reviewReminder } from "./reviewReminder";

assert.equal(reviewReminder([], 0), null, "nothing waiting, no reminder");

assert.deepEqual(reviewReminder(["Transfer to Budi Santoso"], 1), {
  shouldNudge: true,
  title: "1 transaction needs a category",
  message: "Transfer to Budi Santoso.",
  type: "finance",
});

const three = reviewReminder(["A", "B", "C"], 3);
assert.equal(three?.title, "3 transactions need a category");
assert.equal(three?.message, "A, B, C.");

assert.equal(reviewReminder(["A", "B", "C"], 7)?.message, "A, B, C and 4 more.");
assert.equal(reviewReminder(["A", "B", "C", "D"], 4)?.message, "A, B, C and 1 more.", "never lists more than three");

console.log("reviewReminder: all checks passed");
