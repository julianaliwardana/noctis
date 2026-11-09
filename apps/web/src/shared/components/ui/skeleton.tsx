import { cn } from "@/lib/utils";

/** Placeholder block for streamed content. Part of the static shell under PPR. */
function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      aria-hidden
      className={cn("animate-pulse rounded-md bg-[var(--color-border)]/40", className)}
      {...props}
    />
  );
}

export { Skeleton };
