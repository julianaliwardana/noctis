import { apiFetch } from "@/lib/api";
import type { Habit, HabitLog } from "@noctis/types";

export type HabitDto = Omit<Habit, "createdAt"> & { createdAt: string };
export type HabitLogDto = Omit<HabitLog, "date" | "createdAt"> & { date: string; createdAt: string };

export interface CreateHabitInput {
  name: string;
  frequency?: string;
}

export function fetchHabits(): Promise<HabitDto[]> {
  return apiFetch<HabitDto[]>("/habits");
}

export function createHabit(input: CreateHabitInput): Promise<HabitDto> {
  return apiFetch<HabitDto>("/habits", { method: "POST", body: JSON.stringify(input) });
}

export function logHabit(id: string): Promise<HabitDto> {
  return apiFetch<HabitDto>(`/habits/${id}/log`, { method: "POST" });
}

export function fetchHabitLogs(id: string): Promise<HabitLogDto[]> {
  return apiFetch<HabitLogDto[]>(`/habits/${id}/logs`);
}
