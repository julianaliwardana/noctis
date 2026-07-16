import webpush from "web-push";
import { db } from "@noctis/db";
import type { NudgeDecision } from "@noctis/types";

const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
const pushEnabled = Boolean(vapidPublicKey && vapidPrivateKey);

if (pushEnabled) {
  webpush.setVapidDetails(process.env.VAPID_MAILTO ?? "mailto:you@example.com", vapidPublicKey!, vapidPrivateKey!);
}

export async function deliverNudge(userId: string, decision: NudgeDecision): Promise<void> {
  await db.nudge.create({
    data: { userId, title: decision.title, message: decision.message, type: decision.type },
  });

  if (!pushEnabled) return;

  const subscription = await db.pushSubscription.findUnique({ where: { userId } });
  if (!subscription) return;

  const parsedSubscription = JSON.parse(subscription.subscription) as webpush.PushSubscription;
  await webpush.sendNotification(parsedSubscription, JSON.stringify({ title: decision.title, message: decision.message }));
}
