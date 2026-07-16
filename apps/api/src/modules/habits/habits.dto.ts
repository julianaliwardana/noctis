import { z } from "zod";

export const createHabitDto = z.object({
  name: z.string().min(1),
  frequency: z.string().default("daily"),
});
export type CreateHabitDto = z.infer<typeof createHabitDto>;
