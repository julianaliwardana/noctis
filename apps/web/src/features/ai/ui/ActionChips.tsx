import type { CSSProperties } from "react";
import { ListChecks, Repeat, Trash2, Undo2, Wallet, type LucideIcon } from "lucide-react";

/**
 * Summaries come back as text ("Created task: Call bank"), including from stored chats, so the
 * domain is read from the words. Order matters: an outcome beats the domain it happened in.
 */
const DOMAINS: { test: RegExp; color: string; Icon: LucideIcon }[] = [
  { test: /^deleted\b/i, color: "var(--color-passwords)", Icon: Trash2 },
  { test: /^kept\b/i, color: "var(--color-text-muted)", Icon: Undo2 },
  { test: /\btask\b/i, color: "var(--color-tasks)", Icon: ListChecks },
  { test: /\bhabit\b/i, color: "var(--color-habits)", Icon: Repeat },
  { test: /./, color: "var(--color-finance)", Icon: Wallet },
];

function domainOf(summary: string) {
  return DOMAINS.find((domain) => domain.test.test(summary)) ?? DOMAINS[DOMAINS.length - 1]!;
}

/** One chip per thing the reply did, tinted by domain per the Signal Rule — a 14% chip, never a wash. */
export function ActionChips({ actions }: { actions: string[] }) {
  if (actions.length === 0) return null;

  return (
    <ul aria-label="What Noctis did" className="mt-2 flex flex-wrap gap-1.5">
      {actions.map((summary, index) => {
        const { color, Icon } = domainOf(summary);
        return (
          <li
            key={`${index}-${summary}`}
            style={{ "--chip": color, animationDelay: `${index * 60}ms` } as CSSProperties}
            className="inline-flex max-w-full animate-in items-center gap-1.5 rounded-full bg-[color-mix(in_oklab,var(--chip)_14%,transparent)] py-0.5 pr-2.5 pl-2 text-xs text-[var(--color-text)] duration-200 fill-mode-both fade-in-0 slide-in-from-bottom-1 motion-reduce:animate-none"
          >
            <Icon aria-hidden className="size-3.5 shrink-0 text-[var(--chip)]" />
            <span className="truncate">{summary}</span>
          </li>
        );
      })}
    </ul>
  );
}
