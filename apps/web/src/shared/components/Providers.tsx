"use client";

import { useEffect, type ReactNode } from "react";
import { MotionConfig } from "motion/react";
import { useAppearance } from "@/lib/appearanceStore";

/**
 * The house spring. Physics, not a duration: motion carries velocity across interruptions, so a
 * highlight that is redirected mid-flight bends towards its new target instead of restarting.
 */
export const SPRING = { type: "spring", stiffness: 520, damping: 40, mass: 0.9 } as const;
export const SPRING_SOFT = { type: "spring", stiffness: 260, damping: 32 } as const;

/** Feeds the CSS card spotlight: one delegated listener for every card on the page. */
function useCardSpotlight(enabled: boolean): void {
  useEffect(() => {
    if (!enabled) return;
    let hot: HTMLElement | null = null;
    let frame = 0;
    let last: PointerEvent | null = null;

    function setHot(next: HTMLElement | null): void {
      if (hot === next) return;
      hot?.removeAttribute("data-hot");
      hot = next;
      hot?.setAttribute("data-hot", "");
    }

    function flush(): void {
      frame = 0;
      const event = last;
      if (!event) return;
      const card = (event.target as Element | null)?.closest?.<HTMLElement>('[data-slot="card"]') ?? null;
      setHot(card);
      if (!card) return;
      const rect = card.getBoundingClientRect();
      card.style.setProperty("--mx", `${event.clientX - rect.left}px`);
      card.style.setProperty("--my", `${event.clientY - rect.top}px`);
    }

    function onMove(event: PointerEvent): void {
      if (event.pointerType !== "mouse") return;
      last = event;
      if (!frame) frame = requestAnimationFrame(flush);
    }

    function onLeave(): void {
      setHot(null);
    }

    document.addEventListener("pointermove", onMove, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("pointermove", onMove);
      document.documentElement.removeEventListener("pointerleave", onLeave);
      setHot(null);
    };
  }, [enabled]);
}

export function Providers({ children }: { children: ReactNode }) {
  const appearance = useAppearance();
  useCardSpotlight(appearance.spotlight === "on");

  // "user" still honours the OS reduce-motion setting; "reduced" forces it regardless.
  return (
    <MotionConfig transition={SPRING} reducedMotion={appearance.motion === "reduced" ? "always" : "user"}>
      {children}
    </MotionConfig>
  );
}
