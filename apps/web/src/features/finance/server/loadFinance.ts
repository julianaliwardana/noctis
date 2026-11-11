import { loadOrNull } from "@/lib/server/serverApi";
import type { FinanceSnapshot } from "../hooks/useFinance";
import type { CategoryDto, ExpenseDto, MonthlySummary, OverviewDto, SubscriptionsDto } from "../api/finance.api";

/** Same calls the finance store makes, done on the server. Null → the client fetches. */
export function loadFinance(): Promise<FinanceSnapshot | null> {
  return loadOrNull(async (get) => {
    const [expenses, summary, categories, overview, subscriptions] = await Promise.all([
      get<ExpenseDto[]>("/finance"),
      get<MonthlySummary>("/finance/summary"),
      get<CategoryDto[]>("/finance/categories"),
      get<OverviewDto>("/finance/overview"),
      get<SubscriptionsDto>("/finance/subscriptions"),
    ]);
    return { expenses, summary, categories, overview, subscriptions };
  });
}
