import { apiFetch } from "@/lib/api";
import type { Task } from "@noctis/types";

export type TaskDto = Omit<Task, "dueAt" | "completedAt" | "createdAt"> & {
  dueAt: string | null;
  completedAt: string | null;
  createdAt: string;
};

export interface CreateTaskInput {
  title: string;
  notes?: string;
  dueAt?: string;
  recurrence?: string;
}

export function fetchTasks(): Promise<TaskDto[]> {
  return apiFetch<TaskDto[]>("/tasks");
}

export function createTask(input: CreateTaskInput): Promise<TaskDto> {
  return apiFetch<TaskDto>("/tasks", { method: "POST", body: JSON.stringify(input) });
}

export function completeTask(id: string): Promise<TaskDto> {
  return apiFetch<TaskDto>(`/tasks/${id}/complete`, { method: "POST" });
}

export function deleteTask(id: string): Promise<void> {
  return apiFetch<void>(`/tasks/${id}`, { method: "DELETE" });
}
