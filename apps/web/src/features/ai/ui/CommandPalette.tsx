"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/shared/components/ui/dialog";
import { ChatWindow } from "./ChatWindow";
import { useChat } from "../hooks/useChat";

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const { messages, sending, send } = useChat();

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent): void {
      if ((event.metaKey || event.ctrlKey) && event.key === "k") {
        event.preventDefault();
        setOpen((prev) => !prev);
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="flex h-[70vh] max-w-lg flex-col sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Ask Noctis</DialogTitle>
        </DialogHeader>
        <ChatWindow messages={messages} sending={sending} onSend={send} />
      </DialogContent>
    </Dialog>
  );
}
