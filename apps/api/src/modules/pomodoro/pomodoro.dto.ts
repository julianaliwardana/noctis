import { z } from "zod";

export const createSessionDto = z.object({
  phase: z.enum(["focus", "short", "long"]).default("focus"),
  startedAt: z.coerce.date(),
  endedAt: z.coerce.date().optional(),
});
export type CreateSessionDto = z.infer<typeof createSessionDto>;
