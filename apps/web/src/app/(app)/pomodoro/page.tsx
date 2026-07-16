"use client";

import { PomodoroTimer } from "@/features/pomodoro/ui/PomodoroTimer";
import { recordSession } from "@/features/pomodoro/api/pomodoro.api";

export default function PomodoroPage() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-2">
      <PomodoroTimer
        onSessionComplete={(startedAt, endedAt) => {
          recordSession(startedAt.toISOString(), endedAt.toISOString());
        }}
      />
    </div>
  );
}
