import type { ReactNode } from "react";

/** Remounts per navigation, so each page replays its CSS entry animation. */
export default function AppTemplate({ children }: { children: ReactNode }) {
  return <div className="page-in md:h-full">{children}</div>;
}
