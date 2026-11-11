/**
 * Self-check for the money rules: month boundaries, what counts as spend, when a budget
 * alerts, what is recurring, and what a subscription owes. A wrong answer here is a wrong
 * number on a budget or a push that never fires.
 * Run from apps/api: pnpm exec tsx src/modules/finance/finance.insights.check.ts
 */
import assert from "node:assert/strict";
import {
  alertDue,
  budgetStatus,
  categorySpend,
  dayKey,
  dayRange,
  findRecurring,
  lastMonthsRange,
  monthKey,
  monthOverview,
  monthRange,
  spendOf,
  subscriptionStatus,
  summarize,
  transferPerson,
} from "./finance.insights";
import type { InsightRow } from "./finance.insights";

let nextId = 0;
function row(title: string, amount: number, category: string, date: string, type = "expense"): InsightRow {
  nextId += 1;
  return { id: `e${nextId}`, title, amount, category, type, date: new Date(date) };
}

// ── Month boundaries are Jakarta's, not the server's ──
// 00:30 WIB on 1 Nov is still 31 Oct in UTC. It belongs to November.
assert.equal(monthKey(new Date("2026-10-31T17:30:00Z")), "2026-11");
assert.equal(dayKey(new Date("2026-10-31T17:30:00Z")), "2026-11-01");
assert.equal(monthKey(new Date("2026-10-31T16:59:59Z")), "2026-10", "23:59 WIB on 31 Oct stays in October");

const november = monthRange(2026, 11);
assert.equal(november.start.toISOString(), "2026-10-31T17:00:00.000Z");
assert.equal(november.end.toISOString(), "2026-11-30T17:00:00.000Z");
assert.equal(monthRange(2026, 12).end.toISOString(), "2026-12-31T17:00:00.000Z", "December rolls into January");

const threeMonths = lastMonthsRange(new Date("2026-01-15T05:00:00Z"), 3);
assert.equal(threeMonths.start.toISOString(), "2025-10-31T17:00:00.000Z", "three months back crosses the year");
assert.equal(threeMonths.end.toISOString(), "2026-01-31T17:00:00.000Z");

const week = dayRange("2026-11-02", "2026-11-08");
assert.ok(week);
assert.equal(week.start.toISOString(), "2026-11-01T17:00:00.000Z");
assert.equal(week.end.toISOString(), "2026-11-08T17:00:00.000Z", "the last day is included");
assert.equal(dayRange("2026-11-08", "2026-11-02"), null, "backwards range");
assert.equal(dayRange("2026-02-30", "2026-03-01"), null, "30 Feb is not a date");
assert.equal(dayRange("11/02/2026", "2026-11-08"), null);
assert.ok(dayRange("2026-11-08", "2026-11-08"), "a single day is a valid range");

// ── What counts as spend ──
assert.equal(spendOf(row("Indomaret", 8900, "Food", "2026-11-09T03:36:24Z")), 8900);
assert.equal(spendOf(row("GoPay top-up", 26000, "Top-up", "2026-11-08T07:41:26Z")), 0, "a wallet top-up is not spend");
assert.equal(spendOf(row("Refund — Grab", 15200, "Transport", "2026-11-10T11:00:00Z", "income")), -15200);
assert.equal(spendOf(row("Salary", 9000000, "Other", "2026-11-01T02:00:00Z", "income")), 0, "income is not negative spend");

const rows = [
  row("Grab", 15200, "Transport", "2026-11-10T10:28:19Z"),
  row("Refund — Grab", 15200, "Transport", "2026-11-10T11:00:00Z", "income"),
  row("Grab", 9200, "Transport", "2026-11-10T11:43:10Z"),
  row("Warteg Ben Jaya", 17000, "Food", "2026-11-10T12:02:36Z"),
  row("GoPay top-up", 26000, "Top-up", "2026-11-08T07:41:26Z"),
  row("Salary", 9000000, "Other", "2026-11-01T02:00:00Z", "income"),
];

const byCategory = summarize(rows, "category");
assert.equal(byCategory.spent, 26200, "15,200 + 9,200 + 17,000 − 15,200 refund; the top-up is left out");
assert.equal(byCategory.refunds, 15200);
assert.equal(byCategory.walletTopUps, 26000);
assert.equal(byCategory.income, 9000000);
assert.deepEqual(
  byCategory.groups.map(({ key, total }) => [key, total]),
  [
    ["Food", 17000],
    ["Transport", 9200],
  ],
  "biggest first, and no Top-up group",
);

const byMerchant = summarize(rows, "merchant");
assert.deepEqual(
  byMerchant.groups.find((group) => group.key === "Grab"),
  { key: "Grab", total: 9200, count: 3 },
  "a refund nets against its merchant",
);

const byDay = summarize(rows, "day");
assert.deepEqual(
  byDay.groups.map((group) => group.key),
  ["2026-11-10"],
  "days are Jakarta days, oldest first",
);

assert.equal(categorySpend(rows, "transport"), 9200, "case-insensitive, refund netted");
assert.equal(categorySpend(rows, "Top-up"), 0);

// ── Budget alerts: once per threshold per month ──
const fresh = { monthlyLimit: 1_000_000, alerted80Month: null, alerted100Month: null };
assert.equal(alertDue(fresh, 799_999, "2026-11"), null);
assert.equal(alertDue(fresh, 800_000, "2026-11"), 80, "exactly 80% alerts");
assert.equal(alertDue(fresh, 1_000_000, "2026-11"), 100, "straight past 100% sends only the 100% push");

const warned = { ...fresh, alerted80Month: "2026-11" };
assert.equal(alertDue(warned, 900_000, "2026-11"), null, "80% already sent this month");
assert.equal(alertDue(warned, 1_200_000, "2026-11"), 100);
assert.equal(alertDue(warned, 900_000, "2026-12"), 80, "a new month re-arms it");

const blown = { ...fresh, alerted80Month: "2026-11", alerted100Month: "2026-11" };
assert.equal(alertDue(blown, 1_500_000, "2026-11"), null);
assert.equal(alertDue({ ...fresh, alerted100Month: "2026-11" }, 850_000, "2026-11"), null, "dropping back under 100% does not re-send 80%");
assert.equal(alertDue({ ...fresh, monthlyLimit: 0 }, 5000, "2026-11"), null, "no limit, no alert");

assert.deepEqual(budgetStatus(1_000_000, 850_000), { limit: 1_000_000, spent: 850_000, remaining: 150_000, percent: 85, state: "warning" });
assert.equal(budgetStatus(1_000_000, 1_000_000).state, "over");
assert.equal(budgetStatus(300_000, 100_000).percent, 33.3);

// ── Month overview ──
const overview = monthOverview(rows, 9_000_000, 2026, 11, new Date("2026-11-11T04:00:00Z"));
assert.equal(overview.spent, 26200);
assert.equal(overview.remaining, 8_973_800);
assert.equal(overview.daysLeft, 20, "11 Nov through 30 Nov, today included");
assert.equal(overview.perDayLeft, 448_690);
assert.equal(monthOverview(rows, null, 2026, 11, new Date("2026-11-11T04:00:00Z")).remaining, null, "no income set");
assert.equal(monthOverview(rows, 9_000_000, 2026, 10, new Date("2026-11-11T04:00:00Z")).daysLeft, 0, "a past month has no days left");
assert.equal(monthOverview([], 9_000_000, 2026, 11, new Date("2026-11-30T16:30:00Z")).daysLeft, 1, "23:30 WIB on the last day");

// ── Transfers: the person, not the remark ──
assert.equal(transferPerson("Transfer to Marzelline Churnia — laundry"), "Marzelline Churnia");
assert.equal(transferPerson("Transfer to Marzelline Churnia"), "Marzelline Churnia");
assert.equal(transferPerson("QRIS transfer to Leyza Zulyansyah"), "Leyza Zulyansyah");
assert.equal(transferPerson("Transfer to Poniri (BNI) — purchase"), "Poniri", "bank suffix dropped");
assert.equal(transferPerson("Transfer to Anne-Marie Putri - kado"), "Anne-Marie Putri", "a hyphen inside a name is not a remark");
assert.equal(transferPerson("Indomaret"), null);
assert.equal(transferPerson("TRAVL Transportasi"), null, "'transfer' must lead the title");

// ── Recurring ──
const history = [
  row("Spotify", 54990, "Subscriptions", "2026-09-05T03:00:00Z"),
  row("Spotify", 54990, "Subscriptions", "2026-10-05T03:00:00Z"),
  row("Spotify", 54990, "Subscriptions", "2026-11-05T03:00:00Z"),
  // Daily commute: same title and amount every month, but far too often to be a subscription.
  ...["2026-10-02", "2026-10-03", "2026-10-04", "2026-11-02", "2026-11-03", "2026-11-04"].map((day) =>
    row("GoPay payment", 9000, "Transport", `${day}T02:30:00Z`),
  ),
  // One month of data only.
  row("Google Play", 18648, "Subscriptions", "2026-11-08T03:53:29Z"),
  row("Google Play", 18648, "Subscriptions", "2026-11-10T12:52:42Z"),
  row("Google Play", 93240, "Subscriptions", "2026-11-08T03:52:29Z"),
  row("GoPay top-up", 100000, "Top-up", "2026-10-12T03:00:00Z"),
  row("GoPay top-up", 100000, "Top-up", "2026-11-12T03:00:00Z"),
];
const recurring = findRecurring(history);
assert.deepEqual(
  recurring.recurring.map(({ title, amount, months }) => [title, amount, months]),
  [["Spotify", 54990, ["2026-09", "2026-10", "2026-11"]]],
  "only the monthly charge; the commute fare and the top-ups are not subscriptions",
);
assert.deepEqual(
  recurring.candidates.map(({ title, amount, duplicateMonths }) => [title, amount, duplicateMonths]),
  [
    ["Google Play", 93240, []],
    ["Google Play", 18648, ["2026-11"]],
  ],
  "Subscriptions-category charges seen in one month are candidates; a repeat inside the month is flagged",
);

// ── Subscriptions ──
const youtube = { name: "YouTube Premium", expectedAmount: 46065, billingDay: 30, matchTitle: null };
const charges = [row("YouTube Premium", 46065, "Subscriptions", "2026-10-30T01:16:59Z")];

const midMonth = subscriptionStatus(youtube, charges, new Date("2026-11-11T04:00:00Z"));
assert.equal(midMonth.status, "upcoming", "October's charge does not pay November");
assert.equal(midMonth.dueDate, "2026-11-30");
assert.equal(midMonth.daysUntilDue, 19);
assert.equal(midMonth.lastCharge?.date, "2026-10-30");

const netflix = { name: "Netflix", expectedAmount: 54000, billingDay: 13, matchTitle: null };
assert.equal(subscriptionStatus(netflix, [], new Date("2026-11-13T04:00:00Z")).status, "due", "due today");
assert.equal(subscriptionStatus(netflix, [], new Date("2026-11-15T04:00:00Z")).status, "due", "two days of grace");
assert.equal(subscriptionStatus(netflix, [], new Date("2026-11-16T04:00:00Z")).status, "missing");

const paid = subscriptionStatus(netflix, [row("Netflix", 65000, "Subscriptions", "2026-11-13T09:00:00Z")], new Date("2026-11-14T04:00:00Z"));
assert.equal(paid.status, "paid");
assert.equal(paid.priceChanged, true, "65,000 against an expected 54,000");
assert.equal(
  subscriptionStatus(netflix, [row("NETFLIX.COM", 54000, "Subscriptions", "2026-11-11T09:00:00Z")], new Date("2026-11-12T04:00:00Z")).status,
  "paid",
  "a charge posted two days early still pays this cycle, matched case-insensitively",
);
assert.equal(
  subscriptionStatus(netflix, [row("Refund — Netflix", 54000, "Subscriptions", "2026-11-13T09:00:00Z", "income")], new Date("2026-11-14T04:00:00Z")).status,
  "due",
  "a refund is not a charge",
);

const endOfMonth = { name: "Gym", expectedAmount: 300000, billingDay: 31, matchTitle: "fitness" };
const february = subscriptionStatus(endOfMonth, [], new Date("2027-02-10T04:00:00Z"));
assert.equal(february.dueDate, "2027-02-28", "day 31 clamps to the month's last day");
assert.equal(
  subscriptionStatus(endOfMonth, [row("Celebrity Fitness", 300000, "Sports", "2027-02-28T03:00:00Z")], new Date("2027-02-28T10:00:00Z")).status,
  "paid",
  "matchTitle overrides the name",
);

console.log("finance.insights: all checks passed");
