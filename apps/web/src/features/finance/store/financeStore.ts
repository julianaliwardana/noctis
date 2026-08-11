import { create } from "zustand";
import * as financeApi from "../api/finance.api";
import type {
  CategoryDto,
  CategoryInput,
  CreateExpenseInput,
  ExpenseDto,
  MonthlySummary,
} from "../api/finance.api";

interface FinanceState {
  expenses: ExpenseDto[];
  categories: CategoryDto[];
  summary: MonthlySummary | null;
  loading: boolean;
  fetchAll: () => Promise<void>;
  addExpense: (input: CreateExpenseInput) => Promise<void>;
  removeExpense: (id: string) => Promise<void>;
  addCategory: (name: string, color: string) => Promise<void>;
  editCategory: (id: string, input: CategoryInput) => Promise<void>;
  removeCategory: (id: string) => Promise<void>;
}

export const useFinanceStore = create<FinanceState>((set, get) => ({
  expenses: [],
  categories: [],
  summary: null,
  loading: false,

  fetchAll: async () => {
    set({ loading: true });
    try {
      const [expenses, summary, categories] = await Promise.all([
        financeApi.fetchExpenses(),
        financeApi.fetchSummary(),
        financeApi.fetchCategories(),
      ]);
      set({ expenses, summary, categories, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  addExpense: async (input) => {
    await financeApi.addExpense(input);
    await get().fetchAll();
  },

  removeExpense: async (id) => {
    await financeApi.deleteExpense(id);
    await get().fetchAll();
  },

  addCategory: async (name, color) => {
    await financeApi.addCategory({ name, color });
    await get().fetchAll();
  },

  // Renames and deletes both move transactions server-side, so expenses need refetching too.
  editCategory: async (id, input) => {
    await financeApi.updateCategory(id, input);
    await get().fetchAll();
  },

  removeCategory: async (id) => {
    await financeApi.deleteCategory(id);
    await get().fetchAll();
  },
}));
