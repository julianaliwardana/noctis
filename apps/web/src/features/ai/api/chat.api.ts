import { api } from "@/lib/api";
import type { ConversationDetail, ConversationSummary, PendingDelete, ProviderName } from "../types";

export interface ChatResponse {
  message: string;
  action?: { type: string; summary: string };
  pendingDelete?: PendingDelete;
  conversationId: string;
}

export interface SendChatInput {
  message: string;
  conversationId?: string;
  provider: ProviderName;
}

export function sendChatMessage(input: SendChatInput): Promise<ChatResponse> {
  return api.post<ChatResponse>("/ai/chat", input);
}

export function fetchConversations(): Promise<ConversationSummary[]> {
  return api.get<ConversationSummary[]>("/ai/conversations");
}

export function fetchConversation(id: string): Promise<ConversationDetail> {
  return api.get<ConversationDetail>(`/ai/conversations/${id}`);
}

export function renameConversation(id: string, title: string): Promise<ConversationSummary> {
  return api.patch<ConversationSummary>(`/ai/conversations/${id}`, { title });
}

export function deleteConversation(id: string): Promise<void> {
  return api.delete(`/ai/conversations/${id}`);
}
