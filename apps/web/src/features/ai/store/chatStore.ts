import { create } from "zustand";
import { sendChatMessage } from "../api/chat.api";
import type { ChatMessage } from "../types";

interface ChatState {
  messages: ChatMessage[];
  sending: boolean;
  send: (content: string) => Promise<void>;
}

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [],
  sending: false,

  send: async (content) => {
    const userMessage: ChatMessage = { id: crypto.randomUUID(), role: "user", content };
    set({ messages: [...get().messages, userMessage], sending: true });

    try {
      const response = await sendChatMessage(content);
      const assistantMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: response.message,
        actionLabel: response.action?.summary,
      };
      set({ messages: [...get().messages, assistantMessage] });
    } catch {
      const fallback: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: "I couldn't reach the assistant just now. Try again in a moment.",
      };
      set({ messages: [...get().messages, fallback] });
    } finally {
      set({ sending: false });
    }
  },
}));
