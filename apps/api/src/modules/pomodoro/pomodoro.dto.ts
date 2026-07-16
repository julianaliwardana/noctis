import { z } from "zod";

export const createSessionDto = z.object({
  startedAt: z.coerce.date(),
  endedAt: z.coerce.date().optional(),
});
export type CreateSessionDto = z.infer<typeof createSessionDto>;
