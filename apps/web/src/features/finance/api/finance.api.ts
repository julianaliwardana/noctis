import { apiFetch } from "@/lib/api";
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
  return apiFetch<ExpenseDto[]>("/finance");
}

export function fetchSummary(): Promise<MonthlySummary> {
  return apiFetch<MonthlySummary>("/finance/summary");
}

export function addExpense(input: CreateExpenseInput): Promise<ExpenseDto> {
  return apiFetch<ExpenseDto>("/finance", { method: "POST", body: JSON.stringify(input) });
}

export function deleteExpense(id: string): Promise<void> {
  return apiFetch<void>(`/finance/${id}`, { method: "DELETE" });
}

export function fetchCategories(): Promise<CategoryDto[]> {
  return apiFetch<CategoryDto[]>("/finance/categories");
}

export function addCategory(input: { name: string; color?: string }): Promise<CategoryDto> {
  return apiFetch<CategoryDto>("/finance/categories", { method: "POST", body: JSON.stringify(input) });
}

export function updateCategory(id: string, input: CategoryInput): Promise<CategoryDto> {
  return apiFetch<CategoryDto>(`/finance/categories/${id}`, { method: "PATCH", body: JSON.stringify(input) });
}

export function deleteCategory(id: string): Promise<void> {
  return apiFetch<void>(`/finance/categories/${id}`, { method: "DELETE" });
}
