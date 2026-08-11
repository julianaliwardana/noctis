import type { LLMProvider } from "./provider";
import { createOllamaProvider } from "./ollama.provider";
import { createGroqProvider } from "./groq.provider";
import { createClaudeProvider } from "./claude.provider";
import { createGeminiProvider } from "./gemini.provider";

export function createProvider(): LLMProvider {
  const provider = process.env.AI_PROVIDER ?? "ollama";

  switch (provider) {
    case "gemini":
      return createGeminiProvider();
    case "groq":
      return createGroqProvider();
    case "claude":
      return createClaudeProvider();
    case "ollama":
    default:
      return createOllamaProvider();
  }
}

export type { LLMProvider } from "./provider";
