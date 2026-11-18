import webpush from "web-push";
import { db } from "@noctis/db";

/** What the service worker (apps/web/worker/index.ts) reads out of a push. */
export interface PushPayload {
  title: string;
  message: string;
  /** In-app path the notification opens. */
  url?: string;
  /** A later push with the same tag replaces the earlier notification instead of stacking. */
  tag?: string;
}

/** Hours a push service keeps trying a device that's offline. */
const TTL_SECONDS = 12 * 60 * 60;

const PATH_BY_TYPE: Record<string, string> = {
  task: "/tasks",
  habit: "/habits",
  finance: "/finance",
  focus: "/pomodoro",
};

/** Where a nudge of this type should land when tapped. */
export function pathForType(type: string): string {
  return PATH_BY_TYPE[type] ?? "/dashboard";
}

/**
 * VAPID subject: web-push wants a `mailto:` or `https:` URL and throws on a bare address, and
 * Apple rejects a subject with stray quotes or spaces. `julian@x.dev` → `mailto:julian@x.dev`.
 */
export function vapidSubject(raw: string | undefined): string {
  const value = (raw ?? "").trim().replace(/^["']+|["']+$/g, "").replace(/\s+/g, "");
  if (!value) return "mailto:noreply@julianwardana.dev";
  if (/^(mailto:|https:\/\/)/i.test(value)) return value;
  return `mailto:${value.replace(/^mailto/i, "")}`;
}

export function pushPublicKey(): string | null {
  return process.env.VAPID_PUBLIC_KEY?.trim() || null;
}

let state: "unset" | "ready" | "off" = "unset";

/** Reads the env on first use, so a bad key logs once instead of crashing the process at import. */
function ready(): boolean {
  if (state !== "unset") return state === "ready";
  const publicKey = pushPublicKey();
  const privateKey = process.env.VAPID_PRIVATE_KEY?.trim();
  if (!publicKey || !privateKey) {
    console.warn("Web push off: VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY not set.");
    state = "off";
    return false;
  }
  try {
    webpush.setVapidDetails(vapidSubject(process.env.VAPID_MAILTO), publicKey, privateKey);
    state = "ready";
  } catch (error) {
    console.error("Web push off: VAPID settings rejected.", error);
    state = "off";
  }
  return state === "ready";
}

export function pushEnabled(): boolean {
  return ready();
}

/**
 * Pushes to every device the user turned notifications on for. Endpoints the push service says
 * are gone (404/410) are deleted. Never throws; returns how many devices accepted it.
 */
export async function sendPush(userId: string, payload: PushPayload): Promise<number> {
  if (!ready()) return 0;

  let records: Array<{ id: string; subscription: string }>;
  try {
    records = await db.pushSubscription.findMany({ where: { userId }, select: { id: true, subscription: true } });
  } catch (error) {
    console.error("Push: couldn't load subscriptions", error);
    return 0;
  }

  const body = JSON.stringify(payload);
  const results = await Promise.all(
    records.map(async (record) => {
      try {
        const subscription = JSON.parse(record.subscription) as webpush.PushSubscription;
        await webpush.sendNotification(subscription, body, { TTL: TTL_SECONDS, urgency: "high" });
        return true;
      } catch (error) {
        const status = (error as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) {
          await db.pushSubscription.deleteMany({ where: { id: record.id } }).catch(() => undefined);
        } else {
          console.error("Push delivery failed", status ?? "", (error as { body?: string }).body ?? error);
        }
        return false;
      }
    }),
  );
  return results.filter(Boolean).length;
}
