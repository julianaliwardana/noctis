import { api } from "@/lib/api";
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
  return api.get<TaskDto[]>("/tasks");
}

export function createTask(input: CreateTaskInput): Promise<TaskDto> {
  return api.post<TaskDto>("/tasks", input);
}

export function completeTask(id: string): Promise<TaskDto> {
  return api.post<TaskDto>(`/tasks/${id}/complete`);
}

export function deleteTask(id: string): Promise<void> {
  return api.delete(`/tasks/${id}`);
}
