import { RateLimitError, type LLMProvider } from "./provider";

interface GeminiResponse {
  candidates?: { content: { parts: { text?: string; thought?: boolean }[] } }[];
}

/** Floating alias by default, since pinned versions get retired. Set GEMINI_MODEL to pin one. */
const DEFAULT_MODEL = "gemini-flash-latest";

/** Google reports "retry in ~50s" for both the minute and the day cap; only quotaId tells them apart. */
function parseQuota(body: string): { retryAfterSeconds: number; daily: boolean } {
  const seconds = /retry in ([\d.]+)s/.exec(body)?.[1];
  return {
    retryAfterSeconds: seconds ? Math.ceil(Number(seconds)) : 60,
    daily: /PerDay/i.test(body),
  };
}

export function createGeminiProvider(): LLMProvider {
  // `||`, not `??`: an unset .env var reads as "".
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
          // JSON only, no reasoning pass: intent classification doesn't need it.
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
        const quota = parseQuota(await res.text());
        if (quota.daily) throw new RateLimitError("gemini", quota.retryAfterSeconds, "day");
        // Anything longer than a moment belongs in the user's countdown, not in a held-open request.
        if (quota.retryAfterSeconds > 5) throw new RateLimitError("gemini", quota.retryAfterSeconds, "minute");

        await new Promise((resolve) => setTimeout(resolve, quota.retryAfterSeconds * 1000 + 250));
        res = await call(system, user);

        if (res.status === 429) {
          const retry = parseQuota(await res.text());
          throw new RateLimitError("gemini", retry.retryAfterSeconds, retry.daily ? "day" : "minute");
        }
      }

      if (!res.ok) throw new Error(`Gemini request failed: ${res.status} ${await res.text()}`);

      const data = (await res.json()) as GeminiResponse;
      // Raising thinkingLevel prepends thought parts, so take the first part that is an answer.
      const parts = data.candidates?.[0]?.content.parts ?? [];
      return parts.find((part) => part.thought !== true && part.text !== undefined)?.text ?? "";
    },
  };
}
