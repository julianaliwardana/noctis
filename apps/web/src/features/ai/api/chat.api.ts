import { api } from "@/lib/api";

export interface ChatResponse {
  message: string;
  action?: { type: string; summary: string };
}

export function sendChatMessage(message: string): Promise<ChatResponse> {
  return api.post<ChatResponse>("/ai/chat", { message });
}
