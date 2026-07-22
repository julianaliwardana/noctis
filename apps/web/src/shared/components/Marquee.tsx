"use client";

import { useLayoutEffect, useRef } from "react";

const SPEED = 40; // px per second — constant velocity regardless of text length
const GAP = 48; // min px between the repeated copies

export function Marquee({ text, className }: { text: string; className?: string }) {
  const boxRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const durRef = useRef(0);

  useLayoutEffect(() => {
    const box = boxRef.current;
    const track = trackRef.current;
    const inner = textRef.current;
    if (!box || !track || !inner) return;

    const measure = () => {
      const containerW = box.clientWidth;
      const textW = inner.offsetWidth;
      if (textW === 0) return;
      const pad = Math.max(GAP, containerW - textW + GAP); // segment >= container
      const segment = textW + pad;
      track.style.setProperty("--mpad", `${pad}px`);
      const dur = segment / SPEED;
      if (dur !== durRef.current) {
        durRef.current = dur;
        track.style.animationDuration = `${dur}s`;
      }
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(box);
    document.fonts?.ready.then(measure).catch(() => {}); // re-measure once fonts settle
    return () => ro.disconnect();
  }, [text]);

  return (
    <div
      ref={boxRef}
      className={`overflow-hidden ${className ?? ""}`}
      style={{
        maskImage: "linear-gradient(to right, transparent, #000 8%, #000 92%, transparent)",
        WebkitMaskImage: "linear-gradient(to right, transparent, #000 8%, #000 92%, transparent)",
      }}
    >
      <div
        ref={trackRef}
        className="flex w-max whitespace-nowrap will-change-transform"
        style={{
          animationName: "marquee",
          animationTimingFunction: "linear",
          animationIterationCount: "infinite",
          animationDuration: "8s",
        }}
      >
        <span style={{ paddingRight: "var(--mpad, 48px)" }}>
          <span ref={textRef}>{text}</span>
        </span>
        <span aria-hidden style={{ paddingRight: "var(--mpad, 48px)" }}>
          {text}
        </span>
      </div>
    </div>
  );
}
