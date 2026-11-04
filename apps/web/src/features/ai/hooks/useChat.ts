"use client";

import { useEffect } from "react";
import { useChatStore } from "../store/chatStore";

export function useChat() {
  const messages = useChatStore((state) => state.messages);
  const sending = useChatStore((state) => state.sending);
  const send = useChatStore((state) => state.send);
  const deletingId = useChatStore((state) => state.deletingId);
  const resolveDelete = useChatStore((state) => state.resolveDelete);
  const cooldownUntil = useChatStore((state) => state.cooldownUntil);
  const models = useChatStore((state) => state.models);
  const model = useChatStore((state) => state.model);
  const setModel = useChatStore((state) => state.setModel);
  const loadModels = useChatStore((state) => state.loadModels);

  useEffect(() => {
    if (models.length === 0) void loadModels();
  }, [models.length, loadModels]);

  return { messages, sending, send, deletingId, resolveDelete, cooldownUntil, models, model, setModel };
}
