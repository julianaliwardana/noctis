"use client";

import { useState } from "react";
import { PomodoroTimer } from "@/features/pomodoro/ui/PomodoroTimer";
import { MusicPanel } from "@/features/pomodoro/ui/MusicPanel";
import { FloatingPanel } from "@/features/pomodoro/ui/FloatingPanel";
import { BackgroundPicker, SCENES } from "@/features/pomodoro/ui/BackgroundPicker";
import { recordSession } from "@/features/pomodoro/api/pomodoro.api";

export default function PomodoroPage() {
  const [background, setBackground] = useState(SCENES[0]!.css);
  const [nowPlaying, setNowPlaying] = useState<string | null>(null);

  // The negative margins cancel main's padding, so --app-screen-h (viewport minus the sticky header
  // and the fixed tab bar) lands exactly on the visible area — no scroll, no guessed header height.
  return (
    // theme-inverse: the scenes are always dark, so the timer and panels use the night tokens even
    // in the light theme (the readout used to be onyx-on-midnight). data-bleed opts out of the
    // contained content width.
    <div
      data-bleed
      className="theme-inverse relative -mx-4 -mt-4 -mb-20 h-(--app-screen-h) overflow-hidden bg-cover bg-center md:-m-8 md:h-dvh"
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
      <FloatingPanel title="Music" initial={{ x: 24, y: 24 }} marquee={nowPlaying}>
        <MusicPanel onNowPlaying={setNowPlaying} />
      </FloatingPanel>

      {/* Draggable, collapsible background widget (top-right) */}
      <FloatingPanel title="Background" initial={{ x: 24, y: 24 }} anchorRight>
        <BackgroundPicker value={background} onChange={setBackground} />
      </FloatingPanel>
    </div>
  );
}
