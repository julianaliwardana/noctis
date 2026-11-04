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

export type ProviderName = "omniroute" | "gemini" | "groq";

export const PROVIDER_OPTIONS: { value: ProviderName; label: string; hint: string }[] = [
  { value: "omniroute", label: "OmniRoute", hint: "Your self-hosted gateway — routes to whichever model OMNIROUTE_MODEL names" },
  { value: "gemini", label: "Gemini", hint: "Gemini Flash — best at Indonesian, but only 20 requests/day free" },
  { value: "groq", label: "Groq", hint: "Groq Llama — far higher free limits than Gemini" },
];

export function isProviderName(value: unknown): value is ProviderName {
  return PROVIDER_OPTIONS.some((option) => option.value === value);
}

export function providerLabel(provider: ProviderName): string {
  return PROVIDER_OPTIONS.find((option) => option.value === provider)?.label ?? provider;
}

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
