/**
 * Live check for the OmniRoute provider — proves the gateway is reachable, the key is accepted and
 * OMNIROUTE_MODEL answers in the shape chat.ts expects.
 * Run from ai/agent: pnpm exec tsx --env-file=../../apps/api/.env src/llm/omniroute.check.ts
 */
import assert from "node:assert/strict";
import { safeParseJSON } from "@noctis/utils";
import { createOmniRouteProvider, stripThinking } from "./omniroute.provider";

assert.equal(stripThinking('<think>\nhmm, 45rb…\n</think>\n{"a":1}'), '{"a":1}');
assert.equal(stripThinking('{"a":1}'), '{"a":1}');

const raw = await createOmniRouteProvider().complete(
  "You are Noctis. Reply with JSON only.",
  'Message: "log 45rb buat makan siang". Respond with ONLY: ' +
    '{"intent":"ADD_TRANSACTION","title":string,"amount":number,"category":string}',
);

const parsed = safeParseJSON(raw) as { intent?: string; amount?: number } | null;
assert.ok(parsed, `not JSON: ${raw}`);
assert.equal(parsed.intent, "ADD_TRANSACTION", `unexpected intent in: ${raw}`);
assert.equal(parsed.amount, 45000, `"45rb" should resolve to 45000, got: ${raw}`);

console.log(`omniroute (${process.env.OMNIROUTE_MODEL}): ok —`, raw);
