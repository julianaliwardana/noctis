import type { ReactNode } from "react";

/**
 * A template remounts on every navigation (a layout doesn't), so each page replays its entry.
 * The animation is CSS (.page-in, a spring-sampled curve) so it starts with the HTML, before JS.
 * md:h-full keeps the full-height pages (chat, pomodoro, habits) bounded by <main>.
 */
export default function AppTemplate({ children }: { children: ReactNode }) {
  return <div className="page-in md:h-full">{children}</div>;
}
