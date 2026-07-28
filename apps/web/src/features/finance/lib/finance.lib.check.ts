/**
 * Self-check for the pure finance logic.
 * Run from apps/web: pnpm dlx tsx src/features/finance/lib/finance.lib.check.ts
 */
import assert from "node:assert/strict";
import { format, subMonths } from "date-fns";
import { categoryNames, categoryTotals, colorFor, monthlyCashflow, paletteVar, queryExpenses, sumSigned } from "./finance.lib";
import type { CategoryDto, ExpenseDto } from "../api/finance.api";

let seq = 0;
function ex(partial: Partial<ExpenseDto>): ExpenseDto {
  return {
    id: `e${(seq += 1)}`,
    userId: "u1",
    title: "t",
    amount: 1,
    category: "Other",
    type: "expense",
    date: new Date().toISOString(),
    ...partial,
  };
}

function cat(name: string, color: string): CategoryDto {
  return { id: `c${name}`, userId: "u1", name, color, createdAt: new Date().toISOString() };
}

// categoryNames: server order first, then anything only the transactions know about, deduped.
const catalogue = [cat("Food", "#2a78d6"), cat("Other", "#6b6f76")];
assert.deepEqual(categoryNames(catalogue, [ex({ category: "Pets" }), ex({ category: "Food" })]), [
  "Food",
  "Other",
  "Pets",
]);

// paletteVar: known palette hexes theme via CSS var; anything else passes through.
assert.equal(paletteVar("#2A78D6"), "var(--chart-1)", "case-insensitive lookup");
assert.equal(paletteVar("#123456"), "#123456");
assert.equal(colorFor(catalogue, "Food"), "var(--chart-1)");
assert.equal(colorFor(catalogue, "Pets"), "var(--color-text-muted)", "unknown category falls back to muted");

// monthlyCashflow: fixed-length window, income/expense split, out-of-window rows dropped.
const lastMonth = subMonths(new Date(), 1).toISOString();
const flow = monthlyCashflow([
  ex({ amount: 100, type: "income" }),
  ex({ amount: 30 }),
  ex({ amount: 70, date: lastMonth }),
  ex({ amount: 999, date: subMonths(new Date(), 20).toISOString() }),
]);
assert.equal(flow.length, 6);
assert.deepEqual(flow.at(-1), { label: format(new Date(), "MMM"), income: 100, expense: 30 });
assert.equal(flow.at(-2)?.expense, 70);
assert.equal(flow.reduce((n, p) => n + p.expense, 0), 100, "20-months-ago row is outside the window");

// categoryTotals: expenses only, sorted desc, overflow folded into a single "Other".
const totals = categoryTotals(
  [
    ex({ category: "Food", amount: 50 }),
    ex({ category: "Food", amount: 10 }),
    ex({ category: "Bills", amount: 40 }),
    ex({ category: "Health", amount: 30 }),
    ex({ category: "Pets", amount: 20 }),
    ex({ category: "Gym", amount: 15 }),
    ex({ category: "Books", amount: 5 }),
    ex({ category: "Salary", amount: 9999, type: "income" }),
  ],
  5,
);
assert.equal(totals.length, 6);
assert.deepEqual(totals[0], { category: "Food", total: 60 });
assert.deepEqual(
  totals.map((t) => t.total),
  [60, 40, 30, 20, 15, 5],
  "sorted desc, Books folded into Other",
);
assert.equal(totals.at(-1)?.category, "Other");

// An existing "Other" category absorbs the overflow instead of duplicating.
const merged = categoryTotals(
  [
    ex({ category: "Other", amount: 100 }),
    ex({ category: "A", amount: 9 }),
    ex({ category: "B", amount: 8 }),
    ex({ category: "C", amount: 7 }),
    ex({ category: "D", amount: 6 }),
    ex({ category: "E", amount: 5 }),
  ],
  5,
);
assert.equal(merged.filter((t) => t.category === "Other").length, 1);
assert.equal(merged[0]?.total, 105);

// queryExpenses: filters compose, search covers title + category, sort direction honoured.
const rows = [
  ex({ title: "Coffee", category: "Food", amount: 5, date: "2026-01-02T00:00:00Z" }),
  ex({ title: "Rent", category: "Bills", amount: 900, date: "2026-01-01T00:00:00Z" }),
  ex({ title: "Payday", category: "Bills", amount: 2000, type: "income", date: "2026-01-03T00:00:00Z" }),
];
const base = { search: "", category: "all", type: "all", sort: "date", dir: "desc" } as const;

assert.deepEqual(queryExpenses(rows, base).map((r) => r.title), ["Payday", "Coffee", "Rent"]);
assert.deepEqual(queryExpenses(rows, { ...base, dir: "asc" }).map((r) => r.title), ["Rent", "Coffee", "Payday"]);
assert.deepEqual(queryExpenses(rows, { ...base, sort: "amount" }).map((r) => r.title), ["Payday", "Rent", "Coffee"]);
assert.deepEqual(queryExpenses(rows, { ...base, type: "income" }).map((r) => r.title), ["Payday"]);
assert.deepEqual(queryExpenses(rows, { ...base, category: "Bills", type: "expense" }).map((r) => r.title), ["Rent"]);
assert.deepEqual(queryExpenses(rows, { ...base, search: "  FOO " }).map((r) => r.title), ["Coffee"], "case/space-insensitive category match");
assert.equal(queryExpenses(rows, { ...base, search: "nope" }).length, 0);
assert.equal(rows[0]?.title, "Coffee", "input array is not reordered");

// sumSigned: income positive, expense negative.
assert.equal(sumSigned(rows), 2000 - 5 - 900);

console.log("finance.lib: all checks passed");
