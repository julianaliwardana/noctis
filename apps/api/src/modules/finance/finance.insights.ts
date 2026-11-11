/**
 * Pure money logic: no database, no clock of its own. Everything here takes rows and a `now`,
 * so the rules (what counts as spend, when a budget alerts, what a subscription owes) can be
 * checked without a server — see finance.insights.check.ts.
 *
 * All calendar maths is Asia/Jakarta. WIB is a fixed UTC+7 with no daylight saving, so a plain
 * offset is exact and needs no timezone database.
 */

const JAKARTA_OFFSET_MS = 7 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

export interface InsightRow {
  id: string;
  title: string;
  amount: number;
  category: string;
  type: string;
  date: Date;
}

// ── Calendar ────────────────────────────────────────────────────────────────────────────────

export interface JakartaDay {
  year: number;
  /** 1-12 */
  month: number;
  day: number;
}

export function jakartaDay(date: Date): JakartaDay {
  const shifted = new Date(date.getTime() + JAKARTA_OFFSET_MS);
  return { year: shifted.getUTCFullYear(), month: shifted.getUTCMonth() + 1, day: shifted.getUTCDate() };
}

const pad = (value: number): string => String(value).padStart(2, "0");

/** "YYYY-MM" in Jakarta. */
export function monthKey(date: Date): string {
  const { year, month } = jakartaDay(date);
  return `${year}-${pad(month)}`;
}

/** "YYYY-MM-DD" in Jakarta. */
export function dayKey(date: Date): string {
  const { year, month, day } = jakartaDay(date);
  return `${year}-${pad(month)}-${pad(day)}`;
}

/** The instant a Jakarta calendar day starts. Day overflow rolls over (day 32 → next month). */
export function jakartaMidnight(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month - 1, day) - JAKARTA_OFFSET_MS);
}

export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export interface DateRange {
  start: Date;
  /** Exclusive. */
  end: Date;
}

export function parseMonthKey(key: string): { year: number; month: number } | null {
  const match = /^(\d{4})-(\d{2})$/.exec(key);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (month < 1 || month > 12) return null;
  return { year, month };
}

export function monthRange(year: number, month: number): DateRange {
  return { start: jakartaMidnight(year, month, 1), end: jakartaMidnight(year, month + 1, 1) };
}

/** `count` whole Jakarta months ending with the one `now` is in. */
export function lastMonthsRange(now: Date, count: number): DateRange {
  const { year, month } = jakartaDay(now);
  return { start: jakartaMidnight(year, month - (count - 1), 1), end: jakartaMidnight(year, month + 1, 1) };
}

function parseDayKey(key: string): JakartaDay | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > daysInMonth(year, month)) return null;
  return { year, month, day };
}

/** Both ends are Jakarta days and both are included. Null when a date is malformed or the range is backwards. */
export function dayRange(from: string, to: string): DateRange | null {
  const first = parseDayKey(from);
  const last = parseDayKey(to);
  if (!first || !last) return null;
  const start = jakartaMidnight(first.year, first.month, first.day);
  const end = jakartaMidnight(last.year, last.month, last.day + 1);
  return end > start ? { start, end } : null;
}

// ── What counts as spend ────────────────────────────────────────────────────────────────────

/**
 * Money moved into an e-wallet hasn't been spent yet — it is spent when the wallet pays for
 * something, and those payments are logged as their own transactions (from the receipt).
 * Counting the top-up too would count the same rupiah twice.
 */
const WALLET_TOP_UP_CATEGORIES = new Set(["top-up"]);

export function isWalletTopUpCategory(category: string): boolean {
  return WALLET_TOP_UP_CATEGORIES.has(category.trim().toLowerCase());
}

const REFUND_PREFIX = /^refund\b\s*[—–:-]?\s*/i;

export function isRefund(row: Pick<InsightRow, "type" | "title">): boolean {
  return row.type === "income" && REFUND_PREFIX.test(row.title.trim());
}

/** What a row adds to spend: its amount, minus it for a refund, nothing for top-ups and real income. */
export function spendOf(row: Pick<InsightRow, "type" | "title" | "category" | "amount">): number {
  if (row.type === "expense") return isWalletTopUpCategory(row.category) ? 0 : row.amount;
  return isRefund(row) ? -row.amount : 0;
}

/** Spend in one category, refunds netted off. */
export function categorySpend(rows: InsightRow[], category: string): number {
  const wanted = category.trim().toLowerCase();
  return rows.reduce((sum, row) => (row.category.trim().toLowerCase() === wanted ? sum + spendOf(row) : sum), 0);
}

export type GroupBy = "category" | "merchant" | "day";

export interface SpendGroup {
  key: string;
  total: number;
  count: number;
}

export interface SpendSummary {
  /** Expenses minus refunds, wallet top-ups left out. */
  spent: number;
  refunds: number;
  /** Income rows that are not refunds. */
  income: number;
  /** Moved into e-wallets; not part of `spent`. */
  walletTopUps: number;
  transactions: number;
  groups: SpendGroup[];
}

/** The merchant a row belongs to: a refund nets against the merchant it came from. */
export function merchantKey(title: string): string {
  return title.trim().replace(REFUND_PREFIX, "").trim();
}

export function summarize(rows: InsightRow[], groupBy: GroupBy): SpendSummary {
  const summary: SpendSummary = { spent: 0, refunds: 0, income: 0, walletTopUps: 0, transactions: rows.length, groups: [] };
  const groups = new Map<string, SpendGroup>();

  for (const row of rows) {
    if (row.type === "expense" && isWalletTopUpCategory(row.category)) {
      summary.walletTopUps += row.amount;
      continue;
    }
    if (row.type !== "expense" && !isRefund(row)) {
      summary.income += row.amount;
      continue;
    }

    const amount = spendOf(row);
    summary.spent += amount;
    if (amount < 0) summary.refunds += row.amount;

    const key = groupBy === "category" ? row.category : groupBy === "day" ? dayKey(row.date) : merchantKey(row.title);
    const group = groups.get(key) ?? { key, total: 0, count: 0 };
    group.total += amount;
    group.count += 1;
    groups.set(key, group);
  }

  summary.groups = Array.from(groups.values()).sort((a, b) =>
    groupBy === "day" ? a.key.localeCompare(b.key) : b.total - a.total,
  );
  return summary;
}

// ── Budgets ─────────────────────────────────────────────────────────────────────────────────

export type BudgetThreshold = 80 | 100;

export interface BudgetStatus {
  limit: number;
  spent: number;
  remaining: number;
  /** One decimal. */
  percent: number;
  state: "ok" | "warning" | "over";
}

export function budgetStatus(limit: number, spent: number): BudgetStatus {
  const percent = limit > 0 ? Math.round((spent / limit) * 1000) / 10 : 0;
  return {
    limit,
    spent,
    remaining: limit - spent,
    percent,
    state: spent >= limit ? "over" : spent >= limit * 0.8 ? "warning" : "ok",
  };
}

export interface BudgetAlertState {
  monthlyLimit: number;
  alerted80Month: string | null;
  alerted100Month: string | null;
}

/**
 * The push still owed for `month`, if any. Each threshold fires once a month; jumping straight
 * past 100% sends only the 100% push, and the 80% one is never sent late.
 */
export function alertDue(budget: BudgetAlertState, spent: number, month: string): BudgetThreshold | null {
  if (budget.monthlyLimit <= 0) return null;
  if (spent >= budget.monthlyLimit) return budget.alerted100Month === month ? null : 100;
  if (spent >= budget.monthlyLimit * 0.8) {
    return budget.alerted80Month === month || budget.alerted100Month === month ? null : 80;
  }
  return null;
}

// ── Month overview ──────────────────────────────────────────────────────────────────────────

export interface MonthOverview {
  month: string;
  monthlyIncome: number | null;
  spent: number;
  walletTopUps: number;
  /** Income minus spend; null until the user has set their income. */
  remaining: number | null;
  /** Days still to live through in the month, today included. 0 for a past month. */
  daysLeft: number;
  /** `remaining` spread over `daysLeft`. */
  perDayLeft: number | null;
}

export function monthOverview(
  rows: InsightRow[],
  monthlyIncome: number | null,
  year: number,
  month: number,
  now: Date,
): MonthOverview {
  const { spent, walletTopUps } = summarize(rows, "category");
  const today = jakartaDay(now);
  const key = `${year}-${pad(month)}`;
  const current = monthKey(now);
  const daysLeft = key === current ? daysInMonth(year, month) - today.day + 1 : key > current ? daysInMonth(year, month) : 0;
  const remaining = monthlyIncome === null ? null : monthlyIncome - spent;

  return {
    month: key,
    monthlyIncome,
    spent,
    walletTopUps,
    remaining,
    daysLeft,
    perDayLeft: remaining === null || daysLeft === 0 ? null : Math.round(remaining / daysLeft),
  };
}

// ── Transfers to people ─────────────────────────────────────────────────────────────────────

const TRANSFER_TITLE = /^(?:qris\s+)?transfer\s+to\s+(.+)$/i;

/**
 * The person a transfer went to, without the remark or the bank: both
 * "Transfer to Marzelline Churnia — laundry" and "QRIS transfer to Marzelline Churnia" give
 * "Marzelline Churnia". Null when the title isn't a transfer.
 */
export function transferPerson(title: string): string | null {
  const match = TRANSFER_TITLE.exec(title.trim());
  if (!match) return null;
  const person = (match[1] as string)
    .split(/\s+[—–-]\s+/)[0]!
    .replace(/\s*\([^)]*\)\s*$/, "")
    .trim();
  return person.length > 0 ? person : null;
}

// ── Recurring charges ───────────────────────────────────────────────────────────────────────

export interface ChargeGroup {
  title: string;
  amount: number;
  category: string;
  /** Jakarta months it was charged in, oldest first. */
  months: string[];
  charges: { id: string; date: string }[];
  /** Months in which it was charged more than once. */
  duplicateMonths: string[];
}

export interface RecurringReport {
  /** Same title and amount in two or more months, at a monthly rhythm. */
  recurring: ChargeGroup[];
  /** In the Subscriptions category but not (yet) seen in two months. */
  candidates: ChargeGroup[];
}

/** More charges than this in one month is a habit (a commute fare, a lunch spot), not a subscription. */
const MAX_MONTHLY_CHARGES = 2;

export function findRecurring(rows: InsightRow[]): RecurringReport {
  const groups = new Map<string, { group: ChargeGroup; perMonth: Map<string, number> }>();

  for (const row of [...rows].sort((a, b) => a.date.getTime() - b.date.getTime())) {
    if (row.type !== "expense" || isWalletTopUpCategory(row.category)) continue;

    const key = `${row.title.trim().toLowerCase()}|${Math.round(row.amount)}`;
    const entry = groups.get(key) ?? {
      group: { title: row.title.trim(), amount: row.amount, category: row.category, months: [], charges: [], duplicateMonths: [] },
      perMonth: new Map<string, number>(),
    };
    const month = monthKey(row.date);
    entry.perMonth.set(month, (entry.perMonth.get(month) ?? 0) + 1);
    entry.group.charges.push({ id: row.id, date: dayKey(row.date) });
    entry.group.category = row.category;
    groups.set(key, entry);
  }

  const report: RecurringReport = { recurring: [], candidates: [] };

  for (const { group, perMonth } of groups.values()) {
    group.months = Array.from(perMonth.keys());
    group.duplicateMonths = group.months.filter((month) => (perMonth.get(month) as number) > 1);
    const monthlyRhythm = Array.from(perMonth.values()).every((count) => count <= MAX_MONTHLY_CHARGES);

    if (group.months.length >= 2 && monthlyRhythm) report.recurring.push(group);
    else if (group.category.trim().toLowerCase() === "subscriptions") report.candidates.push(group);
  }

  const byAmount = (a: ChargeGroup, b: ChargeGroup): number => b.amount - a.amount;
  report.recurring.sort(byAmount);
  report.candidates.sort(byAmount);
  return report;
}

// ── Subscription registry ───────────────────────────────────────────────────────────────────

export interface SubscriptionRule {
  name: string;
  expectedAmount: number;
  billingDay: number;
  matchTitle: string | null;
}

export interface SubscriptionCharge {
  id: string;
  amount: number;
  date: string;
}

export interface SubscriptionStatus {
  /** paid: charged this cycle · upcoming: not due yet · due: due within the last 2 days · missing: overdue. */
  status: "paid" | "upcoming" | "due" | "missing";
  /** This month's billing date, "YYYY-MM-DD". */
  dueDate: string;
  /** Negative once the date has passed. */
  daysUntilDue: number;
  charge: SubscriptionCharge | null;
  /** The charge that paid this cycle differs from the expected amount. */
  priceChanged: boolean;
  lastCharge: SubscriptionCharge | null;
}

/** A charge may post a little before its billing date. */
const EARLY_CHARGE_DAYS = 3;
const GRACE_DAYS = 2;

export function matchesSubscription(rule: SubscriptionRule, row: Pick<InsightRow, "type" | "title">): boolean {
  const needle = (rule.matchTitle ?? rule.name).trim().toLowerCase();
  return row.type === "expense" && needle.length > 0 && row.title.toLowerCase().includes(needle);
}

/** `rows` should reach back far enough to hold the previous charge (a few months is plenty). */
export function subscriptionStatus(rule: SubscriptionRule, rows: InsightRow[], now: Date): SubscriptionStatus {
  const today = jakartaDay(now);
  const dueDay = Math.min(Math.max(rule.billingDay, 1), daysInMonth(today.year, today.month));
  const due = jakartaMidnight(today.year, today.month, dueDay);
  const todayStart = jakartaMidnight(today.year, today.month, today.day);
  const daysUntilDue = Math.round((due.getTime() - todayStart.getTime()) / DAY_MS);

  const matches = rows
    .filter((row) => matchesSubscription(rule, row))
    .sort((a, b) => b.date.getTime() - a.date.getTime());
  const toCharge = (row: InsightRow): SubscriptionCharge => ({ id: row.id, amount: row.amount, date: dayKey(row.date) });

  const cycleStart = due.getTime() - EARLY_CHARGE_DAYS * DAY_MS;
  const paidBy = matches.find((row) => row.date.getTime() >= cycleStart);
  const last = matches[0];

  const status: SubscriptionStatus["status"] = paidBy
    ? "paid"
    : daysUntilDue > 0
      ? "upcoming"
      : daysUntilDue >= -GRACE_DAYS
        ? "due"
        : "missing";

  return {
    status,
    dueDate: dayKey(due),
    daysUntilDue,
    charge: paidBy ? toCharge(paidBy) : null,
    priceChanged: paidBy ? Math.abs(paidBy.amount - rule.expectedAmount) > 1 : false,
    lastCharge: last ? toCharge(last) : null,
  };
}
