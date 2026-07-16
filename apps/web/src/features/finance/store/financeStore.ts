import { create } from "zustand";
import * as financeApi from "../api/finance.api";
import type { CreateExpenseInput, ExpenseDto, MonthlySummary } from "../api/finance.api";

interface FinanceState {
  expenses: ExpenseDto[];
  summary: MonthlySummary | null;
  loading: boolean;
  fetchAll: () => Promise<void>;
  addExpense: (input: CreateExpenseInput) => Promise<void>;
  removeExpense: (id: string) => Promise<void>;
}

export const useFinanceStore = create<FinanceState>((set, get) => ({
  expenses: [],
  summary: null,
  loading: false,

  fetchAll: async () => {
    set({ loading: true });
    const [expenses, summary] = await Promise.all([financeApi.fetchExpenses(), financeApi.fetchSummary()]);
    set({ expenses, summary, loading: false });
  },

  addExpense: async (input) => {
    await financeApi.addExpense(input);
    await get().fetchAll();
  },

  removeExpense: async (id) => {
    await financeApi.deleteExpense(id);
    await get().fetchAll();
  },
}));
