import webpush from "web-push";
import { db } from "@noctis/db";
import type { PushSubscription } from "@noctis/db";

const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
const pushEnabled = Boolean(vapidPublicKey && vapidPrivateKey);

if (pushEnabled) {
  webpush.setVapidDetails(process.env.VAPID_MAILTO ?? "mailto:you@example.com", vapidPublicKey!, vapidPrivateKey!);
}

export function saveSubscription(userId: string, subscription: string): Promise<PushSubscription> {
  return db.pushSubscription.upsert({
    where: { userId },
    create: { userId, subscription },
    update: { subscription },
  });
}

export async function sendPush(userId: string, title: string, message: string): Promise<void> {
  if (!pushEnabled) return;

  const record = await db.pushSubscription.findUnique({ where: { userId } });
  if (!record) return;

  const subscription = JSON.parse(record.subscription) as webpush.PushSubscription;
  await webpush.sendNotification(subscription, JSON.stringify({ title, message }));
}

/**
 * A notification the app raises itself (a budget crossed, transfers waiting for a category):
 * stored as a nudge so it shows in the app, and pushed when the user has a subscription.
 * A dead push endpoint must not fail the request that triggered it.
 */
export async function notify(userId: string, title: string, message: string, type: string): Promise<void> {
  await db.nudge.create({ data: { userId, title, message, type } });
  try {
    await sendPush(userId, title, message);
  } catch (error) {
    console.error("Push delivery failed", error);
  }
}
