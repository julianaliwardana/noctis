"use client";

import { useEffect, useRef, useState } from "react";
import { Settings, Minus, Plus } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/components/ui/popover";
import Counter from "@/shared/components/Counter";
import type { PomodoroPhase } from "../api/pomodoro.api";

function Stepper({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-2 py-0.5 text-sm">
      <span className="text-[var(--color-text-muted)]">{label}</span>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onChange(value - 1)}
          disabled={value <= min}
          aria-label={`Decrease ${label}`}
          className="flex h-6 w-6 items-center justify-center rounded-md text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-border)]/50 hover:text-[var(--color-text)] disabled:opacity-30"
        >
          <Minus className="h-3.5 w-3.5" />
        </button>
        <Counter
          value={value}
          fontSize={18}
          gap={1}
          horizontalPadding={2}
          textColor="var(--color-text)"
          gradientFrom="var(--color-surface)"
          gradientHeight={5}
        />
        <button
          type="button"
          onClick={() => onChange(value + 1)}
          disabled={value >= max}
          aria-label={`Increase ${label}`}
          className="flex h-6 w-6 items-center justify-center rounded-md text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-border)]/50 hover:text-[var(--color-text)] disabled:opacity-30"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

const PHASES: PomodoroPhase[] = ["focus", "short", "long"];
const PHASE_LABEL: Record<PomodoroPhase, string> = {
  focus: "Focus",
  short: "Short break",
  long: "Long break",
};

interface Durations {
  focus: number;
  short: number;
  long: number;
  longEvery: number;
}

const DEFAULTS: Durations = { focus: 25, short: 5, long: 15, longEvery: 4 };

const TICKS = 44;
const R_INNER = 76;
const R_OUTER = 92;

// Ring lights teal (start) → amber (end), VU-meter style.
const START = { r: 15, g: 139, b: 141 };
const END = { r: 199, g: 125, b: 46 };

function lerpColor(t: number): string {
  const r = Math.round(START.r + (END.r - START.r) * t);
  const g = Math.round(START.g + (END.g - START.g) * t);
  const b = Math.round(START.b + (END.b - START.b) * t);
  return `rgb(${r}, ${g}, ${b})`;
}

function formatTime(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

// Soft two-note chime via WebAudio — no asset needed.
function playChime(): void {
  const ctx = new AudioContext();
  const now = ctx.currentTime;
  [523.25, 783.99].forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    const t = now + i * 0.16;
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.18, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.7);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.7);
  });
  window.setTimeout(() => void ctx.close(), 1400);
}

export interface PomodoroTimerProps {
  onSessionComplete: (phase: PomodoroPhase, startedAt: Date, endedAt: Date) => void;
}

export function PomodoroTimer({ onSessionComplete }: PomodoroTimerProps) {
  const [durations, setDurations] = useState<Durations>(DEFAULTS);
  const [phase, setPhase] = useState<PomodoroPhase>("focus");
  const [remaining, setRemaining] = useState(DEFAULTS.focus * 60);
  const [running, setRunning] = useState(false);
  const [focusStreak, setFocusStreak] = useState(0); // total focus sessions this sitting
  const [dotsLit, setDotsLit] = useState(0); // focus sessions toward next long break
  const startedAtRef = useRef<Date | null>(null);

  const total = durations[phase] * 60;
  const progress = total > 0 ? 1 - remaining / total : 0;

  function applyPhase(next: PomodoroPhase, autoStart: boolean): void {
    setPhase(next);
    setRemaining(durations[next] * 60);
    startedAtRef.current = autoStart ? new Date() : null;
    setRunning(autoStart);
  }

  // Fresh-scope completion handler, invoked by the tick effect via ref to avoid stale state.
  const completeRef = useRef<() => void>(() => {});
  completeRef.current = () => {
    playChime();
    if (startedAtRef.current) onSessionComplete(phase, startedAtRef.current, new Date());

    if (phase === "focus") {
      const done = dotsLit + 1;
      setFocusStreak((s) => s + 1);
      if (done >= durations.longEvery) {
        setDotsLit(durations.longEvery);
        applyPhase("long", true);
      } else {
        setDotsLit(done);
        applyPhase("short", true);
      }
    } else {
      if (phase === "long") setDotsLit(0);
      applyPhase("focus", true);
    }
  };

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => setRemaining((r) => Math.max(0, r - 1)), 1000);
    return () => window.clearInterval(id);
  }, [running]);

  useEffect(() => {
    if (running && remaining === 0) completeRef.current();
  }, [running, remaining]);

  function toggle(): void {
    if (running) {
      setRunning(false);
      return;
    }
    if (remaining === 0) setRemaining(total);
    if (!startedAtRef.current) startedAtRef.current = new Date();
    setRunning(true);
  }

  function selectPhase(next: PomodoroPhase): void {
    applyPhase(next, false);
  }

  function updateDuration(key: keyof Durations, value: number): void {
    const safe = Math.max(1, Math.min(180, value || 1));
    setDurations((prev) => {
      const nextDurations = { ...prev, [key]: safe };
      if (!running && key === phase) setRemaining(nextDurations[phase] * 60);
      return nextDurations;
    });
  }

  const ticks = Array.from({ length: TICKS }, (_, i) => {
    const frac = i / TICKS;
    const angle = frac * 2 * Math.PI - Math.PI / 2;
    const lit = frac <= progress;
    return {
      x1: 100 + R_INNER * Math.cos(angle),
      y1: 100 + R_INNER * Math.sin(angle),
      x2: 100 + R_OUTER * Math.cos(angle),
      y2: 100 + R_OUTER * Math.sin(angle),
      stroke: lit ? lerpColor(frac) : "var(--color-border)",
      opacity: lit ? 1 : 0.4,
    };
  });

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="flex items-center gap-1.5 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)]/60 p-1 backdrop-blur">
        {PHASES.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => selectPhase(p)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              phase === p
                ? "bg-[var(--color-primary)] text-[var(--color-primary-fg)]"
                : "text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
            }`}
          >
            {PHASE_LABEL[p]}
          </button>
        ))}
        <Popover>
          <PopoverTrigger asChild>
            <Button type="button" variant="ghost" size="icon-sm" aria-label="Timer settings">
              <Settings className="h-4 w-4" strokeWidth={1.75} />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-60">
            <p className="mb-1 text-xs font-medium text-[var(--color-text)]">Durations (minutes)</p>
            {(["focus", "short", "long"] as const).map((key) => (
              <Stepper
                key={key}
                label={PHASE_LABEL[key]}
                value={durations[key]}
                min={1}
                max={180}
                onChange={(v) => updateDuration(key, v)}
              />
            ))}
            <Stepper
              label="Long break every"
              value={durations.longEvery}
              min={1}
              max={12}
              onChange={(v) => updateDuration("longEvery", v)}
            />
          </PopoverContent>
        </Popover>
      </div>

      <div
        className={`relative flex h-64 w-64 items-center justify-center ${
          running ? "motion-safe:animate-[breathe_4s_ease-in-out_infinite]" : ""
        }`}
      >
        <svg viewBox="0 0 200 200" className="h-full w-full">
          {ticks.map((t, i) => (
            <line
              key={i}
              x1={t.x1}
              y1={t.y1}
              x2={t.x2}
              y2={t.y2}
              stroke={t.stroke}
              strokeOpacity={t.opacity}
              strokeWidth={3}
              strokeLinecap="round"
              className="transition-[stroke,stroke-opacity] duration-500"
            />
          ))}
        </svg>
        <div className="absolute flex flex-col items-center">
          <span className="text-xs uppercase tracking-widest text-[var(--color-text-muted)]">
            {PHASE_LABEL[phase]}
          </span>
          <span className="font-[family-name:var(--font-mono)] text-5xl text-[var(--color-text)]">
            {formatTime(remaining)}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {Array.from({ length: durations.longEvery }, (_, i) => (
          <span
            key={i}
            className={`h-2 w-2 rounded-full transition-colors ${
              i < dotsLit ? "bg-[var(--color-primary)]" : "bg-[var(--color-border)]"
            }`}
            aria-hidden
          />
        ))}
        <span className="ml-1 text-xs text-[var(--color-text-muted)]">{focusStreak} done</span>
      </div>

      <Button type="button" onClick={toggle} className="min-w-40">
        {running ? "Pause" : remaining === 0 ? "Continue" : "Start"}
      </Button>
    </div>
  );
}
