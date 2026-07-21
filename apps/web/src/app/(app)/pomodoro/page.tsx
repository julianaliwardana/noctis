"use client";

import { useState } from "react";
import { PomodoroTimer } from "@/features/pomodoro/ui/PomodoroTimer";
import { MusicPanel } from "@/features/pomodoro/ui/MusicPanel";
import { FloatingPanel } from "@/features/pomodoro/ui/FloatingPanel";
import { BackgroundPicker, SCENES } from "@/features/pomodoro/ui/BackgroundPicker";
import { recordSession } from "@/features/pomodoro/api/pomodoro.api";

export default function PomodoroPage() {
  const [background, setBackground] = useState(SCENES[0]!.css);

  return (
    <div
      className="relative -m-4 min-h-[calc(100dvh-3.5rem)] overflow-hidden bg-cover bg-center md:-m-8 md:min-h-dvh"
      style={{ background }}
    >
      <div className="absolute inset-0 bg-black/40" aria-hidden />

      {/* Timer centered in the container */}
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <PomodoroTimer
          onSessionComplete={(phase, startedAt, endedAt) => {
            recordSession(phase, startedAt.toISOString(), endedAt.toISOString());
          }}
        />
      </div>

      {/* Draggable, collapsible music widget (top-left) */}
      <FloatingPanel title="Music" initial={{ x: 24, y: 24 }}>
        <MusicPanel />
      </FloatingPanel>

      {/* Draggable, collapsible background widget (top-right) */}
      <FloatingPanel title="Background" initial={{ x: 24, y: 24 }} anchorRight>
        <BackgroundPicker value={background} onChange={setBackground} />
      </FloatingPanel>
    </div>
  );
}
