import type { ReactNode } from "react";
import ColorBends from "@/shared/components/ColorBends";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex min-h-dvh items-center justify-center overflow-hidden p-4">
      <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden>
        <ColorBends colors={["#2f5bff", "#1b2f8f", "#0c0d10"]} />
      </div>
      {children}
    </div>
  );
}
