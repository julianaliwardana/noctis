"use client";

import { useRef, useState, type ReactNode, type PointerEvent } from "react";
import { GripVertical, Minus, Plus } from "lucide-react";

export interface FloatingPanelProps {
  title: string;
  children: ReactNode;
  initial?: { x: number; y: number };
}

export function FloatingPanel({ title, children, initial = { x: 24, y: 24 } }: FloatingPanelProps) {
  const [pos, setPos] = useState(initial);
  const [collapsed, setCollapsed] = useState(false);
  const dragRef = useRef<{ dx: number; dy: number } | null>(null);
  const posRef = useRef(initial);
  const panelRef = useRef<HTMLDivElement>(null);

  function onPointerDown(e: PointerEvent<HTMLDivElement>): void {
    const el = panelRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    dragRef.current = { dx: e.clientX - rect.left, dy: e.clientY - rect.top };
    (e.target as Element).setPointerCapture(e.pointerId);
  }

  // Write position straight to the DOM during the drag — re-rendering on every
  // pointermove reconciles the whole panel (iframe + animated bars) and janks.
  function onPointerMove(e: PointerEvent<HTMLDivElement>): void {
    const drag = dragRef.current;
    const el = panelRef.current;
    const parent = el?.offsetParent as HTMLElement | null;
    if (!drag || !el || !parent) return;
    const bounds = parent.getBoundingClientRect();
    const maxX = bounds.width - el.offsetWidth;
    const maxY = bounds.height - el.offsetHeight;
    const x = Math.max(0, Math.min(maxX, e.clientX - bounds.left - drag.dx));
    const y = Math.max(0, Math.min(maxY, e.clientY - bounds.top - drag.dy));
    posRef.current = { x, y };
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
  }

  function onPointerUp(e: PointerEvent<HTMLDivElement>): void {
    if (!dragRef.current) return;
    dragRef.current = null;
    (e.target as Element).releasePointerCapture(e.pointerId);
    setPos(posRef.current); // commit so it survives re-renders (e.g. collapse)
  }

  return (
    <div
      ref={panelRef}
      className="absolute z-20 w-80 overflow-hidden rounded-2xl border border-white/15 bg-black/30 text-[var(--color-text)] shadow-2xl backdrop-blur-xl"
      style={{ left: pos.x, top: pos.y }}
    >
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        className="flex cursor-grab items-center gap-2 px-3 py-2 active:cursor-grabbing"
      >
        <GripVertical className="h-4 w-4 text-white/50" />
        <span className="text-sm font-medium text-white/90">{title}</span>
        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          aria-label={collapsed ? "Expand" : "Collapse"}
          className="ml-auto flex h-6 w-6 items-center justify-center rounded-md text-white/70 hover:bg-white/10 hover:text-white"
        >
          {collapsed ? <Plus className="h-4 w-4" /> : <Minus className="h-4 w-4" />}
        </button>
      </div>
      {/* Hidden (not unmounted) when collapsed so the music keeps playing. */}
      <div className={collapsed ? "hidden" : "px-3 pb-3"}>{children}</div>
    </div>
  );
}
