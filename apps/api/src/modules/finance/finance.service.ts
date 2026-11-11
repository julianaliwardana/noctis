import type { Category, Expense, Subscription } from "@noctis/db";
import { SALARY_CATEGORY, currentSalaryCycle } from "@noctis/utils";
import type { SalaryCycle } from "@noctis/utils";
import { notify } from "../notifications/notifications.service";
import * as financeRepository from "./finance.repository";
import type { IncomeSettings, SubscriptionInput } from "./finance.repository";
import {
  alertDue,
  budgetStatus,
  categorySpend,
  dayKey,
  daysInMonth,
  findRecurring,
  isWalletTopUpCategory,
  jakartaDay,
  lastMonthsRange,
  monthKey,
  monthOverview,
  monthRange,
  subscriptionStatus,
  summarize,
  transferPerson,
} from "./finance.insights";
import type {
  BudgetStatus,
  BudgetThreshold,
  DateRange,
  GroupBy,
  MonthOverview,
  RecurringReport,
  SpendSummary,
  SubscriptionStatus,
} from "./finance.insights";
import type { CreateCategoryDto, CreateExpenseDto, SummaryQueryDto, UpdateCategoryDto } from "./finance.dto";

/** Seeded once per user; the hexes are the validated categorical palette used by the charts. */
const DEFAULT_CATEGORIES = [
  { name: "Food", color: "#2a78d6" },
  { name: "Transport", color: "#eb6834" },
  { name: "Bills", color: "#1baf7a" },
  { name: "Shopping", color: "#eda100" },
  { name: "Health", color: "#e87ba4" },
  { name: "Other", color: "#6b6f76" },
];

const FALLBACK_COLOR = "#6b6f76";

export interface MonthlySummary {
  income: number;
  expense: number;
  net: number;
}

export function listExpenses(userId: string): Promise<Expense[]> {
  return financeRepository.findAllByUser(userId);
}

export async function addExpense(userId: string, dto: CreateExpenseDto): Promise<Expense> {
  const expense = await financeRepository.create(userId, dto);
  await checkBudgetAlert(userId, expense.category, expense.date);
  return expense;
}

export async function deleteExpense(id: string, userId: string): Promise<boolean> {
  const existing = await financeRepository.findById(id, userId);
  if (!existing) return false;
  await financeRepository.remove(id);
  return true;
}

export async function listCategories(userId: string): Promise<Category[]> {
  const existing = await financeRepository.findCategories(userId);
  const known = new Set(existing.map((category) => category.name));

  const missing = existing.length === 0 ? [...DEFAULT_CATEGORIES] : [];
  for (const expense of await financeRepository.findAllByUser(userId)) {
    if (known.has(expense.category) || missing.some((entry) => entry.name === expense.category)) continue;
    missing.push({ name: expense.category, color: FALLBACK_COLOR });
  }

  if (missing.length === 0) return existing;

  await financeRepository.createCategories(userId, missing);
  return financeRepository.findCategories(userId);
}

export async function createCategory(userId: string, dto: CreateCategoryDto): Promise<Category | "duplicate"> {
  if (await financeRepository.findCategoryByName(userId, dto.name)) return "duplicate";
  return financeRepository.createCategory(userId, dto.name, dto.color ?? FALLBACK_COLOR);
}

export async function updateCategory(
  id: string,
  userId: string,
  dto: UpdateCategoryDto,
): Promise<Category | null | "duplicate"> {
  const existing = await financeRepository.findCategoryById(id, userId);
  if (!existing) return null;

  const rename = dto.name !== undefined && dto.name !== existing.name;
  if (rename) {
    if (await financeRepository.findCategoryByName(userId, dto.name as string)) return "duplicate";
    await financeRepository.renameCategory(id, userId, existing.name, dto.name as string);
  }

  if (dto.color !== undefined) await financeRepository.updateCategory(id, { color: dto.color });

  return financeRepository.findCategoryById(id, userId);
}

export async function deleteCategory(id: string, userId: string): Promise<boolean | "last"> {
  const categories = await financeRepository.findCategories(userId);
  const target = categories.find((category) => category.id === id);
  if (!target) return false;
  if (categories.length === 1) return "last";

  const remaining = categories.filter((category) => category.id !== id);
  const fallback = remaining.find((category) => category.name === "Other") ?? remaining[0];

  await financeRepository.deleteCategory(id, userId, target.name, (fallback as Category).name);
  return true;
}

export async function getMonthlySummary(userId: string, query: SummaryQueryDto): Promise<MonthlySummary> {
  // Jakarta months, not the server's: in UTC the first seven hours of every month landed in the previous one.
  const today = jakartaDay(new Date());
  const { start, end } = monthRange(query.year ?? today.year, query.month ?? today.month);

  const expenses = await financeRepository.findByUserInRange(userId, start, end);

  return expenses.reduce<MonthlySummary>(
    (summary, entry) => {
      if (entry.type === "income") summary.income += entry.amount;
      else summary.expense += entry.amount;
      summary.net = summary.income - summary.expense;
      return summary;
    },
    { income: 0, expense: 0, net: 0 },
  );
}

const rupiah = (amount: number): string => `Rp ${Math.round(amount).toLocaleString("id-ID")}`;

const DAY_MS = 24 * 60 * 60 * 1000;
/** How far back to look for the salary that opened the running cycle. Generous, so a long-late salary still counts. */
const SALARY_LOOKBACK_DAYS = 120;

/** The span budgets and "left of income" are measured over: a calendar month, or salary to salary. */
export interface Period {
  mode: "month" | "payday";
  /** "YYYY-MM" for a month, the start day "YYYY-MM-DD" for a pay cycle. */
  key: string;
  start: Date;
  /** Exclusive. A pay cycle has no fixed end: it runs until the next salary is logged. */
  end: Date;
  /** "this month" / "since 27 Oct", for notification text. */
  label: string;
  daysLeft: number;
  /** Salary logged in this cycle, or the configured monthly income. */
  income: number | null;
  /** The configured monthly income, whatever was received. */
  usualIncome: number | null;
  payday: number | null;
  cycle: SalaryCycle | null;
}

const SHORT_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
function shortDate(date: Date): string {
  const { month, day } = jakartaDay(date);
  return `${day} ${SHORT_MONTHS[month - 1]}`;
}

export async function currentPeriod(userId: string, now: Date = new Date()): Promise<Period> {
  const settings = await financeRepository.findIncomeSettings(userId);
  const today = jakartaDay(now);

  if (settings.payday === null) {
    const { start, end } = monthRange(today.year, today.month);
    return {
      mode: "month",
      key: monthKey(now),
      start,
      end,
      label: "this month",
      daysLeft: daysInMonth(today.year, today.month) - today.day + 1,
      income: settings.monthlyIncome,
      usualIncome: settings.monthlyIncome,
      payday: null,
      cycle: null,
    };
  }

  const salaries = await financeRepository.findSalaries(
    userId,
    SALARY_CATEGORY,
    new Date(now.getTime() - SALARY_LOOKBACK_DAYS * DAY_MS),
  );
  const cycle = currentSalaryCycle(
    salaries.map((salary) => salary.date),
    settings.payday,
    now,
  );
  const received = salaries
    .filter((salary) => salary.date.getTime() >= cycle.start.getTime() && salary.date.getTime() <= now.getTime())
    .reduce((sum, salary) => sum + salary.amount, 0);

  return {
    mode: "payday",
    key: dayKey(cycle.start),
    start: cycle.start,
    // Open-ended: everything from the start belongs to this cycle until a new salary opens the next.
    end: new Date(cycle.start.getTime() + 400 * DAY_MS),
    label: `since ${shortDate(cycle.start)}`,
    daysLeft: cycle.daysLeft,
    income: received > 0 ? received : settings.monthlyIncome,
    usualIncome: settings.monthlyIncome,
    payday: settings.payday,
    cycle,
  };
}

/**
 * Pushes once when a category's spend for the current month crosses 80% and once at 100%.
 * Call it after anything that adds spend to a category. It never throws: a failed alert must
 * not undo the transaction that caused it.
 */
export async function checkBudgetAlert(
  userId: string,
  categoryName: string,
  transactionDate: Date,
  now: Date = new Date(),
): Promise<BudgetThreshold | null> {
  try {
    const period = await currentPeriod(userId, now);
    if (transactionDate.getTime() < period.start.getTime()) return null;

    const category = await financeRepository.findCategoryByName(userId, categoryName);
    const budget = category && (await financeRepository.findBudgetByCategory(category.id));
    if (!budget) return null;

    const spent = categorySpend(await financeRepository.findByUserInRange(userId, period.start, period.end), categoryName);

    // The alert columns hold the period key: "YYYY-MM" by calendar, the start day by pay cycle.
    const threshold = alertDue(budget, spent, period.key);
    if (!threshold || !(await financeRepository.claimBudgetAlert(budget.id, threshold, period.key))) return null;

    const daysLeft = period.daysLeft;
    const spentOfLimit = `${rupiah(spent)} of ${rupiah(budget.monthlyLimit)} spent ${period.label}`;
    if (threshold === 100) {
      const toGo = daysLeft > 0 ? `, with ${daysLeft} days to go` : "";
      await notify(userId, `${categoryName} budget used up`, `${spentOfLimit}${toGo}.`, "finance");
    } else {
      const percent = Math.floor((spent / budget.monthlyLimit) * 100);
      await notify(
        userId,
        `${categoryName} budget at ${percent}%`,
        `${spentOfLimit}. ${rupiah(budget.monthlyLimit - spent)} left for ${daysLeft} days.`,
        "finance",
      );
    }
    return threshold;
  } catch (error) {
    console.error("Budget alert failed", error);
    return null;
  }
}

/**
 * Re-checks every budget for the current month. For writers that add transactions without going
 * through this service (the in-app AI chat writes to the database directly) and so can't say
 * which category they touched.
 */
export async function checkAllBudgetAlerts(userId: string): Promise<void> {
  try {
    const now = new Date();
    const budgets = await financeRepository.findBudgets(userId);
    for (const budget of budgets) await checkBudgetAlert(userId, budget.category.name, now, now);
  } catch (error) {
    console.error("Budget alert sweep failed", error);
  }
}

export async function spendingSummary(userId: string, range: DateRange, groupBy: GroupBy): Promise<SpendSummary> {
  return summarize(await financeRepository.findByUserInRange(userId, range.start, range.end), groupBy);
}

export interface CategoryBudget extends BudgetStatus {
  category: string;
}

/** For the current period by default; a calendar month when one is given. */
export async function listBudgets(userId: string, year?: number, month?: number): Promise<CategoryBudget[]> {
  const { start, end } = year !== undefined && month !== undefined ? monthRange(year, month) : await currentPeriod(userId);
  const [budgets, rows] = await Promise.all([
    financeRepository.findBudgets(userId),
    financeRepository.findByUserInRange(userId, start, end),
  ]);

  return budgets.map((budget) => ({
    category: budget.category.name,
    ...budgetStatus(budget.monthlyLimit, categorySpend(rows, budget.category.name)),
  }));
}

/** `monthlyLimit` null removes the budget. */
export async function setBudget(
  userId: string,
  categoryName: string,
  monthlyLimit: number | null,
): Promise<{ category: string; monthlyLimit: number | null } | "unknown-category" | "wallet-category"> {
  const categories = await listCategories(userId);
  const category = categories.find((entry) => entry.name.toLowerCase() === categoryName.trim().toLowerCase());
  if (!category) return "unknown-category";

  if (monthlyLimit === null) {
    await financeRepository.deleteBudget(category.id);
    return { category: category.name, monthlyLimit: null };
  }
  // Top-ups never count as spend, so a budget on them would sit at 0% forever.
  if (isWalletTopUpCategory(category.name)) return "wallet-category";

  const budget = await financeRepository.upsertBudget(userId, category.id, monthlyLimit);
  return { category: category.name, monthlyLimit: budget.monthlyLimit };
}

export interface PeriodView {
  mode: "month" | "payday";
  /** First day, "YYYY-MM-DD". */
  start: string;
  /** Pay cycle only: when the next salary is expected. */
  expectedNext: string | null;
  /** Pay cycle only: the expected payday has passed with no salary logged. */
  salaryDue: boolean;
  daysLate: number;
  /** Pay cycle only: a salary has been logged for the running cycle. */
  salaryLogged: boolean;
  payday: number | null;
  /** The configured monthly income; `monthlyIncome` is what this period actually counts. */
  usualIncome: number | null;
}

export interface MonthOverviewWithBudgets extends MonthOverview {
  budgets: CategoryBudget[];
  period: PeriodView;
}

/** The current period (pay cycle or month) by default; a past or future calendar month when given. */
export async function getMonthOverview(userId: string, year?: number, month?: number): Promise<MonthOverviewWithBudgets> {
  const now = new Date();

  if (year !== undefined && month !== undefined) {
    const { start, end } = monthRange(year, month);
    const [rows, settings, budgets] = await Promise.all([
      financeRepository.findByUserInRange(userId, start, end),
      financeRepository.findIncomeSettings(userId),
      listBudgets(userId, year, month),
    ]);
    return {
      ...monthOverview(rows, settings.monthlyIncome, year, month, now),
      budgets,
      period: { mode: "month", start: dayKey(start), expectedNext: null, salaryDue: false, daysLate: 0, salaryLogged: false, payday: settings.payday, usualIncome: settings.monthlyIncome },
    };
  }

  const period = await currentPeriod(userId, now);
  const [rows, budgets] = await Promise.all([
    financeRepository.findByUserInRange(userId, period.start, period.end),
    listBudgets(userId),
  ]);
  const { spent, walletTopUps } = summarize(rows, "category");
  const remaining = period.income === null ? null : period.income - spent;

  return {
    month: period.key,
    monthlyIncome: period.income,
    spent,
    walletTopUps,
    remaining,
    daysLeft: period.daysLeft,
    perDayLeft: remaining === null || period.daysLeft === 0 ? null : Math.round(remaining / period.daysLeft),
    budgets,
    period: {
      mode: period.mode,
      start: dayKey(period.start),
      expectedNext: period.cycle ? dayKey(period.cycle.expectedNext) : null,
      salaryDue: period.cycle?.salaryDue ?? false,
      daysLate: period.cycle?.daysLate ?? 0,
      salaryLogged: period.cycle?.fromSalary ?? false,
      payday: period.payday,
      usualIncome: period.usualIncome,
    },
  };
}

export function setIncomeSettings(userId: string, settings: Partial<IncomeSettings>): Promise<IncomeSettings> {
  return financeRepository.updateIncomeSettings(userId, settings);
}

const SALARY_COLOR = "#1baf7a";

/**
 * Logs a salary (income in the Salary category), which opens a new pay cycle when it lands near
 * the expected payday. One per day: logging the same day twice returns the first.
 */
export async function logSalary(
  userId: string,
  amount: number,
  date: Date,
): Promise<{ status: "created" | "duplicate"; expense: Expense }> {
  const categories = await listCategories(userId);
  if (!categories.some((category) => category.name.toLowerCase() === SALARY_CATEGORY.toLowerCase())) {
    await financeRepository.createCategories(userId, [{ name: SALARY_CATEGORY, color: SALARY_COLOR }]);
  }

  const externalId = `salary-${dayKey(date)}`;
  const existing = await financeRepository.findByExternalId(userId, externalId);
  if (existing) return { status: "duplicate", expense: existing };

  try {
    const expense = await financeRepository.createImported(userId, {
      title: "Salary",
      amount,
      category: SALARY_CATEGORY,
      type: "income",
      date,
      source: "manual",
      externalId,
    });
    return { status: "created", expense };
  } catch (error) {
    // A double tap racing itself: the unique index keeps one.
    const raced = await financeRepository.findByExternalId(userId, externalId);
    if (raced) return { status: "duplicate", expense: raced };
    throw error;
  }
}

/**
 * Whether a new transaction's category is a guess the user should confirm: a transfer filed
 * under "Other" to someone with no settled history. Once the user has picked a category for
 * that person (or confirmed "Other"), later transfers stop being flagged; while an earlier one
 * is still waiting, new ones wait with it.
 */
export async function isUnreviewedTransfer(userId: string, title: string, category: string): Promise<boolean> {
  const person = transferPerson(title);
  if (!person || category.trim().toLowerCase() !== "other") return false;
  return (await financeRepository.countReviewedByTitle(userId, person)) === 0;
}

export interface UpdateTransactionInput {
  category?: string;
  title?: string;
  needsReview?: boolean;
}

export async function updateTransaction(
  userId: string,
  id: string,
  input: UpdateTransactionInput,
): Promise<{ expense: Expense; budgetAlert: BudgetThreshold | null } | "not-found" | { unknownCategory: string[] }> {
  const existing = await financeRepository.findById(id, userId);
  if (!existing) return "not-found";

  let category: string | undefined;
  if (input.category !== undefined) {
    const categories = await listCategories(userId);
    const match = categories.find((entry) => entry.name.toLowerCase() === input.category!.trim().toLowerCase());
    if (!match) return { unknownCategory: categories.map((entry) => entry.name) };
    category = match.name;
  }

  const expense = await financeRepository.update(id, {
    ...(category !== undefined ? { category } : {}),
    ...(input.title !== undefined ? { title: input.title } : {}),
    // Choosing a category is the review. An explicit flag still wins ("keep as Other").
    ...(input.needsReview !== undefined
      ? { needsReview: input.needsReview }
      : category !== undefined
        ? { needsReview: false }
        : {}),
  });

  const moved = category !== undefined && category !== existing.category;
  const budgetAlert = moved ? await checkBudgetAlert(userId, expense.category, expense.date) : null;
  return { expense, budgetAlert };
}

export async function recurringReport(userId: string, months: number): Promise<RecurringReport> {
  const { start, end } = lastMonthsRange(new Date(), months);
  return findRecurring(await financeRepository.findByUserInRange(userId, start, end));
}

export interface SubscriptionWithStatus extends SubscriptionStatus {
  name: string;
  expectedAmount: number;
  billingDay: number;
  matchTitle: string | null;
  paymentMethod: string | null;
  note: string | null;
  active: boolean;
}

export interface SubscriptionsReport {
  subscriptions: SubscriptionWithStatus[];
  /** Still to be charged within the next 7 days or already overdue, per payment method: what to keep funded. */
  dueSoon: { paymentMethod: string; total: number; names: string[] }[];
}

const DUE_SOON_DAYS = 7;

export async function listSubscriptions(userId: string, now: Date = new Date()): Promise<SubscriptionsReport> {
  const { start, end } = lastMonthsRange(now, 4);
  const [subscriptions, rows] = await Promise.all([
    financeRepository.findSubscriptions(userId),
    financeRepository.findByUserInRange(userId, start, end),
  ]);

  const withStatus = subscriptions.map((subscription: Subscription): SubscriptionWithStatus => ({
    name: subscription.name,
    expectedAmount: subscription.expectedAmount,
    billingDay: subscription.billingDay,
    matchTitle: subscription.matchTitle,
    paymentMethod: subscription.paymentMethod,
    note: subscription.note,
    active: subscription.active,
    ...subscriptionStatus(subscription, rows, now),
  }));

  const dueSoon = new Map<string, { paymentMethod: string; total: number; names: string[] }>();
  for (const subscription of withStatus) {
    if (!subscription.active || subscription.status === "paid" || subscription.daysUntilDue > DUE_SOON_DAYS) continue;
    const paymentMethod = subscription.paymentMethod ?? "unknown";
    const bucket = dueSoon.get(paymentMethod) ?? { paymentMethod, total: 0, names: [] };
    bucket.total += subscription.expectedAmount;
    bucket.names.push(subscription.name);
    dueSoon.set(paymentMethod, bucket);
  }

  return { subscriptions: withStatus, dueSoon: Array.from(dueSoon.values()) };
}

export function upsertSubscription(userId: string, input: SubscriptionInput): Promise<Subscription> {
  return financeRepository.upsertSubscription(userId, input);
}
