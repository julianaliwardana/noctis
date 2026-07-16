import { z } from "zod";

export const createPasswordDto = z.object({
  siteName: z.string().min(1),
  siteUrl: z.string().url().optional(),
  username: z.string().min(1),
  ciphertext: z.string().min(1),
  iv: z.string().min(1),
});
export type CreatePasswordDto = z.infer<typeof createPasswordDto>;
