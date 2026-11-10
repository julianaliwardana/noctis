"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { logout } from "@/features/auth/api/auth.api";

export function SignOutButton() {
  const router = useRouter();

  // Awaited, not fired and forgotten: the cookies must be gone before the navigation, or the
  // proxy (src/proxy.ts) still sees a session and bounces the user straight back to /dashboard.
  async function handleSignOut(): Promise<void> {
    await logout().catch(() => {});
    router.replace("/login");
  }

  return (
    <button
      type="button"
      onClick={() => void handleSignOut()}
      aria-label="Sign out"
      className="group relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-[var(--color-text-muted)] outline-none transition-colors hover:bg-[var(--color-border)]/45 hover:text-[var(--color-text)] focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] rail:md:justify-center rail:md:px-0"
    >
      <LogOut strokeWidth={1.75} className="h-5 w-5 shrink-0" />
      <span className="truncate rail:md:sr-only">Sign out</span>
    </button>
  );
}
