"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Ids that have finished typing. Module-level so reopening the command palette — which unmounts
 * the whole list — replays the conversation as it was rather than retyping every reply.
 */
const finished = new Set<string>();

/** Long replies would crawl at a fixed rate, so the rate scales to keep them under ~2 seconds. */
function charsPerSecond(length: number): number {
  return Math.max(60, length / 2);
}

function skipAnimation(id: string): boolean {
  if (finished.has(id)) return true;
  if (typeof window === "undefined") return true;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export interface Typewriter {
  visible: string;
  done: boolean;
}

export function useTypewriter(id: string, text: string, onTick?: () => void): Typewriter {
  const [count, setCount] = useState(() => (skipAnimation(id) ? text.length : 0));
  const tick = useRef(onTick);
  tick.current = onTick;

  useEffect(() => {
    if (count >= text.length) {
      finished.add(id);
      return;
    }

    const start = performance.now();
    const from = count;
    let frame = 0;

    function step(now: number): void {
      const typed = Math.floor(((now - start) / 1000) * charsPerSecond(text.length));
      setCount(Math.min(from + typed, text.length));
      tick.current?.();
      if (from + typed < text.length) frame = requestAnimationFrame(step);
      // Marked here, not in the effect body: the effect never re-runs once the text stops growing.
      else finished.add(id);
    }

    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
    // Restarting on every count change would reset the clock, so this runs once per message.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, text]);

  return { visible: text.slice(0, count), done: count >= text.length };
}
