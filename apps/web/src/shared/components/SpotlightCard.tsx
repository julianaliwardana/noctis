import type { PropsWithChildren } from "react";
import { cn } from "@/lib/utils";

/**
 * A feature panel. It is a card as far as styling goes (data-slot="card"), so it follows the
 * user's card style and gets the pointer spotlight from the global listener in Providers.
 */
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
