import { create } from "zustand";
import { useFinanceStore } from "@/features/finance/store/financeStore";
import { useHabitsStore } from "@/features/habits/store/habitsStore";
import { useTasksStore } from "@/features/tasks/store/tasksStore";
import { sendChatMessage } from "../api/chat.api";
import type { ChatMessage, PendingDelete } from "../types";

/**
 * The assistant only ever proposes a delete. Confirming runs it through the same store action the
 * UI uses, so the list on screen updates and ownership is checked server-side as usual.
 */
const runDelete: Record<PendingDelete["kind"], (id: string) => Promise<void>> = {
  task: (id) => useTasksStore.getState().removeTask(id),
  habit: (id) => useHabitsStore.getState().deleteHabit(id),
  transaction: (id) => useFinanceStore.getState().removeExpense(id),
  category: (id) => useFinanceStore.getState().removeCategory(id),
};

interface ChatState {
  messages: ChatMessage[];
  sending: boolean;
  deletingId: string | null;
  send: (content: string) => Promise<void>;
  resolveDelete: (messageId: string, confirmed: boolean) => Promise<void>;
}

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [],
  sending: false,
  deletingId: null,

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
        pendingDelete: response.pendingDelete,
      };
      set({ messages: [...get().messages, assistantMessage] });
    } catch {
      const fallback: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: "I couldn't reach the assistant just now. Try again in a moment.",
        failed: true,
      };
      set({ messages: [...get().messages, fallback] });
    } finally {
      set({ sending: false });
    }
  },

  resolveDelete: async (messageId, confirmed) => {
    const message = get().messages.find((entry) => entry.id === messageId);
    const pending = message?.pendingDelete;
    if (!pending || get().deletingId !== null) return;

    function settle(patch: Partial<ChatMessage>): void {
      set({
        deletingId: null,
        messages: get().messages.map((entry) =>
          entry.id === messageId ? { ...entry, pendingDelete: undefined, ...patch } : entry,
        ),
      });
    }

    if (!confirmed) {
      settle({ actionLabel: `Kept ${pending.label}` });
      return;
    }

    set({ deletingId: messageId });
    try {
      await runDelete[pending.kind](pending.id);
      settle({ actionLabel: `Deleted ${pending.label}` });
    } catch {
      settle({ content: `I couldn't delete "${pending.label}". Try again from the ${pending.kind} list.`, failed: true });
    }
  },
}));
