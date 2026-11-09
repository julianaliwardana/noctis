import { strict as assert } from "node:assert";
import { test } from "node:test";
import { refreshCookieName } from "./authCookies.ts";

test("production uses the __Host- prefixed name the API sets", () => {
  assert.equal(refreshCookieName(true), "__Host-noctis_refresh");
  assert.equal(refreshCookieName(false), "noctis_refresh");
});
