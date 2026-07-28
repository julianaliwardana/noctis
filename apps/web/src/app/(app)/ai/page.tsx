"use client";

import { ChatWindow } from "@/features/ai/ui/ChatWindow";
import { useChat } from "@/features/ai/hooks/useChat";

export default function AiPage() {
  const { messages, sending, send } = useChat();

  return (
    <div className="mx-auto flex h-[calc(100dvh-8rem)] w-full max-w-3xl flex-col md:h-[calc(100dvh-4rem)]">
      <div className="mb-4">
        <h1 className="font-[family-name:var(--font-display)] text-2xl text-[var(--color-text)]">AI Chat</h1>
        <p className="text-sm text-[var(--color-text-muted)]">
          Create and delete tasks, habits, transactions and categories — by typing or by voice.
        </p>
      </div>
      <ChatWindow messages={messages} sending={sending} onSend={send} />
    </div>
  );
}
