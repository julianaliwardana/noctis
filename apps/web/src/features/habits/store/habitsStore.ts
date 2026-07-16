import { create } from "zustand";
import * as habitsApi from "../api/habits.api";
import type { CreateHabitInput, HabitDto, HabitLogDto } from "../api/habits.api";

interface HabitsState {
  habits: HabitDto[];
  logs: Record<string, HabitLogDto[]>;
  loading: boolean;
  fetchHabits: () => Promise<void>;
  addHabit: (input: CreateHabitInput) => Promise<void>;
  logHabit: (id: string) => Promise<void>;
  fetchLogs: (id: string) => Promise<void>;
}

export const useHabitsStore = create<HabitsState>((set, get) => ({
  habits: [],
  logs: {},
  loading: false,

  fetchHabits: async () => {
    set({ loading: true });
    const habits = await habitsApi.fetchHabits();
    set({ habits, loading: false });
  },

  addHabit: async (input) => {
    const habit = await habitsApi.createHabit(input);
    set({ habits: [habit, ...get().habits] });
  },

  logHabit: async (id) => {
    const updated = await habitsApi.logHabit(id);
    set({ habits: get().habits.map((habit) => (habit.id === id ? updated : habit)) });
    await get().fetchLogs(id);
  },

  fetchLogs: async (id) => {
    const logs = await habitsApi.fetchHabitLogs(id);
    set({ logs: { ...get().logs, [id]: logs } });
  },
}));
