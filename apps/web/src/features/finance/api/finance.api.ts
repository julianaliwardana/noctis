import { api } from "@/lib/api";
import type { Category, Expense } from "@noctis/types";

export type ExpenseDto = Omit<Expense, "date"> & { date: string };
export type CategoryDto = Omit<Category, "createdAt"> & { createdAt: string };

export interface CategoryInput {
  name?: string;
  color?: string;
}

export interface CreateExpenseInput {
  title: string;
  amount: number;
  category: string;
  type: "income" | "expense";
  date?: string;
}

export interface MonthlySummary {
  income: number;
  expense: number;
  net: number;
}

export function fetchExpenses(): Promise<ExpenseDto[]> {
  return api.get<ExpenseDto[]>("/finance");
}

export function fetchSummary(): Promise<MonthlySummary> {
  return api.get<MonthlySummary>("/finance/summary");
}

export function addExpense(input: CreateExpenseInput): Promise<ExpenseDto> {
  return api.post<ExpenseDto>("/finance", input);
}

export function deleteExpense(id: string): Promise<void> {
  return api.delete(`/finance/${id}`);
}

export function fetchCategories(): Promise<CategoryDto[]> {
  return api.get<CategoryDto[]>("/finance/categories");
}

export function addCategory(input: { name: string; color?: string }): Promise<CategoryDto> {
  return api.post<CategoryDto>("/finance/categories", input);
}

export function updateCategory(id: string, input: CategoryInput): Promise<CategoryDto> {
  return api.patch<CategoryDto>(`/finance/categories/${id}`, input);
}

export function deleteCategory(id: string): Promise<void> {
  return api.delete(`/finance/categories/${id}`);
}
