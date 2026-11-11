import type { Category, Expense, Subscription } from "@noctis/db";
import { notify } from "../notifications/notifications.service";
import * as financeRepository from "./finance.repository";
import type { SubscriptionInput } from "./finance.repository";
import {
  alertDue,
  budgetStatus,
  categorySpend,
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
    const month = monthKey(now);
    if (monthKey(transactionDate) !== month) return null;

    const category = await financeRepository.findCategoryByName(userId, categoryName);
    const budget = category && (await financeRepository.findBudgetByCategory(category.id));
    if (!budget) return null;

    const today = jakartaDay(now);
    const { start, end } = monthRange(today.year, today.month);
    const spent = categorySpend(await financeRepository.findByUserInRange(userId, start, end), categoryName);

    const threshold = alertDue(budget, spent, month);
    if (!threshold || !(await financeRepository.claimBudgetAlert(budget.id, threshold, month))) return null;

    const daysLeft = daysInMonth(today.year, today.month) - today.day + 1;
    const spentOfLimit = `${rupiah(spent)} of ${rupiah(budget.monthlyLimit)} spent this month`;
    if (threshold === 100) {
      await notify(userId, `${categoryName} budget used up`, `${spentOfLimit}, with ${daysLeft} days to go.`, "finance");
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

export async function spendingSummary(userId: string, range: DateRange, groupBy: GroupBy): Promise<SpendSummary> {
  return summarize(await financeRepository.findByUserInRange(userId, range.start, range.end), groupBy);
}

export interface CategoryBudget extends BudgetStatus {
  category: string;
}

export async function listBudgets(userId: string, year?: number, month?: number): Promise<CategoryBudget[]> {
  const today = jakartaDay(new Date());
  const { start, end } = monthRange(year ?? today.year, month ?? today.month);
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

export interface MonthOverviewWithBudgets extends MonthOverview {
  budgets: CategoryBudget[];
}

export async function getMonthOverview(userId: string, year?: number, month?: number): Promise<MonthOverviewWithBudgets> {
  const now = new Date();
  const today = jakartaDay(now);
  const targetYear = year ?? today.year;
  const targetMonth = month ?? today.month;
  const { start, end } = monthRange(targetYear, targetMonth);

  const [rows, income, budgets] = await Promise.all([
    financeRepository.findByUserInRange(userId, start, end),
    financeRepository.findMonthlyIncome(userId),
    listBudgets(userId, targetYear, targetMonth),
  ]);

  return { ...monthOverview(rows, income, targetYear, targetMonth, now), budgets };
}

export function setMonthlyIncome(userId: string, monthlyIncome: number | null): Promise<unknown> {
  return financeRepository.setMonthlyIncome(userId, monthlyIncome);
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
