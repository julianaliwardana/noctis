import type { PomodoroSession } from "@noctis/db";
import * as pomodoroRepository from "./pomodoro.repository";
import type { CreateSessionDto } from "./pomodoro.dto";

export function listSessions(userId: string): Promise<PomodoroSession[]> {
  return pomodoroRepository.findAllByUser(userId);
}

export function recordSession(userId: string, dto: CreateSessionDto): Promise<PomodoroSession> {
  return pomodoroRepository.create(userId, dto);
}
