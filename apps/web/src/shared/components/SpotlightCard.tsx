import type { PropsWithChildren } from "react";
import { cn } from "@/lib/utils";

/** A feature panel styled as a card (data-slot="card"), with the global pointer spotlight. */
export default function SpotlightCard({ children, className }: PropsWithChildren<{ className?: string }>) {
  return (
    <div
      data-slot="card"
      className={cn("overflow-hidden rounded-2xl bg-card p-6 text-card-foreground ring-1 ring-foreground/10", className)}
    >
      {children}
    </div>
  );
}
