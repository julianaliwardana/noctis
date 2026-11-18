import { db } from "@noctis/db";
import { pathForType, pushPublicKey, sendPush } from "@noctis/agent";

/** The browser's PushSubscription.toJSON(). */
export interface BrowserSubscription {
  endpoint: string;
  expirationTime?: number | null;
  keys: { p256dh: string; auth: string };
}

/** Public VAPID key the browser subscribes with. Null when push isn't configured on the server. */
export function publicKey(): string | null {
  return pushPublicKey();
}

/** One row per device. Re-subscribing the same browser updates it, even if another account owned it. */
export async function saveSubscription(userId: string, subscription: BrowserSubscription): Promise<void> {
  const json = JSON.stringify(subscription);
  await db.pushSubscription.upsert({
    where: { endpoint: subscription.endpoint },
    create: { userId, endpoint: subscription.endpoint, subscription: json },
    update: { userId, subscription: json },
  });
}

export async function removeSubscription(userId: string, endpoint: string): Promise<void> {
  await db.pushSubscription.deleteMany({ where: { userId, endpoint } });
}

export function countDevices(userId: string): Promise<number> {
  return db.pushSubscription.count({ where: { userId } });
}

/** Returns how many devices accepted it. */
export function sendTest(userId: string): Promise<number> {
  return sendPush(userId, {
    title: "Notifications are on",
    message: "Noctis will ping you about tasks, habits, payments and budgets.",
    url: "/profile",
    tag: "noctis-test",
  });
}

/** Stores an in-app nudge and pushes it. A dead push endpoint never fails the caller. */
export async function notify(userId: string, title: string, message: string, type: string): Promise<void> {
  await db.nudge.create({ data: { userId, title, message, type } });
  await sendPush(userId, { title, message, url: pathForType(type) });
}
