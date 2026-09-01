"use client";

import { useMemo, useState } from "react";
import { LockIcon, PlusIcon, SearchIcon, SettingsIcon } from "lucide-react";
import { Card } from "@/shared/components/ui/card";
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription } from "@/shared/components/ui/empty";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/shared/components/ui/popover";
import { VaultGate } from "@/features/passwords/ui/VaultGate";
import { PasswordEntry } from "@/features/passwords/ui/PasswordEntry";
import { VaultItemDialog } from "@/features/passwords/ui/VaultItemDialog";
import { ChangeMasterPassword } from "@/features/passwords/ui/ChangeMasterPassword";
import { LOCK_TIMEOUT_CHOICES, useVaultStore } from "@/features/passwords/store/vaultStore";
import { usePasswordsStore, type VaultEntry } from "@/features/passwords/store/passwordsStore";
import { useIdleReset, useVault } from "@/features/passwords/hooks/usePasswords";

export default function PasswordsPage() {
  const { status, vaultKey } = useVault();
  const entries = usePasswordsStore((state) => state.entries);
  const loading = usePasswordsStore((state) => state.loading);
  const undecryptable = usePasswordsStore((state) => state.undecryptable);

  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<VaultEntry | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [changingMaster, setChangingMaster] = useState(false);

  useIdleReset(status === "unlocked");

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const sorted = [...entries].sort((a, b) => a.name.localeCompare(b.name));
    if (!needle) return sorted;
    // Client-side, because the server holds nothing but ciphertext to search.
    return sorted.filter((entry) =>
      [entry.name, entry.username, entry.url].some((value) =>
        value.toLowerCase().includes(needle),
      ),
    );
  }, [entries, query]);

  if (status === "loading") {
    return <p className="p-1 text-sm text-[var(--color-text-muted)]">Opening vault…</p>;
  }

  if (status !== "unlocked" || !vaultKey) {
    return <VaultGate mode={status === "setup" ? "setup" : "locked"} />;
  }

  function openNew(): void {
    setEditing(null);
    setDialogOpen(true);
  }

  function openExisting(entry: VaultEntry): void {
    setEditing(entry);
    setDialogOpen(true);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-2xl text-[var(--color-text)]">
            Passwords
          </h1>
          <p className="text-sm text-[var(--color-text-muted)]">
            {entries.length} {entries.length === 1 ? "entry" : "entries"}, encrypted on this
            device. Copied passwords clear from your clipboard after 20 seconds.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            onClick={openNew}
            style={{ ["--color-primary" as string]: "var(--color-passwords)" }}
          >
            <PlusIcon className="size-4" aria-hidden />
            Add
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label="Lock vault"
            onClick={() => useVaultStore.getState().lock()}
          >
            <LockIcon className="size-4" aria-hidden />
          </Button>
          <VaultSettings onChangeMaster={() => setChangingMaster(true)} />
        </div>
      </div>

      <div className="relative">
        <SearchIcon
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[var(--color-text-muted)]"
          aria-hidden
        />
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search vault"
          aria-label="Search vault"
          type="search"
          className="pl-9"
        />
      </div>

      {undecryptable > 0 ? (
        <p className="text-xs text-[var(--color-passwords)]">
          {undecryptable} {undecryptable === 1 ? "entry" : "entries"} could not be decrypted with
          this vault key.
        </p>
      ) : null}

      {loading ? (
        <p className="text-sm text-[var(--color-text-muted)]">Decrypting vault…</p>
      ) : visible.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>{query ? "No matches" : "Vault is empty"}</EmptyTitle>
            <EmptyDescription>
              {query ? "Nothing here matches that search." : "Add your first entry to get started."}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <Card className="gap-0 py-0">
          {visible.map((entry) => (
            <PasswordEntry key={entry.id} entry={entry} onOpen={openExisting} />
          ))}
        </Card>
      )}

      <VaultItemDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        entry={editing}
        onSave={(secret) => {
          const store = usePasswordsStore.getState();
          return editing
            ? store.updateEntry(vaultKey, editing.id, secret)
            : store.addEntry(vaultKey, secret);
        }}
        onDelete={(id) => usePasswordsStore.getState().removeEntry(id)}
      />

      <ChangeMasterPassword open={changingMaster} onOpenChange={setChangingMaster} />
    </div>
  );
}

function VaultSettings({ onChangeMaster }: { onChangeMaster: () => void }) {
  const lockMinutes = useVaultStore((state) => state.lockMinutes);
  const setLockMinutes = useVaultStore((state) => state.setLockMinutes);
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" size="icon" aria-label="Vault settings">
          <SettingsIcon className="size-4" aria-hidden />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-60">
        <div className="flex flex-col gap-3">
          <div>
            <p className="mb-2 text-xs text-[var(--color-text-muted)]">Lock after idle</p>
            <div className="flex gap-1.5">
              {LOCK_TIMEOUT_CHOICES.map((minutes) => {
                const active = minutes === lockMinutes;
                return (
                  <button
                    key={minutes}
                    type="button"
                    onClick={() => setLockMinutes(minutes)}
                    aria-pressed={active}
                    className="flex-1 rounded-md border px-2 py-1 text-xs transition-colors"
                    style={{
                      borderColor: active ? "var(--color-passwords)" : "var(--color-border)",
                      color: active ? "var(--color-passwords)" : "var(--color-text-muted)",
                    }}
                  >
                    {minutes >= 60 ? `${minutes / 60}h` : `${minutes}m`}
                  </button>
                );
              })}
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setOpen(false);
              onChangeMaster();
            }}
          >
            Change master password
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
