"use client";

import { useState } from "react";
import { decryptSecret } from "../crypto/passwordCrypto";
import type { PasswordDto } from "../api/passwords.api";

export interface PasswordEntryProps {
  entry: PasswordDto;
  vaultKey: CryptoKey;
  onDelete: (id: string) => void;
}

const CLIPBOARD_CLEAR_MS = 20_000;

export function PasswordEntry({ entry, vaultKey, onDelete }: PasswordEntryProps) {
  const [revealed, setRevealed] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function reveal(): Promise<void> {
    if (revealed) {
      setRevealed(null);
      return;
    }
    setRevealed(await decryptSecret(vaultKey, entry.ciphertext, entry.iv));
  }

  async function copy(): Promise<void> {
    const plaintext = revealed ?? (await decryptSecret(vaultKey, entry.ciphertext, entry.iv));
    await navigator.clipboard.writeText(plaintext);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
    window.setTimeout(() => {
      navigator.clipboard.writeText("").catch(() => undefined);
    }, CLIPBOARD_CLEAR_MS);
  }

  return (
    <div className="group flex items-center justify-between gap-3 border-b border-[var(--color-border)] px-3 py-3 last:border-b-0">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-[var(--color-text)]">{entry.siteName}</p>
        <p className="truncate text-xs text-[var(--color-text-muted)]">{entry.username}</p>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={reveal}
          aria-label={revealed ? "Hide password" : "Reveal password"}
          className="rounded-md px-2 py-1 font-[family-name:var(--font-mono)] text-xs text-[var(--color-text)] hover:bg-[var(--color-border)]/30"
        >
          {revealed ?? "••••••••"}
        </button>
        <button
          type="button"
          onClick={copy}
          className="rounded-md px-2 py-1 text-xs text-[var(--color-passwords)] hover:bg-[var(--color-passwords)]/10"
        >
          {copied ? "Copied" : "Copy"}
        </button>
        <button
          type="button"
          onClick={() => onDelete(entry.id)}
          aria-label={`Remove ${entry.siteName}`}
          className="text-xs text-[var(--color-text-muted)] opacity-0 transition-opacity hover:text-[var(--color-passwords)] group-hover:opacity-100"
        >
          Remove
        </button>
      </div>
    </div>
  );
}
