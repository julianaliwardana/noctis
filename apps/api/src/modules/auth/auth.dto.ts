import { z } from "zod";

export const registerDto = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});
export type RegisterDto = z.infer<typeof registerDto>;

export const loginDto = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});
export type LoginDto = z.infer<typeof loginDto>;
