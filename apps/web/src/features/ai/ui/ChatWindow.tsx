"use client";

import { useState, type FormEvent } from "react";
import { Input } from "@/shared/components/Input";
import { Button } from "@/shared/components/Button";
import { cn } from "@/shared/utils/cn";
import type { ChatMessage } from "../types";

export interface ChatWindowProps {
  messages: ChatMessage[];
  sending: boolean;
  onSend: (message: string) => void;
}

export function ChatWindow({ messages, sending, onSend }: ChatWindowProps) {
  const [input, setInput] = useState("");

  function handleSubmit(event: FormEvent): void {
    event.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || sending) return;
    onSend(trimmed);
    setInput("");
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto">
        {messages.length === 0 ? (
          <p className="text-sm text-[var(--color-text-muted)]">
            Ask about your day, add a task, or log an expense — I&apos;ll take it from here.
          </p>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                "max-w-[80%] rounded-xl px-3 py-2 text-sm",
                message.role === "user"
                  ? "self-end bg-[var(--color-primary)] text-[var(--color-primary-fg)]"
                  : "self-start bg-[var(--color-border)]/30 text-[var(--color-text)]",
              )}
            >
              <p>{message.content}</p>
              {message.actionLabel && (
                <p className="mt-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1 text-xs text-[var(--color-text-muted)]">
                  ✓ {message.actionLabel}
                </p>
              )}
            </div>
          ))
        )}
        {sending && <p className="text-xs text-[var(--color-text-muted)]">Thinking…</p>}
      </div>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <Input
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Ask anything…"
          aria-label="Message"
          className="flex-1"
        />
        <Button type="submit" disabled={sending}>
          Send
        </Button>
      </form>
    </div>
  );
}
