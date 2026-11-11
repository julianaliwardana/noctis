import { db } from "@noctis/db";
import type { Budget, Category, Expense, Prisma, Subscription } from "@noctis/db";
import type { CreateExpenseDto } from "./finance.dto";

export function findAllByUser(userId: string): Promise<Expense[]> {
  return db.expense.findMany({ where: { userId }, orderBy: { date: "desc" } });
}

export function findByUserInRange(userId: string, start: Date, end: Date): Promise<Expense[]> {
  return db.expense.findMany({ where: { userId, date: { gte: start, lt: end } }, orderBy: { date: "desc" } });
}

export function findById(id: string, userId: string): Promise<Expense | null> {
  return db.expense.findFirst({ where: { id, userId } });
}

export function create(userId: string, data: CreateExpenseDto): Promise<Expense> {
  return db.expense.create({ data: { ...data, userId } });
}

export interface ImportedExpenseInput {
  title: string;
  amount: number;
  category: string;
  type: "income" | "expense";
  date: Date;
  source: string;
  externalId: string;
  paymentMethod?: string;
  needsReview?: boolean;
}

export function createImported(userId: string, data: ImportedExpenseInput): Promise<Expense> {
  return db.expense.create({ data: { ...data, userId } });
}

export function findByExternalIds(userId: string, externalIds: string[]): Promise<Expense[]> {
  return db.expense.findMany({ where: { userId, externalId: { in: externalIds } } });
}

export function findByExternalId(userId: string, externalId: string): Promise<Expense | null> {
  return db.expense.findUnique({ where: { userId_externalId: { userId, externalId } } });
}

export interface ExpenseSearch {
  query?: string;
  category?: string;
  start?: Date;
  /** Exclusive. */
  end?: Date;
  minAmount?: number;
  needsReview?: boolean;
  /** Id of the last row of the previous page. */
  cursor?: string;
}

/** Newest first. The id breaks ties, so paging never skips or repeats rows that share a timestamp. */
export function search(userId: string, filters: ExpenseSearch, take: number): Promise<Expense[]> {
  const where: Prisma.ExpenseWhereInput = { userId };
  if (filters.query) where.title = { contains: filters.query, mode: "insensitive" };
  if (filters.category) where.category = { equals: filters.category, mode: "insensitive" };
  if (filters.start || filters.end) where.date = { gte: filters.start, lt: filters.end };
  if (filters.minAmount !== undefined) where.amount = { gte: filters.minAmount };
  if (filters.needsReview !== undefined) where.needsReview = filters.needsReview;

  return db.expense.findMany({
    where,
    orderBy: [{ date: "desc" }, { id: "desc" }],
    take,
    ...(filters.cursor ? { cursor: { id: filters.cursor }, skip: 1 } : {}),
  });
}

/** Rows matching the title whose category the user has settled (or never had in doubt). */
export function countReviewedByTitle(userId: string, query: string): Promise<number> {
  return db.expense.count({ where: { userId, needsReview: false, title: { contains: query, mode: "insensitive" } } });
}

export function countNeedingReview(userId: string): Promise<number> {
  return db.expense.count({ where: { userId, needsReview: true } });
}

export function update(id: string, data: Prisma.ExpenseUpdateInput): Promise<Expense> {
  return db.expense.update({ where: { id }, data });
}

export function remove(id: string): Promise<Expense> {
  return db.expense.delete({ where: { id } });
}

export function findCategories(userId: string): Promise<Category[]> {
  return db.category.findMany({ where: { userId }, orderBy: { createdAt: "asc" } });
}

export function findCategoryById(id: string, userId: string): Promise<Category | null> {
  return db.category.findFirst({ where: { id, userId } });
}

export function findCategoryByName(userId: string, name: string): Promise<Category | null> {
  return db.category.findFirst({ where: { userId, name } });
}

export function createCategory(userId: string, name: string, color: string): Promise<Category> {
  return db.category.create({ data: { userId, name, color } });
}

export function createCategories(userId: string, categories: { name: string; color: string }[]): Promise<unknown> {
  return db.category.createMany({
    data: categories.map((category) => ({ ...category, userId })),
    skipDuplicates: true,
  });
}

export function updateCategory(id: string, data: Prisma.CategoryUpdateInput): Promise<Category> {
  return db.category.update({ where: { id }, data });
}

export function renameCategory(id: string, userId: string, from: string, to: string): Promise<unknown> {
  return db.$transaction([
    db.category.update({ where: { id }, data: { name: to } }),
    db.expense.updateMany({ where: { userId, category: from }, data: { category: to } }),
  ]);
}

export function deleteCategory(id: string, userId: string, name: string, fallback: string): Promise<unknown> {
  return db.$transaction([
    db.expense.updateMany({ where: { userId, category: name }, data: { category: fallback } }),
    db.category.delete({ where: { id } }),
  ]);
}

export type BudgetWithCategory = Budget & { category: Category };

export function findBudgets(userId: string): Promise<BudgetWithCategory[]> {
  return db.budget.findMany({ where: { userId }, include: { category: true }, orderBy: { createdAt: "asc" } });
}

export function findBudgetByCategory(categoryId: string): Promise<Budget | null> {
  return db.budget.findUnique({ where: { categoryId } });
}

export function upsertBudget(userId: string, categoryId: string, monthlyLimit: number): Promise<Budget> {
  return db.budget.upsert({
    where: { categoryId },
    create: { userId, categoryId, monthlyLimit },
    update: { monthlyLimit },
  });
}

export async function deleteBudget(categoryId: string): Promise<boolean> {
  const { count } = await db.budget.deleteMany({ where: { categoryId } });
  return count > 0;
}

/**
 * Marks a threshold as alerted for `month` and reports whether this call was the one that did it.
 * Two imports landing together both see the budget crossed; only the one that wins this update pushes.
 */
export async function claimBudgetAlert(budgetId: string, threshold: 80 | 100, month: string): Promise<boolean> {
  const field = threshold === 100 ? "alerted100Month" : "alerted80Month";
  const { count } = await db.budget.updateMany({
    // `not: month` alone would skip rows where the column is still null.
    where: { id: budgetId, OR: [{ [field]: null }, { [field]: { not: month } }] },
    data: threshold === 100 ? { alerted100Month: month, alerted80Month: month } : { alerted80Month: month },
  });
  return count > 0;
}

export function findSubscriptions(userId: string): Promise<Subscription[]> {
  return db.subscription.findMany({ where: { userId }, orderBy: { billingDay: "asc" } });
}

export interface SubscriptionInput {
  name: string;
  expectedAmount: number;
  billingDay: number;
  matchTitle?: string | null;
  paymentMethod?: string | null;
  note?: string | null;
  active?: boolean;
}

export function upsertSubscription(userId: string, { name, ...rest }: SubscriptionInput): Promise<Subscription> {
  return db.subscription.upsert({
    where: { userId_name: { userId, name } },
    create: { userId, name, ...rest },
    update: rest,
  });
}

export interface IncomeSettings {
  monthlyIncome: number | null;
  payday: number | null;
}

export async function findIncomeSettings(userId: string): Promise<IncomeSettings> {
  const user = await db.user.findUnique({ where: { id: userId }, select: { monthlyIncome: true, payday: true } });
  return { monthlyIncome: user?.monthlyIncome ?? null, payday: user?.payday ?? null };
}

/** Only the fields given change. */
export function updateIncomeSettings(userId: string, settings: Partial<IncomeSettings>): Promise<IncomeSettings> {
  return db.user.update({ where: { id: userId }, data: settings, select: { monthlyIncome: true, payday: true } });
}

/** Salary rows since `since`, oldest first. */
export function findSalaries(userId: string, category: string, since: Date): Promise<Expense[]> {
  return db.expense.findMany({
    where: { userId, type: "income", category: { equals: category, mode: "insensitive" }, date: { gte: since } },
    orderBy: { date: "asc" },
  });
}
