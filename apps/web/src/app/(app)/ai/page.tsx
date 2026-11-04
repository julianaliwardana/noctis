"use client";

import { useState } from "react";
import { History } from "lucide-react";
import { ChatWindow } from "@/features/ai/ui/ChatWindow";
import { ConversationList } from "@/features/ai/ui/ConversationList";
import { useChat } from "@/features/ai/hooks/useChat";
import { Button } from "@/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/shared/components/ui/dialog";

export default function AiPage() {
  const { messages, sending, send, deletingId, resolveDelete, cooldownUntil } = useChat();
  const [historyOpen, setHistoryOpen] = useState(false);

  // Same contract as /pomodoro: cancel main's vertical padding and take --app-screen-h, so the
  // composer sits on the tab bar with nothing scrolling behind it. Desktop keeps h-full, where
  // <main> is still a bounded scroll container.
  return (
    <div className="mx-auto -mt-4 -mb-20 flex h-(--app-screen-h) min-h-0 w-full max-w-6xl gap-6 pt-4 md:mt-0 md:mb-0 md:h-full md:pt-0">
      <aside className="hidden w-60 shrink-0 flex-col border-r border-[var(--color-border)] pr-4 md:flex">
        <ConversationList />
      </aside>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h1 className="font-[family-name:var(--font-display)] text-2xl text-[var(--color-text)]">Noctis Chat</h1>
            <p className="text-sm text-[var(--color-text-muted)]">
              Create and delete tasks, habits, transactions and categories — by typing or by voice.
            </p>
          </div>

          <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
            <DialogTrigger asChild>
              <Button type="button" variant="ghost" size="icon" className="md:hidden" aria-label="Chat history">
                <History />
              </Button>
            </DialogTrigger>
            <DialogContent className="flex h-[70vh] max-w-sm flex-col">
              <DialogHeader>
                <DialogTitle>Chat history</DialogTitle>
              </DialogHeader>
              <ConversationList onPick={() => setHistoryOpen(false)} />
            </DialogContent>
          </Dialog>
        </div>

        <ChatWindow
          messages={messages}
          sending={sending}
          onSend={send}
          deletingId={deletingId}
          onResolveDelete={resolveDelete}
          cooldownUntil={cooldownUntil}
        />
      </div>
    </div>
  );
}
