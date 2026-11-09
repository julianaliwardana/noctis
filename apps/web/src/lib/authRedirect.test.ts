import { strict as assert } from "node:assert";
import { test } from "node:test";
import { authRedirect, loginUrl, safeNext } from "./authRedirect.ts";

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

test("safeNext keeps same-site paths and rejects anything that could leave the site", () => {
  assert.equal(safeNext("/finance?month=11"), "/finance?month=11");
  assert.equal(safeNext(null), "/dashboard");
  assert.equal(safeNext("https://evil.com"), "/dashboard");
  assert.equal(safeNext("//evil.com"), "/dashboard");
  assert.equal(safeNext("/\\evil.com"), "/dashboard");
  assert.equal(safeNext("/login"), "/dashboard");
  assert.equal(safeNext("/register?x=1"), "/dashboard");
});

test("loginUrl carries the requested page through sign-in", () => {
  assert.equal(loginUrl("/habits?view=week"), "/login?next=%2Fhabits%3Fview%3Dweek");
  assert.equal(loginUrl("/"), "/login");
  assert.equal(loginUrl("/dashboard"), "/login");
});
