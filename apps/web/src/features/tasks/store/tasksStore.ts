import { create } from "zustand";
import * as tasksApi from "../api/tasks.api";
import type { CreateTaskInput, TaskDto } from "../api/tasks.api";

interface TasksState {
  tasks: TaskDto[];
  loading: boolean;
  fetchTasks: () => Promise<void>;
  addTask: (input: CreateTaskInput) => Promise<void>;
  completeTask: (id: string) => Promise<void>;
  removeTask: (id: string) => Promise<void>;
}

export const useTasksStore = create<TasksState>((set, get) => ({
  tasks: [],
  loading: false,

  fetchTasks: async () => {
    set({ loading: true });
    const tasks = await tasksApi.fetchTasks();
    set({ tasks, loading: false });
  },

  addTask: async (input) => {
    const task = await tasksApi.createTask(input);
    set({ tasks: [task, ...get().tasks] });
  },

  completeTask: async (id) => {
    const updated = await tasksApi.completeTask(id);
    set({ tasks: get().tasks.map((task) => (task.id === id ? updated : task)) });
  },

  removeTask: async (id) => {
    await tasksApi.deleteTask(id);
    set({ tasks: get().tasks.filter((task) => task.id !== id) });
  },
}));
