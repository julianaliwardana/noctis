import { z } from "zod";

export const chatDto = z.object({
  message: z.string().min(1),
  /** Absent on the first message of a chat — the server opens a conversation and returns its id. */
  conversationId: z.string().optional(),
  /**
   * A model id from GET /ai/models. The agent only honours ids on the server's allowlist, so a
   * client can't route finance data anywhere else; an unknown id falls back to the default.
   * There is no provider field — a stale client still sending one has it stripped by zod.
   */
  model: z.string().max(200).optional(),
});

export const renameConversationDto = z.object({
  title: z.string().min(1).max(120),
});

export type ChatDto = z.infer<typeof chatDto>;
