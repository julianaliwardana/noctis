"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { logout } from "@/features/auth/api/auth.api";

export function SignOutButton() {
  const router = useRouter();

  // Awaited, not fired and forgotten: the cookies must be gone before the navigation, or the
  // middleware still sees a session and bounces the user straight back to /dashboard.
  async function handleSignOut(): Promise<void> {
    await logout().catch(() => {});
    router.replace("/login");
  }

  return (
    <button
      type="button"
      onClick={() => void handleSignOut()}
      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-border)]/30 hover:text-[var(--color-text)]"
    >
      <LogOut strokeWidth={1.75} className="h-5 w-5 shrink-0" />
      Sign out
    </button>
  );
}
