import { strict as assert } from "node:assert";
import { test } from "node:test";
import { refreshOutcome } from "./refreshOutcome.ts";

test("only a 401 ends the session", () => {
  assert.equal(refreshOutcome(204), "renewed");
  assert.equal(refreshOutcome(401), "expired");
});

test("everything else is a transient failure, not a sign-out", () => {
  for (const status of [undefined, 0, 400, 415, 429, 500, 502]) {
    assert.equal(refreshOutcome(status), "failed", String(status));
  }
});
