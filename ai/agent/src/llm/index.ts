import { isProviderName, type LLMProvider, type ProviderName } from "./provider";
import { createOllamaProvider } from "./ollama.provider";
import { createGroqProvider } from "./groq.provider";
import { createClaudeProvider } from "./claude.provider";
import { createGeminiProvider } from "./gemini.provider";

/** `requested` comes from the user's model picker; AI_PROVIDER is the fallback default. */
export function createProvider(requested?: string): LLMProvider {
  const name: ProviderName = isProviderName(requested)
    ? requested
    : isProviderName(process.env.AI_PROVIDER)
      ? process.env.AI_PROVIDER
      : "ollama";

  switch (name) {
    case "gemini":
      return createGeminiProvider();
    case "groq":
      return createGroqProvider();
    case "claude":
      return createClaudeProvider();
    case "ollama":
      return createOllamaProvider();
  }
}

export { PROVIDERS, RateLimitError, isProviderName } from "./provider";
export type { LLMProvider, ProviderName } from "./provider";
