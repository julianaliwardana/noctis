"use client";

import { useTasksStore } from "../store/tasksStore";
import type { TaskDto } from "../api/tasks.api";

export function useTask(id: string): TaskDto | undefined {
  return useTasksStore((state) => state.tasks.find((task) => task.id === id));
}
