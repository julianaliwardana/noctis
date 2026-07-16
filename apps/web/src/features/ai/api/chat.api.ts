import { apiFetch } from "@/lib/api";

export interface ChatResponse {
  message: string;
  action?: { type: string; summary: string };
}

export function sendChatMessage(message: string): Promise<ChatResponse> {
  return apiFetch<ChatResponse>("/ai/chat", { method: "POST", body: JSON.stringify({ message }) });
}
