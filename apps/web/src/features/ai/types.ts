export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  actionLabel?: string;
}
