import { db } from "@noctis/db";
import type { Habit, HabitLog, Prisma } from "@noctis/db";

export function findAllByUser(userId: string): Promise<Habit[]> {
  return db.habit.findMany({ where: { userId }, orderBy: { createdAt: "desc" } });
}

export function findById(id: string, userId: string): Promise<Habit | null> {
  return db.habit.findFirst({ where: { id, userId } });
}

export interface NewHabit {
  name: string;
  note: string | null;
  daysOfWeek: number[];
  endDate: Date | null;
  color: string;
}

export function create(userId: string, data: NewHabit): Promise<Habit> {
  return db.habit.create({ data: { ...data, userId } });
}

export function remove(id: string): Promise<Habit> {
  return db.habit.delete({ where: { id } });
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

export function createLog(habitId: string, date: Date, note?: string): Promise<HabitLog> {
  return db.habitLog.create({ data: { habitId, date, note } });
}

export function updateLog(id: string, note: string): Promise<HabitLog> {
  return db.habitLog.update({ where: { id }, data: { note } });
}

export function findLogsSince(habitId: string, since: Date): Promise<HabitLog[]> {
  return db.habitLog.findMany({ where: { habitId, date: { gte: since } }, orderBy: { date: "asc" } });
}

export function findLatestLog(habitId: string): Promise<HabitLog | null> {
  return db.habitLog.findFirst({ where: { habitId }, orderBy: { date: "desc" } });
}
