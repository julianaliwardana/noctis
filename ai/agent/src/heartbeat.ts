import type IORedis from "ioredis";

/** Read by the API's server_health check (apps/api/src/modules/health/health.service.ts). */
const HEARTBEAT_KEY = "noctis:agent:heartbeat";
const INTERVAL_MS = 60 * 1000;
/** Expires after a few missed beats, so a dead agent shows no heartbeat rather than a stale one. */
const TTL_SECONDS = 60 * 60;

/** A failed write is logged, never fatal. */
export function startHeartbeat(redis: IORedis): () => void {
  const beat = (): void => {
    redis.set(HEARTBEAT_KEY, String(Date.now()), "EX", TTL_SECONDS).catch((error: unknown) => {
      console.error("Heartbeat write failed", error);
    });
  };
  beat();
  const timer = setInterval(beat, INTERVAL_MS);
  timer.unref();
  return () => clearInterval(timer);
}
