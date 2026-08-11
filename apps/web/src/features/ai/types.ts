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
