"use client";

import { useEffect, useRef, useState, type ReactNode, type PointerEvent } from "react";
import { GripVertical, Minus, Plus } from "lucide-react";
import { Marquee } from "@/shared/components/Marquee";

export interface FloatingPanelProps {
  title: string;
  children: ReactNode;
  initial?: { x: number; y: number };
  anchorRight?: boolean;
  /** Scrolls in the header while collapsed (e.g. the now-playing track). */
  marquee?: string | null;
}

export function FloatingPanel({ title, children, initial = { x: 24, y: 24 }, anchorRight = false, marquee }: FloatingPanelProps) {
  const [pos, setPos] = useState(initial);
  const [collapsed, setCollapsed] = useState(false);
  const dragRef = useRef<{ dx: number; dy: number } | null>(null);
  const posRef = useRef(initial);
  const panelRef = useRef<HTMLDivElement>(null);

  // Place on mount and keep inside the container on resize: a right-anchored panel
  // re-glues to the right edge, any panel gets clamped back into view.
  useEffect(() => {
    function reposition(): void {
      const el = panelRef.current;
      const parent = el?.offsetParent as HTMLElement | null;
      if (!el || !parent) return;
      const maxX = Math.max(0, parent.clientWidth - el.offsetWidth);
      const maxY = Math.max(0, parent.clientHeight - el.offsetHeight);
      setPos((p) => {
        const x = anchorRight ? Math.max(0, parent.clientWidth - el.offsetWidth - initial.x) : Math.min(p.x, maxX);
        const y = Math.min(p.y, maxY);
        posRef.current = { x, y };
        return { x, y };
      });
    }
    reposition();
    window.addEventListener("resize", reposition);
    return () => window.removeEventListener("resize", reposition);
  }, [anchorRight, initial.x]);

  function onPointerDown(e: PointerEvent<HTMLDivElement>): void {
    const el = panelRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    dragRef.current = { dx: e.clientX - rect.left, dy: e.clientY - rect.top };
    (e.target as Element).setPointerCapture(e.pointerId);
  }

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
      className="absolute z-20 w-[min(20rem,calc(100vw-1.5rem))] overflow-hidden rounded-2xl border border-white/15 bg-black/30 text-[var(--color-text)] shadow-2xl backdrop-blur-xl"
      style={{ left: pos.x, top: pos.y }}
    >
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        className="flex touch-none select-none items-center gap-2 px-3 py-2 cursor-grab active:cursor-grabbing"
      >
        <GripVertical className="h-4 w-4 shrink-0 text-white/50" />
        <span className="shrink-0 text-sm font-medium text-white/90">{title}</span>
        {collapsed && marquee && (
          <Marquee text={marquee} className="min-w-0 flex-1 text-xs text-white/60" />
        )}
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
