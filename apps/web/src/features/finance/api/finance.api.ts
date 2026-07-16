import { apiFetch } from "@/lib/api";
import type { Expense } from "@noctis/types";

export type ExpenseDto = Omit<Expense, "date"> & { date: string };

export interface CreateExpenseInput {
  title: string;
  amount: number;
  category: string;
  type: "income" | "expense";
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
