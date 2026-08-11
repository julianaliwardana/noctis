"use client";

import { useChatStore } from "../store/chatStore";

export function useChat() {
  const messages = useChatStore((state) => state.messages);
  const sending = useChatStore((state) => state.sending);
  const send = useChatStore((state) => state.send);
  const deletingId = useChatStore((state) => state.deletingId);
  const resolveDelete = useChatStore((state) => state.resolveDelete);
  const provider = useChatStore((state) => state.provider);
  const setProvider = useChatStore((state) => state.setProvider);
  const cooldownUntil = useChatStore((state) => state.cooldownUntil);

  return { messages, sending, send, deletingId, resolveDelete, provider, setProvider, cooldownUntil };
}
