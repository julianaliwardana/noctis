import { handleChat, type ChatResult } from "@noctis/agent";
import type { ChatMessage, Conversation } from "@noctis/db";
import * as aiRepository from "./ai.repository";
import type { ChatDto } from "./ai.dto";

export interface ChatReply extends ChatResult {
  conversationId: string;
}

/** First message doubles as the title until the user renames it — cheaper than asking the model. */
function titleFrom(message: string): string {
  const clean = message.trim().replace(/\s+/g, " ");
  return clean.length <= 60 ? clean : `${clean.slice(0, 57)}…`;
}

export async function sendMessage(userId: string, input: ChatDto): Promise<ChatReply | null> {
  const existing = input.conversationId
    ? await aiRepository.findConversation(input.conversationId, userId)
    : null;

  // A conversationId that isn't theirs (or no longer exists) is a 404, not a new chat.
  if (input.conversationId && !existing) return null;

  const history = existing?.messages.map((message) => ({ role: message.role, content: message.content })) ?? [];

  // The model runs before anything is written: a rate-limited retry would otherwise leave a trail
  // of empty conversations, and the client still holds the message to send again.
  const result = await handleChat(userId, input.message, { provider: input.provider, history });

  const conversation = existing ?? (await aiRepository.createConversation(userId, titleFrom(input.message)));
  await aiRepository.appendMessage(conversation.id, "user", input.message);
  // pendingDelete is deliberately not stored — its id would be stale by the time a chat is reopened.
  await aiRepository.appendMessage(conversation.id, "assistant", result.message, result.action?.summary);
  await aiRepository.touchConversation(conversation.id);

  return { ...result, conversationId: conversation.id };
}

export function listConversations(userId: string): Promise<Conversation[]> {
  return aiRepository.findConversations(userId);
}

export function getConversation(
  id: string,
  userId: string,
): Promise<(Conversation & { messages: ChatMessage[] }) | null> {
  return aiRepository.findConversation(id, userId);
}

export function renameConversation(id: string, userId: string, title: string): Promise<Conversation | null> {
  return aiRepository.renameConversation(id, userId, title);
}

export function deleteConversation(id: string, userId: string): Promise<boolean> {
  return aiRepository.deleteConversation(id, userId);
}
