import type { ReactNode } from "react";
import ColorBends from "@/components/ColorBends";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex min-h-dvh items-center justify-center overflow-hidden p-4">
      <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden>
        <ColorBends colors={["#3b6ea5", "#0f8b8d", "#1a3d6b"]} />
      </div>
      {children}
    </div>
  );
}
