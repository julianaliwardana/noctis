import { z } from "zod";

const HEX_COLOR = /^#[0-9a-f]{6}$/i;

export const createHabitDto = z.object({
  name: z.string().min(1),
  note: z.string().trim().max(500).optional(),
  daysOfWeek: z.array(z.number().int().min(0).max(6)).min(1).default([0, 1, 2, 3, 4, 5, 6]),
  durationMonths: z.union([z.literal(1), z.literal(2), z.literal(6)]).optional(),
  color: z.string().regex(HEX_COLOR).optional(),
});
export type CreateHabitDto = z.infer<typeof createHabitDto>;

export const logHabitDto = z.object({
  note: z.string().trim().max(500).optional(),
});
export type LogHabitDto = z.infer<typeof logHabitDto>;

export const updateHabitDto = z.object({
  color: z.string().regex(HEX_COLOR),
});
export type UpdateHabitDto = z.infer<typeof updateHabitDto>;
