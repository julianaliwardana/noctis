import { db } from "@noctis/db";
import type { PomodoroSession } from "@noctis/db";
import type { CreateSessionDto } from "./pomodoro.dto";

export function findAllByUser(userId: string): Promise<PomodoroSession[]> {
  return db.pomodoroSession.findMany({ where: { userId }, orderBy: { startedAt: "desc" } });
}

export function create(userId: string, data: CreateSessionDto): Promise<PomodoroSession> {
  return db.pomodoroSession.create({ data: { ...data, userId } });
}
