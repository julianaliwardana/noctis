import { apiFetch } from "@/lib/api";
import type { Habit, HabitLog } from "@noctis/types";

export type HabitDto = Omit<Habit, "createdAt" | "endDate"> & { createdAt: string; endDate: string | null };
export type HabitLogDto = Omit<HabitLog, "date" | "createdAt"> & { date: string; createdAt: string };

export interface CreateHabitInput {
  name: string;
  note?: string;
  daysOfWeek: number[];
  durationMonths?: 1 | 2 | 6;
  color?: string;
}

export function fetchHabits(): Promise<HabitDto[]> {
  return apiFetch<HabitDto[]>("/habits");
}

export function createHabit(input: CreateHabitInput): Promise<HabitDto> {
  return apiFetch<HabitDto>("/habits", { method: "POST", body: JSON.stringify(input) });
}

export function logHabit(id: string, note?: string): Promise<HabitDto> {
  return apiFetch<HabitDto>(`/habits/${id}/log`, { method: "POST", body: JSON.stringify({ note }) });
}

export function fetchHabitLogs(id: string): Promise<HabitLogDto[]> {
  return apiFetch<HabitLogDto[]>(`/habits/${id}/logs`);
}

export function updateHabitColor(id: string, color: string): Promise<HabitDto> {
  return apiFetch<HabitDto>(`/habits/${id}`, { method: "PATCH", body: JSON.stringify({ color }) });
}

export function deleteHabit(id: string): Promise<void> {
  return apiFetch<void>(`/habits/${id}`, { method: "DELETE" });
}
