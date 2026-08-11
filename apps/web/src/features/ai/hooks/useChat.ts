"use client";

import { useChatStore } from "../store/chatStore";

export function useChat() {
  const messages = useChatStore((state) => state.messages);
  const sending = useChatStore((state) => state.sending);
  const send = useChatStore((state) => state.send);
  const deletingId = useChatStore((state) => state.deletingId);
  const resolveDelete = useChatStore((state) => state.resolveDelete);

  return { messages, sending, send, deletingId, resolveDelete };
}
