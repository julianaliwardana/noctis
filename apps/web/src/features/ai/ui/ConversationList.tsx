"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Check, MessageSquare, Pencil, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { cn } from "@/lib/utils";
import { useChatStore } from "../store/chatStore";

export interface ConversationListProps {
  /** Closes the sheet on mobile after picking a chat; the desktop column passes nothing. */
  onPick?: () => void;
}

export function ConversationList({ onPick }: ConversationListProps) {
  const conversations = useChatStore((state) => state.conversations);
  const conversationId = useChatStore((state) => state.conversationId);
  const loadConversations = useChatStore((state) => state.loadConversations);
  const openConversation = useChatStore((state) => state.openConversation);
  const startNewChat = useChatStore((state) => state.startNewChat);
  const renameConversation = useChatStore((state) => state.renameConversation);
  const removeConversation = useChatStore((state) => state.removeConversation);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  // Deleting is two clicks rather than a dialog: the second click on an armed row confirms.
  const [armedId, setArmedId] = useState<string | null>(null);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  function startRename(id: string, title: string): void {
    setArmedId(null);
    setEditingId(id);
    setDraft(title);
  }

  function saveRename(event: FormEvent): void {
    event.preventDefault();
    const title = draft.trim();
    if (editingId && title !== "") renameConversation(editingId, title);
    setEditingId(null);
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-2">
      <Button
        type="button"
        variant="outline"
        className="w-full justify-start"
        onClick={() => {
          startNewChat();
          onPick?.();
        }}
      >
        <Plus />
        New chat
      </Button>

      <div className="thin-scroll flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto">
        {conversations.length === 0 ? (
          <p className="px-2 py-6 text-center text-xs text-[var(--color-text-muted)]">
            Your chats show up here once you send a message.
          </p>
        ) : (
          conversations.map((conversation) =>
            editingId === conversation.id ? (
              <form key={conversation.id} onSubmit={saveRename} className="flex items-center gap-1 px-1 py-0.5">
                <Input
                  autoFocus
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  onKeyDown={(event) => event.key === "Escape" && setEditingId(null)}
                  aria-label="Chat title"
                  className="h-8 text-sm"
                />
                <Button type="submit" size="icon" variant="ghost" className="size-8 shrink-0" aria-label="Save title">
                  <Check />
                </Button>
              </form>
            ) : (
              <div
                key={conversation.id}
                className={cn(
                  "group flex items-center gap-1 rounded-lg px-1 transition-colors",
                  conversation.id === conversationId
                    ? "bg-[var(--color-primary)]/12"
                    : "hover:bg-[var(--color-surface)]",
                )}
              >
                <button
                  type="button"
                  onClick={() => {
                    openConversation(conversation.id);
                    onPick?.();
                  }}
                  className="flex min-w-0 flex-1 items-center gap-2 py-2 text-left text-sm text-[var(--color-text)]"
                >
                  <MessageSquare className="size-3.5 shrink-0 text-[var(--color-text-muted)]" />
                  <span className="truncate">{conversation.title}</span>
                </button>

                {armedId === conversation.id ? (
                  <>
                    <Button
                      type="button"
                      size="icon"
                      variant="destructive"
                      className="size-7 shrink-0"
                      aria-label={`Confirm delete ${conversation.title}`}
                      onClick={() => {
                        removeConversation(conversation.id);
                        setArmedId(null);
                      }}
                    >
                      <Check />
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="size-7 shrink-0"
                      aria-label="Cancel delete"
                      onClick={() => setArmedId(null)}
                    >
                      <X />
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="size-7 shrink-0 opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
                      aria-label={`Rename ${conversation.title}`}
                      onClick={() => startRename(conversation.id, conversation.title)}
                    >
                      <Pencil />
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="size-7 shrink-0 opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
                      aria-label={`Delete ${conversation.title}`}
                      onClick={() => setArmedId(conversation.id)}
                    >
                      <Trash2 />
                    </Button>
                  </>
                )}
              </div>
            ),
          )
        )}
      </div>
    </div>
  );
}
