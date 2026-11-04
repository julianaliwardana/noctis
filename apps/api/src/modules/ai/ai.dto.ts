import { z } from "zod";

export const chatDto = z.object({
  message: z.string().min(1),
  /** Absent on the first message of a chat — the server opens a conversation and returns its id. */
  conversationId: z.string().optional(),
  // No provider field: the model is the server's AI_PROVIDER, so a client can't route finance
  // data to another upstream. A stale client still sending one has it stripped by zod.
});

export const renameConversationDto = z.object({
  title: z.string().min(1).max(120),
});

export type ChatDto = z.infer<typeof chatDto>;
