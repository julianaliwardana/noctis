/**
 * Self-check for the health thresholds.
 * Run from apps/api: pnpm exec tsx src/modules/health/health.checks.check.ts
 */
import assert from "node:assert/strict";
import { evaluateHealth } from "./health.checks";
import type { HealthMetrics } from "./health.checks";

const GB = 1024 ** 3;
const healthy: HealthMetrics = {
  disk: { usedBytes: 40 * GB, totalBytes: 100 * GB },
  memory: { availableBytes: 8 * GB, totalBytes: 24 * GB },
  load: { oneMinute: 0.5, cpus: 4 },
  uptimeSeconds: 86_400,
  database: { ok: true, latencyMs: 3, sizeBytes: 0.2 * GB },
  redis: { ok: true, latencyMs: 1 },
  agentHeartbeatAgeSeconds: 30,
  lastBankImportAgeDays: 0,
};
const level = (overrides: Partial<HealthMetrics>, name: string) =>
  evaluateHealth({ ...healthy, ...overrides }).checks.find((check) => check.name === name)?.level;

assert.equal(evaluateHealth(healthy).level, "ok");
assert.deepEqual(
  evaluateHealth(healthy).checks.map((check) => check.name),
  ["disk", "memory", "load", "database", "redis", "agent", "bank import"],
);
assert.match(evaluateHealth(healthy).checks[0]!.detail, /^40% used, 60\.0 GB free of 100\.0 GB$/);

assert.match(evaluateHealth(healthy).checks[3]!.detail, /^Answered in 3 ms, 205 MB$/, "small sizes in MB");

assert.equal(level({ disk: { usedBytes: 84.9 * GB, totalBytes: 100 * GB } }, "disk"), "ok");
assert.equal(level({ disk: { usedBytes: 85 * GB, totalBytes: 100 * GB } }, "disk"), "warn");
assert.equal(level({ disk: { usedBytes: 95 * GB, totalBytes: 100 * GB } }, "disk"), "critical");
assert.equal(level({ disk: null }, "disk"), "warn", "unreadable is worth a look, not an outage");

assert.equal(level({ memory: { availableBytes: 2 * GB, totalBytes: 24 * GB } }, "memory"), "warn");
assert.equal(level({ memory: { availableBytes: 1 * GB, totalBytes: 24 * GB } }, "memory"), "critical");

assert.equal(level({ load: { oneMinute: 7.9, cpus: 4 } }, "load"), "ok");
assert.equal(level({ load: { oneMinute: 8, cpus: 4 } }, "load"), "warn");
assert.equal(level({ load: { oneMinute: 3, cpus: 0 } }, "load"), "warn", "no core count: compare the raw load");

assert.equal(level({ database: { ok: true, latencyMs: 1500, sizeBytes: null } }, "database"), "warn");
assert.equal(level({ database: { ok: false, latencyMs: 0, sizeBytes: null, error: "ECONNREFUSED" } }, "database"), "critical");
assert.equal(level({ redis: { ok: false, latencyMs: 0 } }, "redis"), "critical");

assert.equal(level({ agentHeartbeatAgeSeconds: 600 }, "agent"), "ok");
assert.equal(level({ agentHeartbeatAgeSeconds: 601 }, "agent"), "critical");
assert.equal(level({ agentHeartbeatAgeSeconds: null }, "agent"), "critical");

assert.equal(level({ lastBankImportAgeDays: 2 }, "bank import"), "ok");
assert.equal(level({ lastBankImportAgeDays: 3 }, "bank import"), "warn");
assert.equal(level({ lastBankImportAgeDays: null }, "bank import"), "warn");

// Worst check wins.
assert.equal(evaluateHealth({ ...healthy, lastBankImportAgeDays: 5 }).level, "warn");
assert.equal(evaluateHealth({ ...healthy, lastBankImportAgeDays: 5, agentHeartbeatAgeSeconds: null }).level, "critical");

console.log("health.checks: all checks passed");
