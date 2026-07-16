import type { Expense } from "@noctis/db";
import * as financeRepository from "./finance.repository";
import type { CreateExpenseDto, SummaryQueryDto } from "./finance.dto";

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
