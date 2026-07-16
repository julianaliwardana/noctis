import type { Task } from "@noctis/db";
import * as tasksRepository from "./tasks.repository";
import type { CreateTaskDto, UpdateTaskDto } from "./tasks.dto";

export function isOverdue(task: Task): boolean {
  return !task.completed && task.dueAt !== null && task.dueAt < new Date();
}

function nextDueDate(current: Date, recurrence: string): Date {
  const next = new Date(current);
  if (recurrence.includes("FREQ=DAILY")) next.setDate(next.getDate() + 1);
  else if (recurrence.includes("FREQ=WEEKLY")) next.setDate(next.getDate() + 7);
  else if (recurrence.includes("FREQ=MONTHLY")) next.setMonth(next.getMonth() + 1);
  return next;
}

export function listTasks(userId: string): Promise<Task[]> {
  return tasksRepository.findAllByUser(userId);
}

export function createTask(userId: string, dto: CreateTaskDto): Promise<Task> {
  return tasksRepository.create(userId, dto);
}

export async function completeTask(id: string, userId: string): Promise<Task | null> {
  const task = await tasksRepository.findById(id, userId);
  if (!task) return null;

  if (task.recurrence && task.dueAt) {
    return tasksRepository.update(id, { dueAt: nextDueDate(task.dueAt, task.recurrence) });
  }

  return tasksRepository.update(id, { completed: true, completedAt: new Date() });
}

export async function updateTask(id: string, userId: string, dto: UpdateTaskDto): Promise<Task | null> {
  const existing = await tasksRepository.findById(id, userId);
  if (!existing) return null;
  return tasksRepository.update(id, dto);
}

export async function deleteTask(id: string, userId: string): Promise<boolean> {
  const existing = await tasksRepository.findById(id, userId);
  if (!existing) return false;
  await tasksRepository.remove(id);
  return true;
}
