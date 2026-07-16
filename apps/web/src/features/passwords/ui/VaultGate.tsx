"use client";

import { useState, type FormEvent } from "react";
import { Card } from "@/shared/components/Card";
import { Input } from "@/shared/components/Input";
import { Button } from "@/shared/components/Button";
import { unlockVault } from "../crypto/passwordCrypto";
import { useVaultStore } from "../store/vaultStore";

export function VaultGate() {
  const unlock = useVaultStore((state) => state.unlock);
  const [masterPassword, setMasterPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent): Promise<void> {
    event.preventDefault();
    setSubmitting(true);
    const key = await unlockVault(masterPassword);
    unlock(key);
    setSubmitting(false);
  }

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Card className="w-full max-w-sm border-[var(--color-passwords)]/30 bg-[var(--color-passwords)]/[0.03]">
        <h1 className="mb-1 font-[family-name:var(--font-display)] text-xl text-[var(--color-text)]">
          Unlock your vault
        </h1>
        <p className="mb-6 text-sm text-[var(--color-text-muted)]">
          Enter your master password. It never leaves this device — everything is decrypted locally.
        </p>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input
            label="Master password"
            type="password"
            value={masterPassword}
            onChange={(event) => setMasterPassword(event.target.value)}
            required
          />
          <Button type="submit" tone="passwords" disabled={submitting}>
            {submitting ? "Unlocking…" : "Unlock"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
