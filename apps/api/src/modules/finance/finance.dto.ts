import { z } from "zod";

export const createExpenseDto = z.object({
  title: z.string().min(1),
  amount: z.number().positive(),
  category: z.string().min(1),
  type: z.enum(["income", "expense"]).default("expense"),
  date: z.coerce.date().optional(),
});
export type CreateExpenseDto = z.infer<typeof createExpenseDto>;

export const summaryQueryDto = z.object({
  month: z.coerce.number().int().min(1).max(12).optional(),
  year: z.coerce.number().int().optional(),
});
export type SummaryQueryDto = z.infer<typeof summaryQueryDto>;
