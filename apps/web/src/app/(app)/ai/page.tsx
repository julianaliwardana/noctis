"use client";

import { ChatWindow } from "@/features/ai/ui/ChatWindow";
import { useChat } from "@/features/ai/hooks/useChat";

export default function AiPage() {
  const { messages, sending, send } = useChat();

  return (
    <div className="flex h-[calc(100dvh-8rem)] flex-col md:h-[calc(100dvh-4rem)]">
      <h1 className="mb-4 font-[family-name:var(--font-display)] text-2xl text-[var(--color-text)]">AI Chat</h1>
      <ChatWindow messages={messages} sending={sending} onSend={send} />
    </div>
  );
}
