import type { Habit, HabitLog } from "@noctis/db";
import * as habitsRepository from "./habits.repository";
import type { CreateHabitDto } from "./habits.dto";

const DAY_MS = 24 * 60 * 60 * 1000;
const HEATMAP_DAYS = 91;

const COLOR_PALETTE = [
  "#4b8b5f",
  "#3a7ca5",
  "#d97757",
  "#a35ed9",
  "#c2574b",
  "#4baaa0",
  "#d9a441",
  "#6b7fd7",
];

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

export async function createHabit(userId: string, dto: CreateHabitDto): Promise<Habit> {
  const existing = await habitsRepository.findAllByUser(userId);
  const color = dto.color ?? (COLOR_PALETTE[existing.length % COLOR_PALETTE.length] as string);
  const endDate = dto.durationMonths ? addMonths(new Date(), dto.durationMonths) : null;
  return habitsRepository.create(userId, {
    name: dto.name,
    note: dto.note || null,
    daysOfWeek: dto.daysOfWeek,
    color,
    endDate,
  });
}

export async function deleteHabit(id: string, userId: string): Promise<boolean> {
  const habit = await habitsRepository.findById(id, userId);
  if (!habit) return false;
  await habitsRepository.remove(id);
  return true;
}

function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

export async function updateHabitColor(id: string, userId: string, color: string): Promise<Habit | null> {
  const habit = await habitsRepository.findById(id, userId);
  if (!habit) return null;
  return habitsRepository.update(id, { color });
}

export async function logHabit(
  id: string,
  userId: string,
  note?: string,
  date = new Date(),
): Promise<Habit | null> {
  const habit = await habitsRepository.findById(id, userId);
  if (!habit) return null;

  const existing = await habitsRepository.findLogForDate(id, date);
  if (existing) {
    if (note) await habitsRepository.updateLog(existing.id, note);
    return habit;
  }

  const latest = await habitsRepository.findLatestLog(id);
  const nextStreak = latest && isConsecutiveDay(latest.date, date) ? habit.streak + 1 : 1;

  await habitsRepository.createLog(id, date, note);
  return habitsRepository.update(id, {
    streak: nextStreak,
    longestStreak: Math.max(habit.longestStreak, nextStreak),
  });
}

export async function getLogs(id: string, userId: string): Promise<HabitLog[] | null> {
  const habit = await habitsRepository.findById(id, userId);
  if (!habit) return null;

  return habitsRepository.findLogsSince(id, new Date(Date.now() - HEATMAP_DAYS * DAY_MS));
}
