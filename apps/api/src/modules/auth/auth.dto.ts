import { z } from "zod";

/** Lowercased before validation so `Julian@…` and `julian@…` are one account. */
export const emailField = z.string().trim().toLowerCase().email().max(254);

/**
 * bcrypt only reads the first 72 *bytes*; anything after is silently ignored. Counting characters
 * let a 72-character password with emoji or accented letters through with its tail discarded.
 */
const newPassword = z
  .string()
  .min(8)
  .refine((value) => Buffer.byteLength(value, "utf8") <= 72, {
    message: "Password must be at most 72 bytes",
  });

export const registerDto = z.object({
  email: emailField,
  password: newPassword,
});
export type RegisterDto = z.infer<typeof registerDto>;

export const loginDto = z.object({
  email: emailField,
  // No length rules on login: a wrong password should get "Invalid credentials", not a 400.
  password: z.string().min(1).max(1024),
});
export type LoginDto = z.infer<typeof loginDto>;
