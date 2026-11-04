export interface PendingDelete {
  kind: "task" | "habit" | "transaction" | "category";
  id: string;
  label: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  /** One summary per thing the reply did ("Created task: Call bank"), in order. */
  actions?: string[];
  /** The model that answered, when the gateway says. Live replies only — not stored. */
  model?: string;
  failed?: boolean;
  /** Set while the delete is still awaiting the user's yes; cleared once they answer either way. */
  pendingDelete?: PendingDelete;
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

/** An entry in the server's model allowlist. The first one is the server's default. */
export interface ChatModel {
  id: string;
  label: string;
}
