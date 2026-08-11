import type { LLMProvider } from "./provider";

interface GeminiResponse {
  candidates?: { content: { parts: { text?: string; thought?: boolean }[] } }[];
}

/**
 * Pinned versions get retired — gemini-2.5-flash started 404ing for new keys — so the default is
 * the floating alias. Set GEMINI_MODEL to pin a version when a prompt change needs a fixed target.
 */
const DEFAULT_MODEL = "gemini-flash-latest";

/** The free tier allows a handful of requests per minute; the API tells us how long to wait. */
function retryDelayMs(body: string): number {
  const seconds = /retry in ([\d.]+)s/.exec(body)?.[1];
  return Math.min(seconds ? Number(seconds) * 1000 + 250 : 3000, 10_000);
}

export function createGeminiProvider(): LLMProvider {
  // `||`, not `??` — an unset key in .env reads as "", which would build a URL with no model.
  const model = process.env.GEMINI_MODEL || DEFAULT_MODEL;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

  async function call(system: string, user: string): Promise<Response> {
    return fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": process.env.GEMINI_API_KEY ?? "",
      },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: system }] },
        contents: [{ role: "user", parts: [{ text: user }] }],
        generationConfig: {
          // Every prompt here asks for a JSON object, so pin the output to JSON and skip the
          // reasoning pass — intent classification does not need it, and it costs latency.
          responseMimeType: "application/json",
          temperature: 0.2,
          thinkingConfig: { thinkingLevel: "low" },
        },
      }),
    });
  }

  return {
    async complete(system: string, user: string): Promise<string> {
      let res = await call(system, user);

      if (res.status === 429) {
        const body = await res.text();
        await new Promise((resolve) => setTimeout(resolve, retryDelayMs(body)));
        res = await call(system, user);
      }

      if (!res.ok) throw new Error(`Gemini request failed: ${res.status} ${await res.text()}`);

      const data = (await res.json()) as GeminiResponse;
      // Raising thinkingLevel prepends thought parts, so take the first part that is an answer.
      const parts = data.candidates?.[0]?.content.parts ?? [];
      return parts.find((part) => part.thought !== true && part.text !== undefined)?.text ?? "";
    },
  };
}
