import { statfs, readFile } from "node:fs/promises";
import os from "node:os";
import type Redis from "ioredis";
import { db } from "@noctis/db";
import { evaluateHealth } from "./health.checks";
import type { HealthMetrics, HealthReport } from "./health.checks";

/** Written by the agent every minute (ai/agent/src/heartbeat.ts). */
export const AGENT_HEARTBEAT_KEY = "noctis:agent:heartbeat";

const DAY_MS = 24 * 60 * 60 * 1000;
const PROBE_TIMEOUT_MS = 3000;

function withTimeout<T>(promise: Promise<T>): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`timed out after ${PROBE_TIMEOUT_MS} ms`)), PROBE_TIMEOUT_MS)),
  ]);
}

const message = (error: unknown): string => (error instanceof Error ? error.message : String(error)).slice(0, 160);

async function readDisk(): Promise<HealthMetrics["disk"]> {
  try {
    const stats = await statfs("/");
    const totalBytes = stats.blocks * stats.bsize;
    // `bavail`, not `bfree`: what a non-root process can still write.
    return { totalBytes, usedBytes: totalBytes - stats.bavail * stats.bsize };
  } catch {
    return null;
  }
}

/** MemAvailable, not os.freemem(): Linux keeps free memory busy as cache, which `free` alone reads as full. */
async function readMemory(): Promise<HealthMetrics["memory"]> {
  try {
    const meminfo = await readFile("/proc/meminfo", "utf8");
    const field = (name: string): number | null => {
      const match = new RegExp(`^${name}:\\s+(\\d+) kB`, "m").exec(meminfo);
      return match ? Number(match[1]) * 1024 : null;
    };
    const totalBytes = field("MemTotal");
    const availableBytes = field("MemAvailable");
    if (totalBytes === null || availableBytes === null) throw new Error("meminfo incomplete");
    return { totalBytes, availableBytes };
  } catch {
    return { totalBytes: os.totalmem(), availableBytes: os.freemem() };
  }
}

async function probeDatabase(): Promise<HealthMetrics["database"]> {
  const started = Date.now();
  try {
    const rows = await withTimeout(db.$queryRaw<{ size: bigint }[]>`select pg_database_size(current_database()) as size`);
    return { ok: true, latencyMs: Date.now() - started, sizeBytes: rows[0] ? Number(rows[0].size) : null };
  } catch (error) {
    return { ok: false, latencyMs: Date.now() - started, sizeBytes: null, error: message(error) };
  }
}

async function probeRedis(redis: Redis): Promise<{ redis: HealthMetrics["redis"]; heartbeat: string | null }> {
  const started = Date.now();
  try {
    const [, heartbeat] = await withTimeout(Promise.all([redis.ping(), redis.get(AGENT_HEARTBEAT_KEY)]));
    return { redis: { ok: true, latencyMs: Date.now() - started }, heartbeat };
  } catch (error) {
    return { redis: { ok: false, latencyMs: Date.now() - started, error: message(error) }, heartbeat: null };
  }
}

async function lastBankImportAgeDays(userId: string, now: number): Promise<number | null> {
  try {
    const newest = await withTimeout(
      db.expense.findFirst({
        where: { userId, source: { startsWith: "bca" } },
        orderBy: { date: "desc" },
        select: { date: true },
      }),
    );
    return newest ? Math.max(0, Math.floor((now - newest.date.getTime()) / DAY_MS)) : null;
  } catch {
    return null;
  }
}

export interface HealthSnapshot extends HealthReport {
  checkedAt: string;
  uptimeHours: number;
}

/** Everything is probed in parallel and every probe has a timeout: a sick dependency yields a red check, not a hung call. */
export async function collectHealth(userId: string, redis: Redis): Promise<HealthSnapshot> {
  const now = Date.now();
  const [disk, memory, database, { redis: redisMetric, heartbeat }, importAge] = await Promise.all([
    readDisk(),
    readMemory(),
    probeDatabase(),
    probeRedis(redis),
    lastBankImportAgeDays(userId, now),
  ]);

  const beatAt = heartbeat === null ? NaN : Number(heartbeat);
  const metrics: HealthMetrics = {
    disk,
    memory,
    load: { oneMinute: os.loadavg()[0] ?? 0, cpus: os.cpus().length },
    uptimeSeconds: os.uptime(),
    database,
    redis: redisMetric,
    agentHeartbeatAgeSeconds: Number.isFinite(beatAt) ? Math.max(0, Math.round((now - beatAt) / 1000)) : null,
    lastBankImportAgeDays: importAge,
  };

  return {
    ...evaluateHealth(metrics),
    checkedAt: new Date(now).toISOString(),
    uptimeHours: Math.round(metrics.uptimeSeconds / 360) / 10,
  };
}
