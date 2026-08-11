import { api } from "@/lib/api";
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
  return api.get<HabitDto[]>("/habits");
}

export function createHabit(input: CreateHabitInput): Promise<HabitDto> {
  return api.post<HabitDto>("/habits", input);
}

export function logHabit(id: string, note?: string): Promise<HabitDto> {
  return api.post<HabitDto>(`/habits/${id}/log`, { note });
}

export function fetchHabitLogs(id: string): Promise<HabitLogDto[]> {
  return api.get<HabitLogDto[]>(`/habits/${id}/logs`);
}

export function updateHabitColor(id: string, color: string): Promise<HabitDto> {
  return api.patch<HabitDto>(`/habits/${id}`, { color });
}

export function deleteHabit(id: string): Promise<void> {
  return api.delete(`/habits/${id}`);
}
