import type { LLMProvider } from "./provider";

interface OllamaChatResponse {
  message: { content: string };
}

export function createOllamaProvider(): LLMProvider {
  const baseUrl = process.env.OLLAMA_BASE_URL ?? "http://localhost:11434";
  const model = process.env.OLLAMA_MODEL ?? "qwen2.5:7b";

  return {
    async complete(system: string, user: string): Promise<string> {
      const res = await fetch(`${baseUrl}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: system },
            { role: "user", content: user },
          ],
          stream: false,
        }),
      });

      if (!res.ok) throw new Error(`Ollama request failed: ${res.status}`);

      const data = (await res.json()) as OllamaChatResponse;
      return data.message.content;
    },
  };
}
