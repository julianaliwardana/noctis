import { z } from "zod";

export const createTaskDto = z.object({
  title: z.string().min(1),
  notes: z.string().optional(),
  dueAt: z.coerce.date().optional(),
  recurrence: z.string().optional(),
});
export type CreateTaskDto = z.infer<typeof createTaskDto>;

export const updateTaskDto = z.object({
  title: z.string().min(1).optional(),
  notes: z.string().optional(),
  dueAt: z.coerce.date().optional(),
  completed: z.boolean().optional(),
  recurrence: z.string().optional(),
});
export type UpdateTaskDto = z.infer<typeof updateTaskDto>;
