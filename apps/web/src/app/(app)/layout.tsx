"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGroup, motion } from "motion/react";
import { LayoutGrid, ListChecks, Flame, Timer, BarChart3, Lock, Sparkles, UserRound } from "lucide-react";
import { CommandPalette } from "@/features/ai/ui/CommandPalette";
import { SessionExpiredDialog } from "@/features/auth/ui/SessionExpiredDialog";
import { SignOutButton } from "@/features/auth/ui/SignOutButton";
import { ThemeToggle } from "@/shared/components/ThemeToggle";
import { cn } from "@/lib/utils";

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
  { href: "/ai", label: "Noctis Chat", tone: "primary", icon: <Sparkles {...iconProps} /> },
];

const toneVar: Record<Tone, string> = {
  primary: "var(--color-primary-text)",
  tasks: "var(--color-tasks)",
  habits: "var(--color-habits)",
  finance: "var(--color-finance)",
  passwords: "var(--color-passwords)",
};

function tint(tone: string, percent: number): string {
  return `color-mix(in srgb, ${tone} ${percent}%, transparent)`;
}

/** Name bubble beside an icon-only rail item. Only exists visually in rail mode. */
function RailTooltip({ label }: { label: string }) {
  return (
    <span
      aria-hidden
      className="pointer-events-none absolute top-1/2 left-full z-50 ml-3 hidden -translate-y-1/2 scale-90 rounded-md bg-[var(--color-text)] px-2 py-1 text-xs font-medium whitespace-nowrap text-[var(--color-bg)] opacity-0 shadow-lg transition-[opacity,scale] duration-500 ease-spring group-hover:scale-100 group-hover:opacity-100 group-focus-visible:scale-100 group-focus-visible:opacity-100 rail:md:block"
    >
      {label}
    </span>
  );
}

const sideRow =
  "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] rail:md:justify-center rail:md:px-0";

export default function AppLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [hovered, setHovered] = useState<string | null>(null);
  // Where the user just clicked, tagged with the path they clicked from. The highlight moves there
  // at once — an urgent update, so it springs; the router's own pathname change commits inside a
  // transition, where the layout animation would just snap. Once the pathname moves on, the tag
  // no longer matches and the real pathname takes over again: no effect needed to clear it.
  const [pending, setPending] = useState<{ href: string; from: string } | null>(null);
  const current = pending && pending.from === pathname ? pending.href : pathname;

  function isActive(href: string): boolean {
    return current === href || current.startsWith(`${href}/`);
  }

  function go(href: string): void {
    if (href !== pathname) setPending({ href, from: pathname });
  }

  // Mobile lets the browser scroll the document natively — momentum, address-bar auto-hide and a
  // single scrollbar outside the UI. The header stays put because it is sticky, not because the
  // shell traps the viewport. Desktop still locks to h-dvh so the sidebar can stay fixed.
  return (
    <div className="flex min-h-dvh flex-col md:h-dvh md:flex-row md:overflow-hidden">
      {/* The rail is the "30": onyx in the day theme, graphite at night. theme-inverse re-steps every
          token inside it for a dark surface, so nothing in here needs to know which theme is on.
          Width springs between expanded and the icon-only rail (Profile → Appearance → Sidebar). */}
      <aside className="theme-inverse hidden shrink-0 border-r border-[var(--color-border)] bg-[var(--color-rail)] transition-[width,padding] duration-700 ease-spring md:sticky md:top-0 md:z-30 md:flex md:h-dvh md:w-64 md:flex-col md:p-4 rail:md:w-[4.75rem] rail:md:px-3">
        <div className="mb-6 flex items-center gap-2 px-2 rail:md:justify-center rail:md:px-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="https://cdn.julianwardana.dev/Noctis/noctis.png" alt="Noctis" className="h-7 w-7 shrink-0 rounded-lg" />
          <p className="font-[family-name:var(--font-display)] text-lg tracking-tight text-[var(--color-text)] rail:md:hidden">
            Noctis
          </p>
        </div>

        <LayoutGroup id="sidebar">
          <nav className="flex flex-1 flex-col gap-1" onMouseLeave={() => setHovered(null)}>
            {navItems.map((item) => {
              const active = isActive(item.href);
              const tone = toneVar[item.tone];
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-label={item.label}
                  aria-current={active ? "page" : undefined}
                  onClick={() => go(item.href)}
                  onMouseEnter={() => setHovered(item.href)}
                  onFocus={() => setHovered(item.href)}
                  className={cn(sideRow, active ? "text-[var(--color-text)]" : "text-[var(--color-text-muted)] hover:text-[var(--color-text)]")}
                >
                  {/* Hover highlight follows the pointer between rows on a spring. */}
                  {hovered === item.href && !active && (
                    <motion.span
                      layoutId="nav-hover"
                      aria-hidden
                      className="absolute inset-0 rounded-[inherit] bg-[var(--color-border)]/45"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                    />
                  )}
                  {/* Active highlight slides to the new row on navigation, carrying its tone. */}
                  {active && (
                    <motion.span
                      layoutId="nav-active"
                      aria-hidden
                      className="absolute inset-0 rounded-[inherit]"
                      style={{ backgroundColor: tint(tone, 16) }}
                    >
                      <span
                        className="absolute top-1/2 left-0 h-5 w-1 -translate-y-1/2 rounded-full rail:md:-left-3"
                        style={{ backgroundColor: tone, boxShadow: `0 0 12px ${tint(tone, 60)}` }}
                      />
                    </motion.span>
                  )}
                  <motion.span
                    className="relative flex h-5 w-5 shrink-0 items-center justify-center transition-colors"
                    style={{ color: active ? tone : undefined }}
                    animate={{ scale: active ? 1.08 : 1 }}
                  >
                    {item.icon}
                  </motion.span>
                  <span className="relative truncate rail:md:sr-only">{item.label}</span>
                  {item.href === "/ai" && (
                    <kbd className="relative ml-auto font-sans text-[10px] text-[var(--color-text-muted)] rail:md:hidden">⌘K</kbd>
                  )}
                  <RailTooltip label={item.label} />
                </Link>
              );
            })}
          </nav>
        </LayoutGroup>

        <div className="mt-2 flex flex-col gap-1 border-t border-[var(--color-border)] pt-2">
          <Link
            href="/profile"
            aria-label="Profile"
            aria-current={isActive("/profile") ? "page" : undefined}
            className={cn(
              sideRow,
              isActive("/profile")
                ? "bg-[var(--color-border)]/45 text-[var(--color-text)]"
                : "text-[var(--color-text-muted)] hover:bg-[var(--color-border)]/45 hover:text-[var(--color-text)]",
            )}
          >
            <UserRound strokeWidth={1.75} className="h-5 w-5 shrink-0" />
            <span className="truncate rail:md:sr-only">Profile</span>
            <RailTooltip label="Profile" />
          </Link>
          <SignOutButton />
          {/* In the icon rail the three options stack; taller targets and real gaps keep them tappable. */}
          <ThemeToggle
            className="mx-1 mt-2 rail:md:mx-auto rail:md:mt-3 rail:md:w-11 rail:md:flex-col rail:md:gap-1.5 rail:md:p-1"
            itemClassName="h-7 rail:md:h-9 rail:md:w-full rail:md:flex-none rail:md:px-0"
          />
        </div>
      </aside>

      {/* md:min-h-0 is load-bearing on desktop only: a flex item defaults to min-height:auto, so
          without it this column and <main> refuse to shrink under their content and get clipped by
          the md:overflow-hidden above. On mobile nothing is trapped, so nothing needs it. */}
      <div className="flex flex-1 flex-col md:min-h-0">
        <header className="theme-inverse sticky top-0 z-40 flex h-(--app-header-h) items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-rail)] px-4 md:hidden">
          <div className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="https://cdn.julianwardana.dev/Noctis/noctis.png" alt="Noctis" className="h-7 w-7 rounded-lg" />
            <p className="font-[family-name:var(--font-display)] text-lg tracking-tight text-[var(--color-text)]">
              Noctis
            </p>
          </div>
          <div className="flex items-center gap-1">
            {/* The Five Rule keeps Passwords out of the bottom nav, so the top bar is its only
                tap target on a phone — without this it was reachable by command palette alone. */}
            <Link
              href="/passwords"
              aria-label="Passwords"
              aria-current={isActive("/passwords") ? "page" : undefined}
              className="press flex h-9 w-9 items-center justify-center rounded-full hover:bg-[var(--color-border)]/45 active:scale-90"
              style={{
                color: isActive("/passwords") ? "var(--color-passwords)" : "var(--color-text-muted)",
              }}
            >
              <Lock strokeWidth={1.75} className="h-5 w-5" />
            </Link>
            <Link
              href="/profile"
              aria-label="Profile"
              aria-current={isActive("/profile") ? "page" : undefined}
              className="press flex h-9 w-9 items-center justify-center rounded-full text-[var(--color-text-muted)] hover:bg-[var(--color-border)]/45 hover:text-[var(--color-text)] active:scale-90"
            >
              <UserRound strokeWidth={1.75} className="h-5 w-5" />
            </Link>
            <Link
              href="/ai"
              aria-label="Open Noctis Chat"
              className="press flex h-9 w-9 items-center justify-center rounded-full bg-[var(--color-primary)] text-[var(--color-primary-fg)] shadow-[0_0_16px_color-mix(in_srgb,var(--color-primary)_45%,transparent)] active:scale-90"
            >
              ✦
            </Link>
          </div>
        </header>

        <main className="flex-1 p-4 pb-20 md:min-h-0 md:overflow-y-auto md:p-8 md:pb-8">
          {/* Contained width centres the content; full-bleed pages (data-bleed) opt out. */}
          <div className="mx-auto w-full md:h-full contained:max-w-6xl contained:has-[[data-bleed]]:max-w-none">
            {children}
          </div>
        </main>

        <LayoutGroup id="tabbar">
          <nav className="fixed inset-x-0 bottom-0 z-40 flex h-(--app-nav-h) border-t border-[var(--color-border)] bg-[var(--color-surface)]/90 backdrop-blur-xl md:hidden">
            {navItems.slice(0, 5).map((item) => {
              const active = isActive(item.href);
              const tone = toneVar[item.tone];
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => go(item.href)}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex flex-1 flex-col items-center justify-center gap-0.5 text-[11px] transition-colors",
                    active ? "font-medium text-[var(--color-text)]" : "text-[var(--color-text-muted)]",
                  )}
                >
                  <span className="relative flex h-7 w-12 items-center justify-center">
                    {active && (
                      <motion.span
                        layoutId="tab-active"
                        aria-hidden
                        className="absolute inset-0 rounded-full"
                        style={{ backgroundColor: tint(tone, 16) }}
                      />
                    )}
                    <motion.span
                      className="relative flex h-5 w-5 items-center justify-center"
                      style={{ color: active ? tone : undefined }}
                      animate={{ scale: active ? 1.1 : 1, y: active ? -1 : 0 }}
                    >
                      {item.icon}
                    </motion.span>
                  </span>
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </LayoutGroup>
      </div>

      <CommandPalette />
      <SessionExpiredDialog />
    </div>
  );
}
