import { loadOrNull } from "@/lib/server/serverApi";
import type { DashboardSnapshot } from "../ui/DashboardView";
import type { TaskDto } from "@/features/tasks/api/tasks.api";
import type { HabitDto, HabitLogDto } from "@/features/habits/api/habits.api";
import type { CategoryDto, ExpenseDto, MonthlySummary } from "@/features/finance/api/finance.api";
import type { UserDto } from "@/features/auth/api/user.api";

/** Dashboard data in parallel, habit logs included. Null → the client fetches. */
export function loadDashboard(): Promise<DashboardSnapshot | null> {
  return loadOrNull(async (get) => {
    const [tasks, habits, expenses, summary, categories, user] = await Promise.all([
      get<TaskDto[]>("/tasks"),
      get<HabitDto[]>("/habits"),
      get<ExpenseDto[]>("/finance"),
      get<MonthlySummary>("/finance/summary"),
      get<CategoryDto[]>("/finance/categories"),
      get<UserDto>("/user/me"),
    ]);
    const logEntries = await Promise.all(
      habits.map(async (habit) => [habit.id, await get<HabitLogDto[]>(`/habits/${habit.id}/logs`)] as const),
    );

    return {
      tasks: { tasks },
      habits: { habits, logs: Object.fromEntries(logEntries) },
      finance: { expenses, summary, categories },
      user: { user },
    };
  });
}
