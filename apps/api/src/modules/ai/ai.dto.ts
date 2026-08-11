import { z } from "zod";
import { PROVIDERS } from "@noctis/agent";

export const chatDto = z.object({
  message: z.string().min(1),
  /** Absent on the first message of a chat — the server opens a conversation and returns its id. */
  conversationId: z.string().optional(),
  provider: z.enum(PROVIDERS).optional(),
});

export const renameConversationDto = z.object({
  title: z.string().min(1).max(120),
});

export type ChatDto = z.infer<typeof chatDto>;
