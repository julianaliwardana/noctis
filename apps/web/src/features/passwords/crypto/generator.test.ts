// Run: node --experimental-strip-types --test apps/web/src/features/passwords/crypto/generator.test.ts
import assert from "node:assert/strict";
import test from "node:test";
import { generatePassword, scorePassword } from "./generator.ts";

test("honours length and every requested set", () => {
  for (let i = 0; i < 200; i++) {
    const value = generatePassword({ length: 16, sets: ["lowercase", "uppercase", "digits", "symbols"] });
    assert.equal(value.length, 16);
    assert.match(value, /[a-z]/);
    assert.match(value, /[A-Z]/);
    assert.match(value, /\d/);
    assert.match(value, /[^a-zA-Z\d]/);
  }
});

test("a single-set password uses only that set", () => {
  const value = generatePassword({ length: 32, sets: ["digits"] });
  assert.match(value, /^[23456789]{32}$/);
});

test("never returns fewer characters than the sets it must include", () => {
  const value = generatePassword({ length: 2, sets: ["lowercase", "uppercase", "digits", "symbols"] });
  assert.equal(value.length, 4);
});

test("does not park the guaranteed characters at a fixed position", () => {
  // With digits-last-only generation, position 0 would never be a digit.
  const firstChars = new Set(
    Array.from({ length: 300 }, () => generatePassword({ length: 8, sets: ["lowercase", "digits"] })[0]),
  );
  assert.ok([...firstChars].some((c) => /\d/.test(c!)), "digit never appeared first");
  assert.ok([...firstChars].some((c) => /[a-z]/.test(c!)), "letter never appeared first");
});

test("scores by length and variety", () => {
  assert.equal(scorePassword("").score, 0);
  assert.equal(scorePassword("short").score, 0);
  assert.equal(scorePassword("alllowercase").score, 1);
  assert.equal(scorePassword("Mixed1Case12").score, 2);
  assert.equal(scorePassword("Mixed1Case!AndLong").score, 3);
});
