"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/shared/components/ui/button";

const FOCUS_MINUTES = 25;
const TOTAL_SECONDS = FOCUS_MINUTES * 60;
const RING_RADIUS = 90;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

// Ring hue drifts from primary teal (session start) to the tasks amber (session end) —
// an ambient sense of elapsed time without staring at digits.
const START_COLOR = { r: 15, g: 139, b: 141 };
const END_COLOR = { r: 199, g: 125, b: 46 };

function lerpColor(t: number): string {
  const r = Math.round(START_COLOR.r + (END_COLOR.r - START_COLOR.r) * t);
  const g = Math.round(START_COLOR.g + (END_COLOR.g - START_COLOR.g) * t);
  const b = Math.round(START_COLOR.b + (END_COLOR.b - START_COLOR.b) * t);
  return `rgb(${r}, ${g}, ${b})`;
}

function formatTime(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}

export interface PomodoroTimerProps {
  onSessionComplete: (startedAt: Date, endedAt: Date) => void;
}

export function PomodoroTimer({ onSessionComplete }: PomodoroTimerProps) {
  const [remaining, setRemaining] = useState(TOTAL_SECONDS);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const startedAtRef = useRef<Date | null>(null);

  useEffect(() => {
    if (!running) return;

    const interval = window.setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          window.clearInterval(interval);
          setRunning(false);
          setDone(true);
          if (startedAtRef.current) onSessionComplete(startedAtRef.current, new Date());
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => window.clearInterval(interval);
  }, [running, onSessionComplete]);

  const progress = 1 - remaining / TOTAL_SECONDS;
  const offset = RING_CIRCUMFERENCE * (1 - progress);
  const ringColor = lerpColor(progress);

  function toggle(): void {
    if (done) {
      setRemaining(TOTAL_SECONDS);
      setDone(false);
      return;
    }
    if (!running) startedAtRef.current = new Date();
    setRunning((prev) => !prev);
  }

  return (
    <div className="flex flex-col items-center gap-8">
      <div
        className={`relative flex h-64 w-64 items-center justify-center ${
          running ? "motion-safe:animate-[breathe_4s_ease-in-out_infinite]" : ""
        }`}
      >
        <svg viewBox="0 0 200 200" className="h-full w-full -rotate-90">
          <circle cx="100" cy="100" r={RING_RADIUS} fill="none" stroke="var(--color-border)" strokeWidth="6" />
          <circle
            cx="100"
            cy="100"
            r={RING_RADIUS}
            fill="none"
            stroke={ringColor}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={RING_CIRCUMFERENCE}
            strokeDashoffset={offset}
            className="transition-[stroke-dashoffset] duration-1000 ease-linear"
          />
        </svg>
        <div className="absolute flex flex-col items-center">
          <span className="font-[family-name:var(--font-mono)] text-5xl text-[var(--color-text)]">
            {formatTime(remaining)}
          </span>
          {done && <span className="mt-2 text-sm text-[var(--color-text-muted)]">Session complete</span>}
        </div>
      </div>
      <Button type="button" onClick={toggle}>
        {done ? "Start another" : running ? "Pause" : "Start focus session"}
      </Button>
    </div>
  );
}
