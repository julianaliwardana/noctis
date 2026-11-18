import { z } from "zod";

export const chatDto = z.object({
  message: z.string().min(1),
  /** Absent on the first message of a chat — the server opens a conversation and returns its id. */
  conversationId: z.string().optional(),
  /** Must be on the server's allowlist (GET /ai/models); unknown ids fall back to the default. */
  model: z.string().max(200).optional(),
});

export const renameConversationDto = z.object({
  title: z.string().min(1).max(120),
});

export type ChatDto = z.infer<typeof chatDto>;
