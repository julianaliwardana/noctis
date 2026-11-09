import { strict as assert } from "node:assert";
import { test } from "node:test";
import { cookieFromSetCookie, withCookie } from "./setCookie.ts";

const NAME = "__Host-noctis_access";

test("reads the new access token from the refresh response", () => {
  const headers = [
    "noctis_access=; Max-Age=0; Domain=julianwardana.dev; Path=/",
    `${NAME}=eyJ.abc.def; Max-Age=900; Path=/; HttpOnly; Secure; SameSite=Lax`,
  ];
  assert.equal(cookieFromSetCookie(headers, NAME), "eyJ.abc.def");
});

test("a cleared or missing cookie is null", () => {
  assert.equal(cookieFromSetCookie([`${NAME}=; Max-Age=0; Path=/`], NAME), null);
  assert.equal(cookieFromSetCookie(["other=1"], NAME), null);
});

test("withCookie replaces an existing entry and keeps the rest", () => {
  assert.equal(withCookie("a=1; __Host-noctis_access=old; b=2", NAME, "new"), `a=1; b=2; ${NAME}=new`);
  assert.equal(withCookie(null, NAME, "new"), `${NAME}=new`);
});
