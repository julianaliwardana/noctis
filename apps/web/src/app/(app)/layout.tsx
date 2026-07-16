"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid, ListChecks, Flame, Timer, BarChart3, Lock, Sparkles } from "lucide-react";
import { AuthGuard } from "@/features/auth/ui/AuthGuard";
import { CommandPalette } from "@/features/ai/ui/CommandPalette";
import { SignOutButton } from "@/features/auth/ui/SignOutButton";
import { cn } from "@/shared/utils/cn";

type Tone = "primary" | "tasks" | "habits" | "finance" | "passwords";

interface NavItem {
  href: string;
  label: string;
  tone: Tone;
  icon: ReactNode;
}

const iconProps = { strokeWidth: 1.75, className: "h-full w-full" };

const navItems: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", tone: "primary", icon: <LayoutGrid {...iconProps} /> },
  { href: "/tasks", label: "Tasks", tone: "tasks", icon: <ListChecks {...iconProps} /> },
  { href: "/habits", label: "Habits", tone: "habits", icon: <Flame {...iconProps} /> },
  { href: "/pomodoro", label: "Pomodoro", tone: "primary", icon: <Timer {...iconProps} /> },
  { href: "/finance", label: "Finance", tone: "finance", icon: <BarChart3 {...iconProps} /> },
  { href: "/passwords", label: "Passwords", tone: "passwords", icon: <Lock {...iconProps} /> },
  { href: "/ai", label: "AI Chat", tone: "primary", icon: <Sparkles {...iconProps} /> },
];

const toneVar: Record<Tone, string> = {
  primary: "var(--color-primary)",
  tasks: "var(--color-tasks)",
  habits: "var(--color-habits)",
  finance: "var(--color-finance)",
  passwords: "var(--color-passwords)",
};

export default function AppLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  function isActive(href: string): boolean {
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <AuthGuard>
      <div className="flex min-h-dvh flex-col md:flex-row">
        <aside className="hidden shrink-0 border-r border-[var(--color-border)] bg-[var(--color-surface)]/70 backdrop-blur-xl md:sticky md:top-0 md:flex md:h-dvh md:w-64 md:flex-col md:p-4">
          <div className="mb-6 flex items-center gap-2 px-2">
            <span
              className="h-6 w-6 rounded-lg"
              style={{ background: "linear-gradient(135deg, var(--color-primary), var(--color-finance))" }}
              aria-hidden
            />
            <p className="font-[family-name:var(--font-display)] text-lg text-[var(--color-text)]">
              Noctis
            </p>
          </div>

          <nav className="flex flex-1 flex-col gap-1">
            {navItems.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                    active
                      ? "text-[var(--color-text)]"
                      : "text-[var(--color-text-muted)] hover:bg-[var(--color-border)]/30 hover:text-[var(--color-text)]",
                  )}
                  style={active ? { backgroundColor: `color-mix(in srgb, ${toneVar[item.tone]} 14%, transparent)` } : undefined}
                >
                  <span
                    className={cn(
                      "absolute left-0 h-5 w-1 rounded-full transition-opacity",
                      active ? "opacity-100" : "opacity-0",
                    )}
                    style={{ backgroundColor: toneVar[item.tone] }}
                    aria-hidden
                  />
                  <span
                    className="flex h-5 w-5 shrink-0 items-center justify-center transition-colors"
                    style={{ color: active ? toneVar[item.tone] : undefined }}
                  >
                    {item.icon}
                  </span>
                  {item.label}
                  {item.href === "/ai" && (
                    <span className="ml-auto text-[10px] text-[var(--color-text-muted)]">⌘K</span>
                  )}
                </Link>
              );
            })}
          </nav>

          <div className="mt-2 border-t border-[var(--color-border)] pt-2">
            <SignOutButton />
          </div>
        </aside>

        <div className="flex flex-1 flex-col">
          <header className="flex items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 md:hidden">
            <p className="font-[family-name:var(--font-display)] text-lg text-[var(--color-text)]">
              Noctis
            </p>
            <Link
              href="/ai"
              aria-label="Open AI chat"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--color-primary)] text-[var(--color-primary-fg)]"
            >
              ✦
            </Link>
          </header>

          <main className="flex-1 overflow-y-auto p-4 pb-20 md:p-8 md:pb-8">{children}</main>

          <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-[var(--color-border)] bg-[var(--color-surface)] md:hidden">
            {navItems.slice(0, 5).map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] transition-colors",
                    active ? "text-[var(--color-text)]" : "text-[var(--color-text-muted)]",
                  )}
                >
                  <span
                    className="flex h-5 w-5 items-center justify-center"
                    style={{ color: active ? toneVar[item.tone] : undefined }}
                  >
                    {item.icon}
                  </span>
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <CommandPalette />
      </div>
    </AuthGuard>
  );
}
