"use client";

import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { AlertTriangle, ArrowUp, Mic, Send, Sparkles, Square } from "lucide-react";
import { Textarea } from "@/shared/components/ui/textarea";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { cn } from "@/lib/utils";
import { useSpeechRecognition } from "../hooks/useSpeechRecognition";
import type { ChatMessage } from "../types";

export interface ChatWindowProps {
  messages: ChatMessage[];
  sending: boolean;
  onSend: (message: string) => void;
}

const SUGGESTIONS = [
  "What's on my plate today?",
  "Add a task to call the bank tomorrow at 10am",
  "Log 45k for lunch under Food",
  "How much did I spend this month?",
];

export function ChatWindow({ messages, sending, onSend }: ChatWindowProps) {
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const speech = useSpeechRecognition((text) => {
    if (text === "") return;
    setInput((current) => (current === "" ? text : `${current} ${text}`));
    textareaRef.current?.focus();
  });

  // Keep the newest message in view as the conversation and the thinking indicator grow.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length, sending]);

  // Auto-grow the composer up to a few lines, then let it scroll.
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 160)}px`;
  }, [input]);

  function submit(value: string): void {
    const trimmed = value.trim();
    if (trimmed === "" || sending) return;
    onSend(trimmed);
    setInput("");
  }

  function handleSubmit(event: FormEvent): void {
    event.preventDefault();
    submit(input);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>): void {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      submit(input);
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div ref={scrollRef} className="thin-scroll flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto pr-1">
        {messages.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-5 px-4 text-center">
            <span
              aria-hidden
              className="flex size-11 items-center justify-center rounded-2xl bg-[var(--color-primary)]/12 text-[var(--color-primary)]"
            >
              <Sparkles className="size-5" />
            </span>
            <div>
              <p className="text-sm font-medium text-[var(--color-text)]">Ask Noctis</p>
              <p className="mt-1 text-sm text-[var(--color-text-muted)]">
                Tasks, habits and money — ask a question or just tell me what to do.
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              {SUGGESTIONS.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => submit(suggestion)}
                  className="rounded-full border border-[var(--color-border)] px-3 py-1.5 text-xs text-[var(--color-text-muted)] transition-colors hover:border-[var(--color-primary)] hover:text-[var(--color-text)]"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((message) =>
            message.role === "user" ? (
              <div
                key={message.id}
                className="max-w-[85%] self-end rounded-2xl rounded-br-md bg-[var(--color-primary)] px-3.5 py-2 text-sm whitespace-pre-wrap text-[var(--color-primary-fg)]"
              >
                {message.content}
              </div>
            ) : (
              <div key={message.id} className="flex max-w-[90%] gap-2.5 self-start">
                <span
                  aria-hidden
                  className={cn(
                    "mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg",
                    message.failed
                      ? "bg-destructive/12 text-destructive"
                      : "bg-[var(--color-primary)]/12 text-[var(--color-primary)]",
                  )}
                >
                  {message.failed ? <AlertTriangle className="size-3.5" /> : <Sparkles className="size-3.5" />}
                </span>
                <div className="min-w-0">
                  <p className="text-sm whitespace-pre-wrap text-[var(--color-text)]">{message.content}</p>
                  {message.actionLabel && (
                    <Badge variant="secondary" className="mt-2 gap-1.5">
                      <span aria-hidden className="size-1.5 rounded-full bg-[var(--chart-income)]" />
                      {message.actionLabel}
                    </Badge>
                  )}
                </div>
              </div>
            ),
          )
        )}

        {sending && (
          <div className="flex items-center gap-2.5 self-start">
            <span
              aria-hidden
              className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-[var(--color-primary)]/12 text-[var(--color-primary)]"
            >
              <Sparkles className="size-3.5" />
            </span>
            <span className="flex gap-1" role="status" aria-label="Noctis is thinking">
              {[0, 150, 300].map((delay) => (
                <span
                  key={delay}
                  className="size-1.5 animate-bounce rounded-full bg-[var(--color-text-muted)]"
                  style={{ animationDelay: `${delay}ms` }}
                />
              ))}
            </span>
          </div>
        )}
      </div>

      {speech.error && <p className="text-xs text-destructive">{speech.error}</p>}
      {speech.listening && (
        <p className="text-xs text-[var(--color-text-muted)]">
          {speech.interim === "" ? "Listening…" : speech.interim}
        </p>
      )}

      <form
        onSubmit={handleSubmit}
        className="flex items-end gap-2 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-2 focus-within:border-[var(--color-primary)]"
      >
        <Textarea
          ref={textareaRef}
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask anything, or tell me what to do…"
          aria-label="Message"
          rows={1}
          className="max-h-40 min-h-8 flex-1 resize-none border-0 bg-transparent px-1.5 py-1 shadow-none focus-visible:ring-0 dark:bg-transparent"
        />
        {speech.supported && (
          <Button
            type="button"
            variant={speech.listening ? "default" : "ghost"}
            size="icon"
            onClick={speech.toggle}
            aria-label={speech.listening ? "Stop dictation" : "Dictate a message"}
            aria-pressed={speech.listening}
            className={cn("shrink-0", speech.listening && "animate-pulse")}
          >
            {speech.listening ? <Square /> : <Mic />}
          </Button>
        )}
        <Button
          type="submit"
          size="icon"
          disabled={sending || input.trim() === ""}
          aria-label="Send message"
          className="shrink-0"
        >
          {sending ? <Send /> : <ArrowUp />}
        </Button>
      </form>
    </div>
  );
}
