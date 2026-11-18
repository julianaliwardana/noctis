/**
 * Self-check for the rule-based reminders.
 * Run from ai/agent: TZ=Asia/Jakarta pnpm exec tsx src/reminders.check.ts
 */
import assert from "node:assert/strict";
import { billingDate, habitsLeftReminder, hasDueTime, paymentsReminder, taskDueSoonReminder, tasksTodayReminder } from "./reminders";

assert.equal(hasDueTime(new Date(2026, 10, 18, 0, 0)), false, "midnight = no time picked");
assert.equal(hasDueTime(new Date(2026, 10, 18, 14, 30)), true);

assert.equal(billingDate(31, new Date(2026, 1, 10)).getDate(), 28, "clamped to February's last day");
assert.equal(billingDate(15, new Date(2026, 10, 1)).getDate(), 15);

assert.equal(taskDueSoonReminder("Send invoice", new Date(2026, 10, 18, 9, 5)).title, "Due at 09:05: Send invoice");

assert.equal(tasksTodayReminder([], 0), null);
assert.deepEqual(tasksTodayReminder(["A"], 0), { shouldNudge: true, title: "1 task due today", message: "A.", type: "task" });
assert.equal(tasksTodayReminder(["A", "B", "C", "D"], 2)?.message, "A, B, C and 1 more. 2 overdue tasks still open.");
assert.equal(tasksTodayReminder([], 1)?.title, "1 overdue task");

assert.equal(paymentsReminder([]), null);
const one = paymentsReminder([{ name: "Netflix", amount: 187000, today: false }]);
assert.equal(one?.title, "Upcoming payment: Netflix");
assert.match(one?.message ?? "", /^Netflix .*187.* tomorrow\. Make sure/);
const two = paymentsReminder([
  { name: "Netflix", amount: 187000, today: true },
  { name: "YouTube Premium", amount: 59000, today: false },
]);
assert.equal(two?.title, "2 payments coming up");
assert.match(two?.message ?? "", /in total\./);

assert.equal(habitsLeftReminder([]), null);
assert.equal(habitsLeftReminder(["Read"])?.title, "Habit left today: Read");
assert.equal(habitsLeftReminder(["Read", "Run"])?.message, "Read, Run. Still time to keep the streaks going.");

console.log("reminders: all checks passed");
