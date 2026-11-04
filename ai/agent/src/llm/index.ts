import { isProviderName, type LLMProvider, type ProviderName } from "./provider";
import { createOllamaProvider } from "./ollama.provider";
import { createGroqProvider } from "./groq.provider";
import { createClaudeProvider } from "./claude.provider";
import { createGeminiProvider } from "./gemini.provider";
import { createOmniRouteProvider } from "./omniroute.provider";

/**
 * The server picks the model, never the client — chat context carries finance data, and which
 * upstream may see it is a deployment decision (AI_PROVIDER), not a per-request one.
 */
export function createProvider(): LLMProvider {
  const name: ProviderName = isProviderName(process.env.AI_PROVIDER) ? process.env.AI_PROVIDER : "ollama";

  switch (name) {
    case "gemini":
      return createGeminiProvider();
    case "groq":
      return createGroqProvider();
    case "omniroute":
      return createOmniRouteProvider();
    case "claude":
      return createClaudeProvider();
    case "ollama":
      return createOllamaProvider();
  }
}

export { PROVIDERS, RateLimitError, isProviderName } from "./provider";
export type { LLMProvider, ProviderName } from "./provider";
