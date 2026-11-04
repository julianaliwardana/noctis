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
