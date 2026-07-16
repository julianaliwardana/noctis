"use client";

import { useChatStore } from "../store/chatStore";

export function useChat() {
  const messages = useChatStore((state) => state.messages);
  const sending = useChatStore((state) => state.sending);
  const send = useChatStore((state) => state.send);

  return { messages, sending, send };
}
