import { db } from "@noctis/db";
import type { PomodoroSession } from "@noctis/db";
import type { CreateSessionDto } from "./pomodoro.dto";

export function findAllByUser(userId: string): Promise<PomodoroSession[]> {
  return db.pomodoroSession.findMany({ where: { userId }, orderBy: { startedAt: "desc" } });
}

export function create(userId: string, data: CreateSessionDto): Promise<PomodoroSession> {
  return db.pomodoroSession.create({ data: { ...data, userId } });
}

/** Sessions that started in [start, end), oldest first. */
export function findStartedInRange(userId: string, start: Date, end: Date): Promise<PomodoroSession[]> {
  return db.pomodoroSession.findMany({ where: { userId, startedAt: { gte: start, lt: end } }, orderBy: { startedAt: "asc" } });
}
