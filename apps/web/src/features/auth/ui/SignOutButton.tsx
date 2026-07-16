"use client";

import { useRouter } from "next/navigation";
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
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 shrink-0">
        <path d="M15 4H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8" />
        <path d="M10 12h10m0 0-3-3m3 3-3 3" />
      </svg>
      Sign out
    </button>
  );
}
