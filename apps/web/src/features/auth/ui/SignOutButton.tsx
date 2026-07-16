"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { clearToken } from "@/lib/auth";

export function SignOutButton() {
  const router = useRouter();

  function handleSignOut(): void {
    clearToken();
    router.replace("/login");
  }

  return (
    <button
      type="button"
      onClick={handleSignOut}
      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-border)]/30 hover:text-[var(--color-text)]"
    >
      <LogOut strokeWidth={1.75} className="h-5 w-5 shrink-0" />
      Sign out
    </button>
  );
}
