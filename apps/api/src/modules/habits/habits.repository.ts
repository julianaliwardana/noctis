import { db } from "@noctis/db";
import type { Habit, HabitLog, Prisma } from "@noctis/db";
import type { CreateHabitDto } from "./habits.dto";

export function findAllByUser(userId: string): Promise<Habit[]> {
  return db.habit.findMany({ where: { userId }, orderBy: { createdAt: "desc" } });
}

export function findById(id: string, userId: string): Promise<Habit | null> {
  return db.habit.findFirst({ where: { id, userId } });
}

export function create(userId: string, data: CreateHabitDto): Promise<Habit> {
  return db.habit.create({ data: { ...data, userId } });
}

export function update(id: string, data: Prisma.HabitUpdateInput): Promise<Habit> {
  return db.habit.update({ where: { id }, data });
}

export function findLogForDate(habitId: string, date: Date): Promise<HabitLog | null> {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  return db.habitLog.findFirst({ where: { habitId, date: { gte: start, lt: end } } });
}

export function createLog(habitId: string, date: Date): Promise<HabitLog> {
  return db.habitLog.create({ data: { habitId, date } });
}

export function findLogsSince(habitId: string, since: Date): Promise<HabitLog[]> {
  return db.habitLog.findMany({ where: { habitId, date: { gte: since } }, orderBy: { date: "asc" } });
}

export function findLatestLog(habitId: string): Promise<HabitLog | null> {
  return db.habitLog.findFirst({ where: { habitId }, orderBy: { date: "desc" } });
}
