import { z } from "zod";

/** The server only ever sees base64 blobs — it validates shape, never content. */
const base64 = z.string().min(1).max(20_000);

export const vaultItemDto = z.object({
  ciphertext: base64,
  iv: base64,
});
export type VaultItemDto = z.infer<typeof vaultItemDto>;

export const vaultKeyDto = z.object({
  salt: base64,
  iterations: z.number().int().min(100_000).max(10_000_000),
  wrappedKey: base64,
  wrapIv: base64,
});
export type VaultKeyDto = z.infer<typeof vaultKeyDto>;
