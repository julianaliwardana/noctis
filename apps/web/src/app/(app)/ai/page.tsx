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
  const { messages, sending, send, deletingId, resolveDelete, provider, setProvider, cooldownUntil } = useChat();
  const [historyOpen, setHistoryOpen] = useState(false);

  // h-full fills whatever <main> gives it — the old calc() guessed at the header and tab bar and
  // came out ~25px too tall on mobile, which is what pushed the whole page into scrolling.
  return (
    <div className="mx-auto flex h-full min-h-0 w-full max-w-6xl gap-6">
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
          provider={provider}
          onProviderChange={setProvider}
          cooldownUntil={cooldownUntil}
        />
      </div>
    </div>
  );
}
