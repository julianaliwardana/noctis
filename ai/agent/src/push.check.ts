/**
 * Self-check for the VAPID subject cleanup and nudge links.
 * Run from ai/agent: pnpm exec tsx src/push.check.ts
 */
import assert from "node:assert/strict";
import { pathForType, vapidSubject } from "./push";

assert.equal(vapidSubject("mailto:julian@x.dev"), "mailto:julian@x.dev");
assert.equal(vapidSubject("julian@x.dev"), "mailto:julian@x.dev", "bare address gets mailto:");
assert.equal(vapidSubject('"mailto:julian@x.dev"'), "mailto:julian@x.dev", "quotes from the env file are stripped");
assert.equal(vapidSubject(" mailto: julian@x.dev "), "mailto:julian@x.dev", "spaces break Apple's JWT check");
assert.equal(vapidSubject("https://noctis.julianwardana.dev"), "https://noctis.julianwardana.dev");
assert.equal(vapidSubject(undefined), "mailto:noreply@julianwardana.dev");
assert.equal(vapidSubject(""), "mailto:noreply@julianwardana.dev");

assert.equal(pathForType("task"), "/tasks");
assert.equal(pathForType("finance"), "/finance");
assert.equal(pathForType("whatever"), "/dashboard");

console.log("push: all checks passed");
