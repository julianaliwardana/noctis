"use client";

import { Card } from "@/shared/components/Card";
import { EmptyState } from "@/shared/components/EmptyState";
import { VaultGate } from "@/features/passwords/ui/VaultGate";
import { PasswordForm } from "@/features/passwords/ui/PasswordForm";
import { PasswordEntry } from "@/features/passwords/ui/PasswordEntry";
import { useVaultStore } from "@/features/passwords/store/vaultStore";
import { usePasswords } from "@/features/passwords/hooks/usePasswords";

export default function PasswordsPage() {
  const vaultKey = useVaultStore((state) => state.key);
  const { entries, loading, addEntry, removeEntry } = usePasswords();

  if (!vaultKey) return <VaultGate />;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-2xl text-[var(--color-text)]">Passwords</h1>
        <p className="text-sm text-[var(--color-text-muted)]">
          Copied passwords clear from your clipboard after 20 seconds.
        </p>
      </div>

      <Card>
        <PasswordForm onAdd={(input) => addEntry(vaultKey, input)} />
      </Card>

      {loading ? (
        <p className="text-sm text-[var(--color-text-muted)]">Loading vault…</p>
      ) : entries.length === 0 ? (
        <EmptyState title="Vault is empty" description="Save your first password above." />
      ) : (
        <Card className="p-0">
          {entries.map((entry) => (
            <PasswordEntry key={entry.id} entry={entry} vaultKey={vaultKey} onDelete={removeEntry} />
          ))}
        </Card>
      )}
    </div>
  );
}
