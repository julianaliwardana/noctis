export type { LLMProvider } from "@noctis/types";

export const PROVIDERS = ["gemini", "groq", "claude", "ollama"] as const;

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
