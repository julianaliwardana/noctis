"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/shared/components/ui/dialog";
import { ChatWindow } from "./ChatWindow";
import { useChat } from "../hooks/useChat";
import { useChatStore } from "../store/chatStore";

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const { messages, sending, send, deletingId, resolveDelete, provider, setProvider, cooldownUntil } = useChat();
  const startNewChat = useChatStore((state) => state.startNewChat);

  const openRef = useRef(open);
  openRef.current = open;

  const handleOpenChange = useCallback(
    (next: boolean) => {
      // ⌘K is a scratchpad, not a way back into the last chat — every open starts fresh. The
      // conversation it creates still lands in history, so nothing typed here is lost.
      if (next) startNewChat();
      setOpen(next);
    },
    [startNewChat],
  );

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent): void {
      if ((event.metaKey || event.ctrlKey) && event.key === "k") {
        event.preventDefault();
        handleOpenChange(!openRef.current);
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleOpenChange]);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="flex h-[70vh] max-w-xl flex-col gap-3 sm:max-w-xl">
        <DialogHeader className="pr-8">
          <DialogTitle className="text-sm font-medium text-[var(--color-text-muted)]">Ask Noctis</DialogTitle>
        </DialogHeader>
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
      </DialogContent>
    </Dialog>
  );
}
