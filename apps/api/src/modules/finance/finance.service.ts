import type { Category, Expense } from "@noctis/db";
import * as financeRepository from "./finance.repository";
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

export function addExpense(userId: string, dto: CreateExpenseDto): Promise<Expense> {
  return financeRepository.create(userId, dto);
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
  const now = new Date();
  const year = query.year ?? now.getFullYear();
  const month = (query.month ?? now.getMonth() + 1) - 1;
  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 1);

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
