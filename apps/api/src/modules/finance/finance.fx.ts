import type Redis from "ioredis";

/**
 * Rupiah value of a foreign-currency charge. BCA's debit-card emails show only the original amount
 * ("USD 22,2"), never what left the account, so this is an estimate at the market rate — the
 * transaction is flagged for review and the user corrects it from the mutation (update_transaction).
 */
const RATE_URL = "https://open.er-api.com/v6/latest/";
const CACHE_SECONDS = 6 * 60 * 60;
const TIMEOUT_MS = 8_000;

export const CURRENCY = /^[A-Z]{3}$/;

interface RateResponse {
  result?: string;
  rates?: Record<string, number>;
}

export async function rateToIdr(redis: Redis, currency: string): Promise<number | null> {
  if (currency === "IDR") return 1;
  const key = `fx:${currency}:IDR`;

  // A Redis hiccup must not stop an import — fall through to the live rate.
  const cached = await redis.get(key).catch(() => null);
  if (cached && Number(cached) > 0) return Number(cached);

  try {
    const res = await fetch(`${RATE_URL}${currency}`, { signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (!res.ok) return null;
    const data = (await res.json()) as RateResponse;
    const rate = data.result === "success" ? data.rates?.IDR : undefined;
    if (!rate || !(rate > 0)) return null;
    await redis.set(key, String(rate), "EX", CACHE_SECONDS).catch(() => undefined);
    return rate;
  } catch {
    return null;
  }
}

/** Whole rupiah, as the bank books it. */
export function toIdr(amount: number, rate: number): number {
  return Math.round(amount * rate);
}
