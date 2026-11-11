/**
 * Self-check for salary-driven pay cycles.
 * Run from packages/utils: pnpm dlx tsx src/salaryCycle.check.ts
 */
import assert from "node:assert/strict";
import { currentSalaryCycle, cycleStarts, expectedPayday } from "./salaryCycle";

const at = (iso: string) => new Date(iso);
const day = (date: Date) => new Date(date.getTime() + 7 * 3600_000).toISOString().slice(0, 10);

// The next payday is a month on, not the same one.
assert.equal(day(expectedPayday(at("2026-10-26T17:00:00Z"), 27)), "2026-11-27", "cycle from 27 Oct expects 27 Nov");
assert.equal(day(expectedPayday(at("2026-11-01T17:00:00Z"), 27)), "2026-11-27", "a late salary on 2 Nov still expects 27 Nov");
assert.equal(day(expectedPayday(at("2026-11-17T17:00:00Z"), 27)), "2026-12-27", "too close: 27 Nov is under two weeks away");
assert.equal(day(expectedPayday(at("2027-01-30T17:00:00Z"), 31)), "2027-02-28", "day 31 clamps to February's end");
assert.equal(day(expectedPayday(at("2026-12-26T17:00:00Z"), 27)), "2027-01-27", "crosses the year");

// A salary near its payday opens a cycle; a bonus mid-cycle does not.
const salaries = [
  at("2026-10-27T03:00:00Z"), // on time
  at("2026-11-10T03:00:00Z"), // bonus filed as salary, mid-cycle
  at("2026-11-30T03:00:00Z"), // three days late
  at("2026-12-23T03:00:00Z"), // four days early: still that payday
];
assert.deepEqual(cycleStarts(salaries, 27).map(day), ["2026-10-27", "2026-11-30", "2026-12-23"]);
assert.deepEqual(cycleStarts([...salaries].reverse(), 27).map(day), ["2026-10-27", "2026-11-30", "2026-12-23"], "order of input doesn't matter");
// 00:30 WIB on the 27th is the 26th in UTC: the cycle still starts on the 27th.
assert.deepEqual(cycleStarts([at("2026-10-26T17:30:00Z")], 27).map(day), ["2026-10-27"]);

// Mid-cycle.
let cycle = currentSalaryCycle([at("2026-10-27T03:00:00Z")], 27, at("2026-11-11T04:00:00Z"));
assert.equal(day(cycle.start), "2026-10-27");
assert.equal(day(cycle.expectedNext), "2026-11-27");
assert.equal(cycle.daysLeft, 16, "11 Nov through 26 Nov");
assert.equal(cycle.salaryDue, false);

// Payday comes, nothing logged: the old cycle keeps running and the salary is due, then late.
cycle = currentSalaryCycle([at("2026-10-27T03:00:00Z")], 27, at("2026-11-27T04:00:00Z"));
assert.equal(day(cycle.start), "2026-10-27");
assert.equal(cycle.salaryDue, true);
assert.equal(cycle.daysLate, 0);
assert.equal(cycle.daysLeft, 0);
cycle = currentSalaryCycle([at("2026-10-27T03:00:00Z")], 27, at("2026-11-30T02:00:00Z"));
assert.equal(cycle.daysLate, 3);
assert.equal(day(cycle.start), "2026-10-27", "still the October cycle");

// The late salary lands: new cycle from that day.
cycle = currentSalaryCycle([at("2026-10-27T03:00:00Z"), at("2026-11-30T03:00:00Z")], 27, at("2026-11-30T09:00:00Z"));
assert.equal(day(cycle.start), "2026-11-30");
assert.equal(day(cycle.expectedNext), "2026-12-27");
assert.equal(cycle.salaryDue, false);

// A salary dated in the future is not counted yet.
cycle = currentSalaryCycle([at("2026-10-27T03:00:00Z"), at("2026-11-27T03:00:00Z")], 27, at("2026-11-20T03:00:00Z"));
assert.equal(day(cycle.start), "2026-10-27");

// Nothing logged ever: fall back to the last expected payday, and don't nag.
cycle = currentSalaryCycle([], 27, at("2026-11-11T04:00:00Z"));
assert.equal(day(cycle.start), "2026-10-27");
assert.equal(cycle.fromSalary, false);
assert.equal(cycle.salaryDue, false);
cycle = currentSalaryCycle([], 27, at("2026-11-27T04:00:00Z"));
assert.equal(day(cycle.start), "2026-11-27", "on payday itself the expected cycle starts");

console.log("salaryCycle: all checks passed");
