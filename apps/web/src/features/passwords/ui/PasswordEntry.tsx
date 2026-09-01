"use client";

import { useState } from "react";
import { CheckIcon, CopyIcon, GlobeIcon } from "lucide-react";
import type { VaultEntry } from "../store/passwordsStore";

const CLIPBOARD_CLEAR_MS = 20_000;

export interface PasswordEntryProps {
  entry: VaultEntry;
  onOpen: (entry: VaultEntry) => void;
}

export function PasswordEntry({ entry, onOpen }: PasswordEntryProps) {
  const [copied, setCopied] = useState<"username" | "password" | null>(null);

  async function copy(what: "username" | "password"): Promise<void> {
    const value = what === "username" ? entry.username : entry.password;
    if (!value) return;

    await navigator.clipboard.writeText(value);
    setCopied(what);
    window.setTimeout(() => setCopied(null), 2000);

    if (what === "password") {
      window.setTimeout(() => {
        navigator.clipboard.writeText("").catch(() => undefined);
      }, CLIPBOARD_CLEAR_MS);
    }
  }

  return (
    <div className="group flex items-center gap-3 border-b border-[var(--color-border)] px-3 last:border-b-0">
      <button
        type="button"
        onClick={() => onOpen(entry)}
        className="flex min-w-0 flex-1 items-center gap-3 py-3 text-left"
      >
        <span
          aria-hidden
          className="flex size-8 shrink-0 items-center justify-center rounded-md bg-[var(--color-passwords)]/10 font-[family-name:var(--font-mono)] text-xs text-[var(--color-passwords)]"
        >
          {entry.name.trim().charAt(0).toUpperCase() || <GlobeIcon className="size-3.5" />}
        </span>
        <span className="min-w-0">
          <span className="block truncate text-sm font-medium text-[var(--color-text)]">
            {entry.name}
          </span>
          <span className="block truncate text-xs text-[var(--color-text-muted)]">
            {entry.username || "No username"}
          </span>
        </span>
      </button>

      <div className="flex shrink-0 items-center gap-1">
        {entry.username ? (
          <CopyButton
            label={`Copy username for ${entry.name}`}
            active={copied === "username"}
            onClick={() => copy("username")}
          >
            User
          </CopyButton>
        ) : null}
        <CopyButton
          label={`Copy password for ${entry.name}`}
          active={copied === "password"}
          onClick={() => copy("password")}
        >
          Password
        </CopyButton>
      </div>
    </div>
  );
}

function CopyButton({
  label,
  active,
  onClick,
  children,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="flex min-h-9 items-center gap-1 rounded-md px-2 text-xs text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-passwords)]/10 hover:text-[var(--color-passwords)]"
    >
      {active ? (
        <CheckIcon className="size-3.5 text-[var(--color-habits)]" aria-hidden />
      ) : (
        <CopyIcon className="size-3.5" aria-hidden />
      )}
      <span className="hidden sm:inline">{active ? "Copied" : children}</span>
    </button>
  );
}
