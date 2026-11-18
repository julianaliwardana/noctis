import { db } from "@noctis/db";
import type { NudgeDecision } from "@noctis/types";
import { pathForType, sendPush } from "./push";

export interface DeliveryOptions {
  /** In-app path to open on tap. Defaults to the page for the nudge's type. */
  url?: string;
  /** Replaces an earlier notification with the same tag on the device. */
  tag?: string;
}

/** Stores the nudge (in-app history) and pushes it to the user's devices. A push failure never throws. */
export async function deliverNudge(userId: string, decision: NudgeDecision, options: DeliveryOptions = {}): Promise<void> {
  await db.nudge.create({
    data: { userId, title: decision.title, message: decision.message, type: decision.type },
  });

  await sendPush(userId, {
    title: decision.title,
    message: decision.message,
    url: options.url ?? pathForType(decision.type),
    tag: options.tag,
  });
}
