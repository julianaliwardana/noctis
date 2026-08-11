import { api } from "@/lib/api";
import type { PendingDelete } from "../types";

export interface ChatResponse {
  message: string;
  action?: { type: string; summary: string };
  pendingDelete?: PendingDelete;
}

export function sendChatMessage(message: string): Promise<ChatResponse> {
  return api.post<ChatResponse>("/ai/chat", { message });
}
