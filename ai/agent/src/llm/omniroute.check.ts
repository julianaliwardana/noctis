/**
 * Live check for the OmniRoute provider — proves the gateway is reachable, the key is accepted and
 * each allowlisted model answers both ways chat.ts uses it: single-intent JSON and tool calls.
 * Run from ai/agent: pnpm exec tsx --env-file=../../apps/api/.env src/llm/omniroute.check.ts
 */
import assert from "node:assert/strict";
import { safeParseJSON } from "@noctis/utils";
import { TOOL_SPECS } from "../toolLoop";
import { createOmniRouteProvider, omniRouteModels, stripThinking } from "./omniroute.provider";

assert.equal(stripThinking('<think>\nhmm, 45rb…\n</think>\n{"a":1}'), '{"a":1}');
assert.equal(stripThinking('{"a":1}'), '{"a":1}');

const models = omniRouteModels();
assert.ok(models.length > 0, "set OMNIROUTE_MODEL or OMNIROUTE_MODELS");

for (const { id } of models) {
  const provider = createOmniRouteProvider(id);

  const raw = await provider.complete(
    "You are Noctis. Reply with JSON only.",
    'Message: "log 45rb buat makan siang". Respond with ONLY: ' +
      '{"intent":"ADD_TRANSACTION","title":string,"amount":number,"category":string}',
  );
  const parsed = safeParseJSON(raw) as { intent?: string; amount?: number } | null;
  assert.equal(parsed?.intent, "ADD_TRANSACTION", `${id}: unexpected intent in: ${raw}`);
  assert.equal(parsed?.amount, 45000, `${id}: "45rb" should resolve to 45000, got: ${raw}`);

  const turn = await provider.chat!(
    [
      { role: "system", content: "You are Noctis. Amounts are IDR; 45rb = 45000. Categories: Food." },
      { role: "user", content: "log 45rb buat makan siang" },
    ],
    TOOL_SPECS,
  );
  const tx = turn.toolCalls.find((call) => call.function.name === "add_transaction");
  assert.ok(tx, `${id}: expected an add_transaction tool call, got: ${JSON.stringify(turn)}`);
  const args = safeParseJSON(tx.function.arguments) as { amount?: number } | null;
  assert.equal(Number(args?.amount), 45000, `${id}: tool amount should be 45000, got: ${tx.function.arguments}`);

  console.log(`omniroute ${id} (answered by ${turn.model ?? "?"}): json ok, tools ok`);
}
