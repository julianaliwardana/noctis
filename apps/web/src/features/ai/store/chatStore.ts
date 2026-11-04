import { create } from "zustand";
import { ApiError } from "@/lib/api";
import { useFinanceStore } from "@/features/finance/store/financeStore";
import { useHabitsStore } from "@/features/habits/store/habitsStore";
import { useTasksStore } from "@/features/tasks/store/tasksStore";
import * as chatApi from "../api/chat.api";
import type { ChatMessage, ConversationSummary, PendingDelete, StoredMessage } from "../types";

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

/** Saved replies lose their pendingDelete on purpose — the record id would be stale by now. */
function toChatMessage(stored: StoredMessage): ChatMessage {
  return {
    id: stored.id,
    role: stored.role === "user" ? "user" : "assistant",
    content: stored.content,
    actionLabel: stored.actionLabel ?? undefined,
  };
}

function assistantMessage(content: string, extra: Partial<ChatMessage> = {}): ChatMessage {
  return { id: crypto.randomUUID(), role: "assistant", content, ...extra };
}

interface ChatState {
  messages: ChatMessage[];
  conversations: ConversationSummary[];
  conversationId: string | null;
  sending: boolean;
  deletingId: string | null;
  /** Epoch ms until the picked model accepts requests again, or null when it is free. */
  cooldownUntil: number | null;
  send: (content: string) => Promise<void>;
  resolveDelete: (messageId: string, confirmed: boolean) => Promise<void>;
  loadConversations: () => Promise<void>;
  openConversation: (id: string) => Promise<void>;
  startNewChat: () => void;
  renameConversation: (id: string, title: string) => Promise<void>;
  removeConversation: (id: string) => Promise<void>;
}

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [],
  conversations: [],
  conversationId: null,
  sending: false,
  deletingId: null,
  cooldownUntil: null,

  send: async (content) => {
    const userMessage: ChatMessage = { id: crypto.randomUUID(), role: "user", content };
    set({ messages: [...get().messages, userMessage], sending: true });

    try {
      const response = await chatApi.sendChatMessage({
        message: content,
        conversationId: get().conversationId ?? undefined,
      });

      set({
        conversationId: response.conversationId,
        cooldownUntil: null,
        messages: [
          ...get().messages,
          assistantMessage(response.message, {
            actionLabel: response.action?.summary,
            pendingDelete: response.pendingDelete,
          }),
        ],
      });

      await get().loadConversations();
    } catch (error) {
      const limit =
        error instanceof ApiError && error.status === 429
          ? (error.data as { retryAfter?: number; scope?: "minute" | "day" })
          : null;
      set({
        cooldownUntil:
          limit && limit.scope !== "day" ? Date.now() + Number(limit.retryAfter ?? 60) * 1000 : null,
        messages: [
          ...get().messages,
          assistantMessage(
            limit === null
              ? "I couldn't reach the assistant just now. Try again in a moment."
              : limit.scope === "day"
                ? "Every free model has used up its quota for today. It resets tomorrow."
                : `All free models are busy. Try again in ${limit.retryAfter}s.`,
            { failed: true },
          ),
        ],
      });
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

  loadConversations: async () => {
    try {
      set({ conversations: await chatApi.fetchConversations() });
    } catch {
      // Keep whatever list is already on screen.
    }
  },

  openConversation: async (id) => {
    try {
      const conversation = await chatApi.fetchConversation(id);
      set({ conversationId: id, messages: conversation.messages.map(toChatMessage) });
    } catch {
      // Leave the current chat in place rather than blanking it.
    }
  },

  startNewChat: () => set({ conversationId: null, messages: [] }),

  renameConversation: async (id, title) => {
    try {
      const updated = await chatApi.renameConversation(id, title);
      set({
        conversations: get().conversations.map((entry) => (entry.id === id ? updated : entry)),
      });
    } catch {
      // The old title stays on screen, which is the truth until the server accepts the new one.
    }
  },

  removeConversation: async (id) => {
    try {
      await chatApi.deleteConversation(id);
    } catch {
      return; // Still on the server, so it stays in the list.
    }

    set({
      conversations: get().conversations.filter((entry) => entry.id !== id),
      ...(get().conversationId === id ? { conversationId: null, messages: [] } : {}),
    });
  },
}));
