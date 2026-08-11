/**
 * Live check for the Gemini provider — model ids get retired without warning, so this is the
 * fastest way to tell whether the configured model still answers in the shape chat.ts expects.
 * Run from ai/agent: pnpm exec tsx --env-file=../../apps/api/.env src/llm/gemini.check.ts
 */
import assert from "node:assert/strict";
import { createGeminiProvider } from "./gemini.provider";

const raw = await createGeminiProvider().complete(
  "You are Noctis. Reply with JSON only.",
  'Message: "log 45rb buat makan siang". Respond with ONLY: ' +
    '{"intent":"ADD_TRANSACTION","title":string,"amount":number,"category":string}',
);

const parsed = JSON.parse(raw) as { intent?: string; amount?: number };
assert.equal(parsed.intent, "ADD_TRANSACTION", `unexpected intent in: ${raw}`);
assert.equal(parsed.amount, 45000, `"45rb" should resolve to 45000, got: ${raw}`);

console.log("gemini: ok —", raw);
