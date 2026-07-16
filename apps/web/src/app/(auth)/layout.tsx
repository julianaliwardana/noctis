import type { ReactNode } from "react";
import { AuroraBackground } from "@/shared/components/AuroraBackground";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex min-h-dvh items-center justify-center overflow-hidden p-4">
      <AuroraBackground />
      {children}
    </div>
  );
}
