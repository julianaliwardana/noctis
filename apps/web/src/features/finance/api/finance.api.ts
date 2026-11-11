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

export interface BudgetDto {
  category: string;
  limit: number;
  spent: number;
  remaining: number;
  percent: number;
  state: "ok" | "warning" | "over";
}

/** This month under the spend rule: expenses minus refunds, wallet top-ups left out. */
export interface OverviewDto {
  month: string;
  monthlyIncome: number | null;
  spent: number;
  walletTopUps: number;
  remaining: number | null;
  daysLeft: number;
  perDayLeft: number | null;
  budgets: BudgetDto[];
}

export interface SubscriptionChargeDto {
  id: string;
  amount: number;
  date: string;
}

export interface SubscriptionDto {
  name: string;
  expectedAmount: number;
  billingDay: number;
  paymentMethod: string | null;
  active: boolean;
  status: "paid" | "upcoming" | "due" | "missing";
  dueDate: string;
  daysUntilDue: number;
  charge: SubscriptionChargeDto | null;
  priceChanged: boolean;
  lastCharge: SubscriptionChargeDto | null;
}

export interface SubscriptionsDto {
  subscriptions: SubscriptionDto[];
  dueSoon: { paymentMethod: string; total: number; names: string[] }[];
}

export interface UpdateExpenseInput {
  category?: string;
  title?: string;
  needsReview?: boolean;
}

export function fetchOverview(): Promise<OverviewDto> {
  return api.get<OverviewDto>("/finance/overview");
}

export function fetchSubscriptions(): Promise<SubscriptionsDto> {
  return api.get<SubscriptionsDto>("/finance/subscriptions");
}

export function updateExpense(id: string, input: UpdateExpenseInput): Promise<ExpenseDto> {
  return api.patch<ExpenseDto>(`/finance/${id}`, input);
}

export function setMonthlyIncome(monthlyIncome: number | null): Promise<{ monthlyIncome: number | null }> {
  return api.put<{ monthlyIncome: number | null }>("/finance/income", { monthlyIncome });
}

export function setBudget(category: string, monthlyLimit: number | null): Promise<unknown> {
  return api.put("/finance/budgets", { category, monthlyLimit });
}
