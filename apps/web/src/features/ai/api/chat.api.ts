import { api } from "@/lib/api";
import type { ChatModel, ConversationDetail, ConversationSummary, PendingDelete } from "../types";

export interface ChatResponse {
  message: string;
  actions?: { type: string; summary: string }[];
  pendingDelete?: PendingDelete;
  model?: string;
  conversationId: string;
}

export interface SendChatInput {
  message: string;
  conversationId?: string;
  model?: string;
}

export function sendChatMessage(input: SendChatInput): Promise<ChatResponse> {
  return api.post<ChatResponse>("/ai/chat", input);
}

export async function fetchModels(): Promise<ChatModel[]> {
  return (await api.get<{ models: ChatModel[] }>("/ai/models")).models;
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
