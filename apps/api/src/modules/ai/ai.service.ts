import { chatModels, handleChat, type ChatModel, type ChatResult } from "@noctis/agent";
import type { ChatMessage, Conversation } from "@noctis/db";
import { checkAllBudgetAlerts } from "../finance/finance.service";
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

  // Run the model before writing anything, so a rate-limited retry leaves no empty conversations.
  const result = await handleChat(userId, input.message, { history, model: input.model });

  // The agent writes to the database directly, so the budget alarm is checked here.
  if (result.actions?.some((action) => action.type === "ADD_TRANSACTION")) await checkAllBudgetAlerts(userId);

  const conversation = existing ?? (await aiRepository.createConversation(userId, titleFrom(input.message)));
  await aiRepository.appendMessage(conversation.id, "user", input.message);
  // pendingDelete isn't stored: its id would be stale by reopen. Actions are stored one per line.
  const actionLabel = result.actions?.map((action) => action.summary).join("\n") || undefined;
  await aiRepository.appendMessage(conversation.id, "assistant", result.message, actionLabel);
  await aiRepository.touchConversation(conversation.id);

  return { ...result, conversationId: conversation.id };
}

/** The picker's options — the server allowlist, first entry being the default. */
export function listModels(): { models: ChatModel[] } {
  return { models: chatModels() };
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
