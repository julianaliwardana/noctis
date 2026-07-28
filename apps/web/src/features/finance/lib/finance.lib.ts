import { format, startOfMonth, subMonths } from "date-fns";
import type { CategoryDto, ExpenseDto } from "../api/finance.api";

/**
 * Colours the user can pick. Each is a slot of the validated categorical palette, and each has a
 * re-stepped dark counterpart behind the CSS var — so a stored hex still themes correctly.
 */
export const PALETTE = ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4", "#008300", "#6b6f76"];

const PALETTE_VARS: Record<string, string> = {
  "#2a78d6": "var(--chart-1)",
  "#eb6834": "var(--chart-2)",
  "#1baf7a": "var(--chart-3)",
  "#eda100": "var(--chart-4)",
  "#e87ba4": "var(--chart-5)",
  "#008300": "var(--chart-6)",
  "#6b6f76": "var(--color-text-muted)",
};

export function paletteVar(hex: string): string {
  return PALETTE_VARS[hex.toLowerCase()] ?? hex;
}

/** Server categories are the source of truth, plus anything only the transactions know about. */
export function categoryNames(categories: CategoryDto[], expenses: ExpenseDto[]): string[] {
  const set = new Set(categories.map((category) => category.name));
  for (const expense of expenses) set.add(expense.category);
  return Array.from(set);
}

export function colorFor(categories: CategoryDto[], name: string): string {
  const category = categories.find((entry) => entry.name === name);
  return paletteVar(category?.color ?? "#6b6f76");
}

export interface CashflowPoint {
  label: string;
  income: number;
  expense: number;
}

export function monthlyCashflow(expenses: ExpenseDto[], months = 6): CashflowPoint[] {
  const buckets = new Map<string, CashflowPoint>();
  const thisMonth = startOfMonth(new Date());

  for (let back = months - 1; back >= 0; back -= 1) {
    const month = subMonths(thisMonth, back);
    buckets.set(format(month, "yyyy-MM"), { label: format(month, "MMM"), income: 0, expense: 0 });
  }

  for (const expense of expenses) {
    const bucket = buckets.get(format(new Date(expense.date), "yyyy-MM"));
    if (!bucket) continue;
    if (expense.type === "income") bucket.income += expense.amount;
    else bucket.expense += expense.amount;
  }

  return Array.from(buckets.values());
}

export interface CategorySlice {
  category: string;
  total: number;
}

/** Expense spend per category, biggest first, with everything past `top` folded into "Other". */
export function categoryTotals(expenses: ExpenseDto[], top = 5): CategorySlice[] {
  const totals = new Map<string, number>();
  for (const expense of expenses) {
    if (expense.type !== "expense") continue;
    totals.set(expense.category, (totals.get(expense.category) ?? 0) + expense.amount);
  }

  const sorted = Array.from(totals, ([category, total]) => ({ category, total })).sort((a, b) => b.total - a.total);
  const head = sorted.slice(0, top);
  const rest = sorted.slice(top).reduce((sum, slice) => sum + slice.total, 0);
  if (rest === 0) return head;

  const other = head.find((slice) => slice.category === "Other");
  if (other) other.total += rest;
  else head.push({ category: "Other", total: rest });

  return head.sort((a, b) => b.total - a.total);
}

export type SortKey = "date" | "title" | "category" | "amount";

export interface TableQuery {
  search: string;
  category: string;
  type: string;
  sort: SortKey;
  dir: "asc" | "desc";
}

function compare(a: ExpenseDto, b: ExpenseDto, key: SortKey): number {
  if (key === "amount") return a.amount - b.amount;
  if (key === "date") return new Date(a.date).getTime() - new Date(b.date).getTime();
  return a[key].localeCompare(b[key]);
}

export function queryExpenses(expenses: ExpenseDto[], query: TableQuery): ExpenseDto[] {
  const search = query.search.trim().toLowerCase();

  const rows = expenses.filter(
    (expense) =>
      (query.category === "all" || expense.category === query.category) &&
      (query.type === "all" || expense.type === query.type) &&
      (search === "" ||
        expense.title.toLowerCase().includes(search) ||
        expense.category.toLowerCase().includes(search)),
  );

  const sign = query.dir === "asc" ? 1 : -1;
  return rows.sort((a, b) => sign * compare(a, b, query.sort));
}

export function sumSigned(expenses: ExpenseDto[]): number {
  return expenses.reduce((net, e) => net + (e.type === "income" ? e.amount : -e.amount), 0);
}
