export interface PendingDelete {
  kind: "task" | "habit" | "transaction" | "category";
  id: string;
  label: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  actionLabel?: string;
  failed?: boolean;
  /** Set while the delete is still awaiting the user's yes; cleared once they answer either way. */
  pendingDelete?: PendingDelete;
}

export type ProviderName = "gemini" | "groq";

export const PROVIDER_OPTIONS: { value: ProviderName; label: string; hint: string }[] = [
  { value: "gemini", label: "Gemini", hint: "Gemini Flash — best at Indonesian, but only 20 requests/day free" },
  { value: "groq", label: "Groq", hint: "Groq Llama — the daily driver, far higher free limits" },
];

export interface ConversationSummary {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export interface StoredMessage {
  id: string;
  role: string;
  content: string;
  actionLabel: string | null;
  createdAt: string;
}

export interface ConversationDetail extends ConversationSummary {
  messages: StoredMessage[];
}
