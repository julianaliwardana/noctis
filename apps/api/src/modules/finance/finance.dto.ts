import { z } from "zod";

export const createExpenseDto = z.object({
  title: z.string().min(1),
  amount: z.number().positive(),
  category: z.string().min(1),
  type: z.enum(["income", "expense"]).default("expense"),
  date: z.coerce.date().optional(),
});
export type CreateExpenseDto = z.infer<typeof createExpenseDto>;

const HEX_COLOR = /^#[0-9a-f]{6}$/i;

export const createCategoryDto = z.object({
  name: z.string().trim().min(1).max(40),
  color: z.string().regex(HEX_COLOR).optional(),
});
export type CreateCategoryDto = z.infer<typeof createCategoryDto>;

export const updateCategoryDto = z
  .object({
    name: z.string().trim().min(1).max(40).optional(),
    color: z.string().regex(HEX_COLOR).optional(),
  })
  .refine((body) => body.name !== undefined || body.color !== undefined, {
    message: "Nothing to update",
  });
export type UpdateCategoryDto = z.infer<typeof updateCategoryDto>;

export const summaryQueryDto = z.object({
  month: z.coerce.number().int().min(1).max(12).optional(),
  year: z.coerce.number().int().optional(),
});
export type SummaryQueryDto = z.infer<typeof summaryQueryDto>;
