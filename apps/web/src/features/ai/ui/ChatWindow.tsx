"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { AlertTriangle, ArrowUp, Hourglass, Mic, Send, Sparkles, Square, Trash2 } from "lucide-react";
import { Textarea } from "@/shared/components/ui/textarea";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { ToggleGroup, ToggleGroupItem } from "@/shared/components/ui/toggle-group";
import { cn } from "@/lib/utils";
import { useSpeechRecognition } from "../hooks/useSpeechRecognition";
import { useTypewriter } from "../hooks/useTypewriter";
import { PROVIDER_OPTIONS, type ChatMessage, type ProviderName } from "../types";

interface AssistantBubbleProps {
  message: ChatMessage;
  deletingId: string | null;
  onResolveDelete: (messageId: string, confirmed: boolean) => void;
  onTick: (behavior?: ScrollBehavior, onlyIfNear?: boolean) => void;
}

function AssistantBubble({ message, deletingId, onResolveDelete, onTick }: AssistantBubbleProps) {
  const { visible, done } = useTypewriter(message.id, message.content, () => onTick("auto", true));

  return (
    <div className="flex max-w-[90%] gap-2.5 self-start">
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
        {/* The full text is in the DOM for screen readers from the start; only the caret waits. */}
        <p aria-label={message.content} className="text-sm whitespace-pre-wrap text-[var(--color-text)]">
          <span aria-hidden={!done}>{visible}</span>
          {!done && (
            <span
              aria-hidden
              className="ml-0.5 inline-block h-3.5 w-px animate-pulse align-middle bg-[var(--color-text-muted)]"
            />
          )}
        </p>
        {done && message.actionLabel && (
          <Badge variant="secondary" className="mt-2 gap-1.5">
            <span aria-hidden className="size-1.5 rounded-full bg-[var(--chart-income)]" />
            {message.actionLabel}
          </Badge>
        )}
        {/* Held back until the question has finished typing — this one deletes something. */}
        {done && message.pendingDelete && (
          <div className="mt-2 flex gap-2">
            <Button
              type="button"
              size="sm"
              variant="destructive"
              disabled={deletingId !== null}
              onClick={() => onResolveDelete(message.id, true)}
            >
              <Trash2 />
              Delete {message.pendingDelete.kind}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={deletingId !== null}
              onClick={() => onResolveDelete(message.id, false)}
            >
              Keep it
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

export interface ChatWindowProps {
  messages: ChatMessage[];
  sending: boolean;
  onSend: (message: string) => void;
  deletingId: string | null;
  onResolveDelete: (messageId: string, confirmed: boolean) => void;
  provider: ProviderName;
  onProviderChange: (provider: ProviderName) => void;
  cooldownUntil: number | null;
}

const SUGGESTIONS = [
  "What's on my plate today?",
  "Add a task to call the bank tomorrow at 10am",
  "Log 45k for lunch under Food",
  "How much did I spend this month?",
];

/** Seconds left on a rate-limit wait, ticking down to zero and then releasing the composer. */
function useCooldown(until: number | null): number {
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    if (until === null) {
      setRemaining(0);
      return;
    }

    function update(): void {
      setRemaining(Math.max(0, Math.ceil(((until as number) - Date.now()) / 1000)));
    }

    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [until]);

  return remaining;
}

export function ChatWindow({
  messages,
  sending,
  onSend,
  deletingId,
  onResolveDelete,
  provider,
  onProviderChange,
  cooldownUntil,
}: ChatWindowProps) {
  const [input, setInput] = useState("");
  const cooldown = useCooldown(cooldownUntil);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const speech = useSpeechRecognition((text) => {
    if (text === "") return;
    setInput((current) => (current === "" ? text : `${current} ${text}`));
    textareaRef.current?.focus();
  });

  // Keep the newest message in view as the conversation and the thinking indicator grow. While a
  // reply is typing this fires every frame, so it jumps instantly and gives up once the user
  // scrolls away to read something older.
  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth", onlyIfNear = false) => {
    const element = scrollRef.current;
    if (!element) return;
    if (onlyIfNear && element.scrollHeight - element.scrollTop - element.clientHeight > 120) return;
    element.scrollTo({ top: element.scrollHeight, behavior });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages.length, sending, scrollToBottom]);

  // Auto-grow the composer up to a few lines, then let it scroll.
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 160)}px`;
  }, [input]);

  function submit(value: string): void {
    const trimmed = value.trim();
    if (trimmed === "" || sending || cooldown > 0) return;
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
              <AssistantBubble
                key={message.id}
                message={message}
                deletingId={deletingId}
                onResolveDelete={onResolveDelete}
                onTick={scrollToBottom}
              />
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

      {/* Two models is a segmented control, not a dropdown — both choices stay visible, and it
          lives inside the composer so there is no second bordered strip above it. */}
      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-1.5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-2 focus-within:border-[var(--color-primary)]"
      >
        <Textarea
          ref={textareaRef}
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask anything, or tell me what to do…"
          aria-label="Message"
          rows={1}
          className="max-h-40 min-h-8 resize-none border-0 bg-transparent px-1.5 py-1 shadow-none focus-visible:ring-0 dark:bg-transparent"
        />

        <div className="flex items-center gap-2">
          <ToggleGroup
            type="single"
            size="sm"
            variant="outline"
            value={provider}
            onValueChange={(next) => next && onProviderChange(next as ProviderName)}
            aria-label="Model"
          >
            {PROVIDER_OPTIONS.map((option) => (
              <ToggleGroupItem
                key={option.value}
                value={option.value}
                title={option.hint}
                className="px-2.5 text-xs data-[state=on]:bg-[var(--color-primary)]/12 data-[state=on]:text-[var(--color-primary)]"
              >
                {option.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>

          {cooldown > 0 && (
            <p role="status" className="flex items-center gap-1 text-xs text-destructive">
              <Hourglass className="size-3.5 shrink-0" />
              {cooldown}s
            </p>
          )}

          <div className="ml-auto flex items-center gap-1">
            {speech.supported && (
              <Button
                type="button"
                variant={speech.listening ? "default" : "ghost"}
                size="icon"
                onClick={speech.toggle}
                aria-label={speech.listening ? "Stop dictation" : "Dictate a message"}
                aria-pressed={speech.listening}
                className={cn("size-8 shrink-0", speech.listening && "animate-pulse")}
              >
                {speech.listening ? <Square /> : <Mic />}
              </Button>
            )}
            <Button
              type="submit"
              size="icon"
              disabled={sending || cooldown > 0 || input.trim() === ""}
              aria-label={cooldown > 0 ? `Rate limited, ${cooldown} seconds left` : "Send message"}
              className="size-8 shrink-0"
            >
              {sending ? <Send /> : <ArrowUp />}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
