import { db } from "@noctis/db";
import type { Prisma, Task } from "@noctis/db";
import type { CreateTaskDto } from "./tasks.dto";

export function findAllByUser(userId: string): Promise<Task[]> {
  return db.task.findMany({ where: { userId }, orderBy: { createdAt: "desc" } });
}

export function findById(id: string, userId: string): Promise<Task | null> {
  return db.task.findFirst({ where: { id, userId } });
}

export function create(userId: string, data: CreateTaskDto): Promise<Task> {
  return db.task.create({ data: { ...data, userId } });
}

/** An unfinished task with exactly this title (case-insensitive), if any. */
export function findOpenByTitle(userId: string, title: string): Promise<Task | null> {
  return db.task.findFirst({ where: { userId, completed: false, title: { equals: title, mode: "insensitive" } } });
}

export function update(id: string, data: Prisma.TaskUpdateInput): Promise<Task> {
  return db.task.update({ where: { id }, data });
}

export function remove(id: string): Promise<Task> {
  return db.task.delete({ where: { id } });
}
