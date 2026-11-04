import type { LLMProvider } from "@noctis/types";

export type { LLMProvider } from "@noctis/types";

export const PROVIDERS = ["gemini", "groq", "omniroute", "claude", "ollama"] as const;

export type ProviderName = (typeof PROVIDERS)[number];

export function isProviderName(value: unknown): value is ProviderName {
  return PROVIDERS.includes(value as ProviderName);
}

/**
 * Free tiers are small — Gemini flash allows a handful of requests per minute — so a quota refusal
 * is normal traffic, not a crash. It carries the wait so the UI can count down instead of guessing.
 */
export class RateLimitError extends Error {
  provider: ProviderName;
  retryAfterSeconds: number;
  /**
   * "minute" refills on its own, so waiting works. "day" does not — Google still reports a
   * retry-in of a few seconds on a daily cap, and counting down to it just walks into another 429.
   */
  scope: "minute" | "day";

  constructor(provider: ProviderName, retryAfterSeconds: number, scope: "minute" | "day" = "minute") {
    super(`${provider} ${scope} rate limit reached`);
    this.name = "RateLimitError";
    this.provider = provider;
    this.retryAfterSeconds = retryAfterSeconds;
    this.scope = scope;
  }
}

/** The upstream refused the `tools` field — chat.ts drops back to single-intent JSON for this turn. */
export class ToolsUnsupportedError extends Error {
  constructor(detail: string) {
    super(`tool calling unsupported: ${detail}`);
    this.name = "ToolsUnsupportedError";
  }
}

/**
 * The gateway doesn't know the model — a typo or stale id in OMNIROUTE_MODELS, or a combo that
 * was deleted. Not worth a fallback: the user should pick another model, so the UI says which.
 */
export class ModelUnavailableError extends Error {
  model: string;

  constructor(model: string, detail: string) {
    super(`model "${model}" is not available on the gateway: ${detail}`);
    this.name = "ModelUnavailableError";
    this.model = model;
  }
}

// OpenAI chat-completions shapes — the wire format OmniRoute speaks for every upstream.
export interface ToolCall {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
}

export type ToolMessage =
  | { role: "system" | "user"; content: string }
  | { role: "assistant"; content: string | null; tool_calls?: ToolCall[] }
  | { role: "tool"; tool_call_id: string; content: string };

export interface ToolSpec {
  type: "function";
  function: { name: string; description: string; parameters: Record<string, unknown> };
}

export interface ToolTurn {
  content: string;
  toolCalls: ToolCall[];
  /** What the gateway says answered — for a combo, the upstream model that actually ran. */
  model?: string;
}

/** A provider that can run the tool loop. Providers without `chat` use single-intent JSON. */
export interface ToolCapableProvider extends LLMProvider {
  chat?(messages: ToolMessage[], tools: ToolSpec[]): Promise<ToolTurn>;
}
