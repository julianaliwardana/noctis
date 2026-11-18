import { Queue, Worker } from "bullmq";
import IORedis from "ioredis";
import { db } from "@noctis/db";
import type { NudgeSlot } from "@noctis/types";
import { analyzeUser } from "./analyzer";
import { remindPendingReviews } from "./reviewReminder";
import { remindSalaryDue } from "./salaryReminder";
import { remindHabitsLeft, remindPaymentsDue, remindTasksDueSoon, remindTasksToday } from "./reminders";
import { startHeartbeat } from "./heartbeat";

const QUEUE_NAME = "nudges";

interface NudgeJobData {
  /** A nudge slot, or the 15-minute tick that checks for tasks due soon. */
  slot: NudgeSlot | "due-soon";
}

const TZ = process.env.TZ || "Asia/Jakarta";

const SCHEDULES: Array<{ slot: NudgeJobData["slot"]; cron: string }> = [
  { slot: "due-soon", cron: "0 */15 * * * *" },
  { slot: "morning", cron: "0 0 8 * * *" },
  { slot: "midday", cron: "0 0 13 * * *" },
  { slot: "evening", cron: "0 0 21 * * *" },
];

export function startScheduler(): { queue: Queue<NudgeJobData>; worker: Worker<NudgeJobData> } {
  const connection = new IORedis(process.env.REDIS_URL ?? "redis://localhost:6379", {
    maxRetriesPerRequest: null,
  });

  const queue = new Queue<NudgeJobData>(QUEUE_NAME, { connection });
  startHeartbeat(connection);

  for (const { slot, cron } of SCHEDULES) {
    // Explicit tz: 08:00 means 08:00 WIB even if the container's clock is UTC.
    queue.upsertJobScheduler(`nudge-${slot}`, { pattern: cron, tz: TZ }, { name: slot, data: { slot } });
  }

  const worker = new Worker<NudgeJobData>(
    QUEUE_NAME,
    async (job) => {
      const { slot } = job.data;
      if (slot === "due-soon") {
        await remindTasksDueSoon(connection);
        return;
      }

      const users = await db.user.findMany({ select: { id: true } });
      try {
        await Promise.all(users.map((user) => analyzeUser(user.id, slot)));
      } finally {
        // After the AI nudge (avoids its anti-spam window), and in `finally` so an LLM outage can't skip it.
        if (slot === "morning") {
          await Promise.all(users.map((user) => remindTasksToday(user.id)));
          await Promise.all(users.map((user) => remindPaymentsDue(user.id)));
        }
        if (slot === "evening") {
          await Promise.all(users.map((user) => remindHabitsLeft(user.id)));
          await Promise.all(users.map((user) => remindPendingReviews(user.id)));
          await Promise.all(users.map((user) => remindSalaryDue(user.id)));
        }
      }
    },
    { connection },
  );

  return { queue, worker };
}
