import { create } from "zustand";
import * as financeApi from "../api/finance.api";
import type {
  CategoryDto,
  CategoryInput,
  CreateExpenseInput,
  ExpenseDto,
  MonthlySummary,
  OverviewDto,
  SubscriptionsDto,
  UpdateExpenseInput,
} from "../api/finance.api";

interface FinanceState {
  expenses: ExpenseDto[];
  categories: CategoryDto[];
  summary: MonthlySummary | null;
  overview: OverviewDto | null;
  subscriptions: SubscriptionsDto | null;
  loading: boolean;
  fetchAll: () => Promise<void>;
  addExpense: (input: CreateExpenseInput) => Promise<void>;
  removeExpense: (id: string) => Promise<void>;
  updateExpense: (id: string, input: UpdateExpenseInput) => Promise<void>;
  setIncome: (monthlyIncome: number | null) => Promise<void>;
  setBudget: (category: string, monthlyLimit: number | null) => Promise<void>;
  addCategory: (name: string, color: string) => Promise<void>;
  editCategory: (id: string, input: CategoryInput) => Promise<void>;
  removeCategory: (id: string) => Promise<void>;
}

export const useFinanceStore = create<FinanceState>((set, get) => ({
  expenses: [],
  categories: [],
  summary: null,
  overview: null,
  subscriptions: null,
  loading: false,

  fetchAll: async () => {
    set({ loading: true });
    try {
      const [expenses, summary, categories, overview, subscriptions] = await Promise.all([
        financeApi.fetchExpenses(),
        financeApi.fetchSummary(),
        financeApi.fetchCategories(),
        financeApi.fetchOverview(),
        financeApi.fetchSubscriptions(),
      ]);
      set({ expenses, summary, categories, overview, subscriptions, loading: false });
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

  // The row changes at once so the table doesn't wait on the network; the refetch then brings
  // the budgets and totals that moved with it (and undoes the change if the server refused).
  updateExpense: async (id, input) => {
    set({ expenses: get().expenses.map((expense) => (expense.id === id ? { ...expense, ...input } : expense)) });
    try {
      await financeApi.updateExpense(id, input);
    } finally {
      await get().fetchAll();
    }
  },

  setIncome: async (monthlyIncome) => {
    await financeApi.setMonthlyIncome(monthlyIncome);
    await get().fetchAll();
  },

  setBudget: async (category, monthlyLimit) => {
    await financeApi.setBudget(category, monthlyLimit);
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
