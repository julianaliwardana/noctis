"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/shared/components/Modal";
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
    <Modal open={open} onClose={() => setOpen(false)} title="Ask Noctis" className="flex h-[70vh] max-w-lg flex-col">
      <ChatWindow messages={messages} sending={sending} onSend={send} />
    </Modal>
  );
}
