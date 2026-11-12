/**
 * Pure verdicts over the numbers health.service collects: no I/O, so the thresholds can be checked
 * without a server (health.checks.check.ts).
 */

export type Level = "ok" | "warn" | "critical";

export interface HealthMetrics {
  /** Host-wide, as the container sees them (Docker shares the host's /proc and root disk). */
  disk: { usedBytes: number; totalBytes: number } | null;
  memory: { availableBytes: number; totalBytes: number } | null;
  load: { oneMinute: number; cpus: number };
  uptimeSeconds: number;
  database: { ok: boolean; latencyMs: number; sizeBytes: number | null; error?: string };
  redis: { ok: boolean; latencyMs: number; error?: string };
  /** Seconds since the agent last wrote its heartbeat; null when it never has. */
  agentHeartbeatAgeSeconds: number | null;
  /** Days since the newest transaction imported from a BCA email; null when there is none. */
  lastBankImportAgeDays: number | null;
}

export interface Check {
  name: string;
  level: Level;
  detail: string;
}

export interface HealthReport {
  level: Level;
  checks: Check[];
}

const GB = 1024 ** 3;
const MB = 1024 ** 2;
const gb = (bytes: number): string => (bytes >= GB ? `${(bytes / GB).toFixed(1)} GB` : `${Math.round(bytes / MB)} MB`);
const pct = (part: number, whole: number): number => Math.round((part / whole) * 1000) / 10;

/** Disk fills slowly and breaks everything at 100%: warn early. */
const DISK_WARN = 85;
const DISK_CRITICAL = 95;
const MEMORY_WARN_AVAILABLE = 10;
const MEMORY_CRITICAL_AVAILABLE = 5;
/** Load per core, one-minute average. */
const LOAD_WARN = 2;
const DB_SLOW_MS = 1000;
/** The agent writes every minute; a few missed beats is a restart, ten is a dead process. */
const AGENT_STALE_SECONDS = 10 * 60;
/** Three days without a single bank-email transaction usually means the import broke. */
const IMPORT_STALE_DAYS = 3;

export function evaluateHealth(metrics: HealthMetrics): HealthReport {
  const checks: Check[] = [];

  if (metrics.disk) {
    const used = pct(metrics.disk.usedBytes, metrics.disk.totalBytes);
    checks.push({
      name: "disk",
      level: used >= DISK_CRITICAL ? "critical" : used >= DISK_WARN ? "warn" : "ok",
      detail: `${used}% used, ${gb(metrics.disk.totalBytes - metrics.disk.usedBytes)} free of ${gb(metrics.disk.totalBytes)}`,
    });
  } else {
    checks.push({ name: "disk", level: "warn", detail: "Could not read disk usage" });
  }

  if (metrics.memory) {
    const available = pct(metrics.memory.availableBytes, metrics.memory.totalBytes);
    checks.push({
      name: "memory",
      level: available < MEMORY_CRITICAL_AVAILABLE ? "critical" : available < MEMORY_WARN_AVAILABLE ? "warn" : "ok",
      detail: `${available}% available (${gb(metrics.memory.availableBytes)} of ${gb(metrics.memory.totalBytes)})`,
    });
  } else {
    checks.push({ name: "memory", level: "warn", detail: "Could not read memory" });
  }

  const perCore = metrics.load.cpus > 0 ? metrics.load.oneMinute / metrics.load.cpus : metrics.load.oneMinute;
  checks.push({
    name: "load",
    level: perCore >= LOAD_WARN ? "warn" : "ok",
    detail: `${metrics.load.oneMinute.toFixed(2)} over ${metrics.load.cpus} cores`,
  });

  checks.push(
    metrics.database.ok
      ? {
          name: "database",
          level: metrics.database.latencyMs >= DB_SLOW_MS ? "warn" : "ok",
          detail: `Answered in ${metrics.database.latencyMs} ms${metrics.database.sizeBytes === null ? "" : `, ${gb(metrics.database.sizeBytes)}`}`,
        }
      : { name: "database", level: "critical", detail: `Unreachable: ${metrics.database.error ?? "no answer"}` },
  );

  checks.push(
    metrics.redis.ok
      ? { name: "redis", level: "ok", detail: `Answered in ${metrics.redis.latencyMs} ms` }
      : { name: "redis", level: "critical", detail: `Unreachable: ${metrics.redis.error ?? "no answer"}` },
  );

  const beat = metrics.agentHeartbeatAgeSeconds;
  checks.push(
    beat === null
      ? { name: "agent", level: "critical", detail: "No heartbeat: the agent (nudges, reminders) is not running" }
      : beat > AGENT_STALE_SECONDS
        ? { name: "agent", level: "critical", detail: `Last heartbeat ${Math.round(beat / 60)} min ago: the agent looks stopped` }
        : { name: "agent", level: "ok", detail: `Heartbeat ${beat} s ago` },
  );

  const importAge = metrics.lastBankImportAgeDays;
  checks.push(
    importAge === null
      ? { name: "bank import", level: "warn", detail: "No bank-email transaction imported yet" }
      : importAge >= IMPORT_STALE_DAYS
        ? { name: "bank import", level: "warn", detail: `Newest bank-email transaction is ${importAge} days old: check the import task` }
        : { name: "bank import", level: "ok", detail: importAge === 0 ? "Imported today" : `Newest is ${importAge} day${importAge === 1 ? "" : "s"} old` },
  );

  const level: Level = checks.some((check) => check.level === "critical")
    ? "critical"
    : checks.some((check) => check.level === "warn")
      ? "warn"
      : "ok";
  return { level, checks };
}
