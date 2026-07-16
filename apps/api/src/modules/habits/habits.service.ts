import type { Habit, HabitLog } from "@noctis/db";
import * as habitsRepository from "./habits.repository";
import type { CreateHabitDto } from "./habits.dto";

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

function isConsecutiveDay(previous: Date, current: Date): boolean {
  const previousDay = new Date(previous);
  previousDay.setHours(0, 0, 0, 0);
  const currentDay = new Date(current);
  currentDay.setHours(0, 0, 0, 0);
  return currentDay.getTime() - previousDay.getTime() === DAY_MS;
}

export function listHabits(userId: string): Promise<Habit[]> {
  return habitsRepository.findAllByUser(userId);
}

export function createHabit(userId: string, dto: CreateHabitDto): Promise<Habit> {
  return habitsRepository.create(userId, dto);
}

export async function logHabit(id: string, userId: string, date = new Date()): Promise<Habit | null> {
  const habit = await habitsRepository.findById(id, userId);
  if (!habit) return null;

  const existing = await habitsRepository.findLogForDate(id, date);
  if (existing) return habit;

  const latest = await habitsRepository.findLatestLog(id);
  const nextStreak = latest && isConsecutiveDay(latest.date, date) ? habit.streak + 1 : 1;

  await habitsRepository.createLog(id, date);
  return habitsRepository.update(id, { streak: nextStreak });
}

export async function getWeekLogs(id: string, userId: string): Promise<HabitLog[] | null> {
  const habit = await habitsRepository.findById(id, userId);
  if (!habit) return null;

  return habitsRepository.findLogsSince(id, new Date(Date.now() - WEEK_MS));
}
