import { db } from "@noctis/db";
import type { ChatMessage, Conversation } from "@noctis/db";

export function findConversations(userId: string): Promise<Conversation[]> {
  return db.conversation.findMany({ where: { userId }, orderBy: { updatedAt: "desc" } });
}

export function findConversation(id: string, userId: string): Promise<(Conversation & { messages: ChatMessage[] }) | null> {
  return db.conversation.findFirst({
    where: { id, userId },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });
}

export function findMessages(conversationId: string): Promise<ChatMessage[]> {
  return db.chatMessage.findMany({ where: { conversationId }, orderBy: { createdAt: "asc" } });
}

export function createConversation(userId: string, title: string): Promise<Conversation> {
  return db.conversation.create({ data: { userId, title } });
}

export function appendMessage(
  conversationId: string,
  role: "user" | "assistant",
  content: string,
  actionLabel?: string,
): Promise<ChatMessage> {
  return db.chatMessage.create({ data: { conversationId, role, content, actionLabel } });
}

/** Bumps updatedAt so the history list stays in most-recent-first order. */
export function touchConversation(id: string): Promise<Conversation> {
  return db.conversation.update({ where: { id }, data: { updatedAt: new Date() } });
}

export async function renameConversation(id: string, userId: string, title: string): Promise<Conversation | null> {
  const { count } = await db.conversation.updateMany({ where: { id, userId }, data: { title } });
  return count === 0 ? null : db.conversation.findUnique({ where: { id } });
}

export async function deleteConversation(id: string, userId: string): Promise<boolean> {
  const { count } = await db.conversation.deleteMany({ where: { id, userId } });
  return count > 0;
}
