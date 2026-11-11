import { Queue, Worker } from "bullmq";
import IORedis from "ioredis";
import { db } from "@noctis/db";
import type { NudgeSlot } from "@noctis/types";
import { analyzeUser } from "./analyzer";
import { remindPendingReviews } from "./reviewReminder";

const QUEUE_NAME = "nudges";

interface NudgeJobData {
  slot: NudgeSlot;
}

const SCHEDULES: Array<{ slot: NudgeSlot; cron: string }> = [
  { slot: "morning", cron: "0 0 8 * * *" },
  { slot: "midday", cron: "0 0 13 * * *" },
  { slot: "evening", cron: "0 0 21 * * *" },
];

export function startScheduler(): { queue: Queue<NudgeJobData>; worker: Worker<NudgeJobData> } {
  const connection = new IORedis(process.env.REDIS_URL ?? "redis://localhost:6379", {
    maxRetriesPerRequest: null,
  });

  const queue = new Queue<NudgeJobData>(QUEUE_NAME, { connection });

  for (const { slot, cron } of SCHEDULES) {
    queue.upsertJobScheduler(`nudge-${slot}`, { pattern: cron }, { name: slot, data: { slot } });
  }

  const worker = new Worker<NudgeJobData>(
    QUEUE_NAME,
    async (job) => {
      const users = await db.user.findMany({ select: { id: true } });
      try {
        await Promise.all(users.map((user) => analyzeUser(user.id, job.data.slot)));
      } finally {
        // After the AI nudge, so this plain reminder can't trip its anti-spam window — and in a
        // `finally`, so an LLM outage doesn't take the reminder down with it.
        if (job.data.slot === "evening") {
          await Promise.all(users.map((user) => remindPendingReviews(user.id)));
        }
      }
    },
    { connection },
  );

  return { queue, worker };
}
