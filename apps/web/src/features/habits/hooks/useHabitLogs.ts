"use client";

import { useEffect } from "react";
import { useHabitsStore } from "../store/habitsStore";
import type { HabitLogDto } from "../api/habits.api";

export function useHabitLogs(habitId: string): HabitLogDto[] {
  const logs = useHabitsStore((state) => state.logs[habitId]);
  const fetchLogs = useHabitsStore((state) => state.fetchLogs);

  useEffect(() => {
    fetchLogs(habitId);
  }, [habitId, fetchLogs]);

  return logs ?? [];
}
