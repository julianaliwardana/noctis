import { strict as assert } from "node:assert";
import { test } from "node:test";
import { authRedirect } from "./authRedirect.ts";

test("signed-out visitors are sent to /login, except on the auth pages", () => {
  assert.equal(authRedirect(false, "/dashboard"), "/login");
  assert.equal(authRedirect(false, "/"), "/login");
  assert.equal(authRedirect(false, "/login"), null);
  assert.equal(authRedirect(false, "/register"), null);
});

test("signed-in visitors are kept out of the auth pages", () => {
  assert.equal(authRedirect(true, "/login"), "/dashboard");
  assert.equal(authRedirect(true, "/register"), "/dashboard");
  assert.equal(authRedirect(true, "/dashboard"), null);
  assert.equal(authRedirect(true, "/passwords"), null);
});
