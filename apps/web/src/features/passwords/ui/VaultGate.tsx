"use client";

import { useState, type FormEvent } from "react";
import { LockIcon, ShieldAlertIcon } from "lucide-react";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Input } from "@/shared/components/ui/input";
import { Field, FieldLabel, FieldError } from "@/shared/components/ui/field";
import { Button } from "@/shared/components/ui/button";
import { useVaultStore } from "../store/vaultStore";
import { WrongMasterPasswordError } from "../crypto/vaultCrypto";
import { scorePassword } from "../crypto/generator";
import { StrengthMeter } from "./StrengthMeter";

const accent = { ["--color-primary" as string]: "var(--color-passwords)" };

export function VaultGate({ mode }: { mode: "setup" | "locked" }) {
  return mode === "setup" ? <SetupForm /> : <UnlockForm />;
}

function GateShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-1">
      <Card className="w-full max-w-sm border-[var(--color-passwords)]/30 bg-[var(--color-passwords)]/[0.03]">
        <CardContent>{children}</CardContent>
      </Card>
    </div>
  );
}

function UnlockForm() {
  const unlock = useVaultStore((state) => state.unlock);
  const lockedByTimeout = useVaultStore((state) => state.lockedByTimeout);
  const lockMinutes = useVaultStore((state) => state.lockMinutes);
  const [masterPassword, setMasterPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent): Promise<void> {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      await unlock(masterPassword);
    } catch (cause) {
      setError(
        cause instanceof WrongMasterPasswordError
          ? "Wrong master password."
          : "Could not unlock the vault.",
      );
      setMasterPassword("");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <GateShell>
      <div className="mb-1 flex items-center gap-2">
        <LockIcon className="size-4 text-[var(--color-passwords)]" aria-hidden />
        <h1 className="font-[family-name:var(--font-display)] text-xl text-[var(--color-text)]">
          Unlock your vault
        </h1>
      </div>
      <p className="mb-6 text-sm text-[var(--color-text-muted)]">
        {lockedByTimeout
          ? `Locked after ${lockMinutes} minute${lockMinutes === 1 ? "" : "s"} idle. Your master password decrypts everything on this device.`
          : "Your master password never leaves this device — the server only ever holds encrypted blobs."}
      </p>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Field data-invalid={error ? true : undefined}>
          <FieldLabel htmlFor="master-password">Master password</FieldLabel>
          <Input
            id="master-password"
            type="password"
            autoComplete="current-password"
            autoFocus
            value={masterPassword}
            onChange={(event) => setMasterPassword(event.target.value)}
            aria-invalid={error ? true : undefined}
            required
          />
          {error ? <FieldError>{error}</FieldError> : null}
        </Field>
        <Button type="submit" disabled={submitting || !masterPassword} style={accent}>
          {submitting ? "Unlocking…" : "Unlock"}
        </Button>
      </form>
    </GateShell>
  );
}

function SetupForm() {
  const setup = useVaultStore((state) => state.setup);
  const [masterPassword, setMasterPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [acknowledged, setAcknowledged] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const strength = scorePassword(masterPassword);
  const mismatch = confirmation.length > 0 && confirmation !== masterPassword;
  const ready =
    acknowledged && strength.score >= 1 && masterPassword === confirmation && !submitting;

  async function handleSubmit(event: FormEvent): Promise<void> {
    event.preventDefault();
    if (!ready) return;
    setSubmitting(true);
    setError("");
    try {
      await setup(masterPassword);
    } catch {
      setError("Could not create the vault. Try again.");
      setSubmitting(false);
    }
  }

  return (
    <GateShell>
      <h1 className="mb-1 font-[family-name:var(--font-display)] text-xl text-[var(--color-text)]">
        Create your vault
      </h1>
      <p className="mb-5 text-sm text-[var(--color-text-muted)]">
        Pick a master password. It is separate from your Noctis login on purpose — your login
        password reaches the server, and this one must not.
      </p>

      <div className="mb-5 flex gap-2.5 rounded-md border border-[var(--color-passwords)]/40 bg-[var(--color-passwords)]/[0.06] p-3">
        <ShieldAlertIcon
          className="mt-px size-4 shrink-0 text-[var(--color-passwords)]"
          aria-hidden
        />
        <p className="text-xs leading-relaxed text-[var(--color-text)]">
          There is no recovery. Nothing on the server can decrypt your vault, so if you forget
          this password every saved entry is gone permanently.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Field>
          <FieldLabel htmlFor="new-master">Master password</FieldLabel>
          <Input
            id="new-master"
            type="password"
            autoComplete="new-password"
            value={masterPassword}
            onChange={(event) => setMasterPassword(event.target.value)}
            required
          />
          <StrengthMeter value={masterPassword} />
        </Field>

        <Field data-invalid={mismatch ? true : undefined}>
          <FieldLabel htmlFor="confirm-master">Confirm master password</FieldLabel>
          <Input
            id="confirm-master"
            type="password"
            autoComplete="new-password"
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
            aria-invalid={mismatch ? true : undefined}
            required
          />
          {mismatch ? <FieldError>Passwords do not match.</FieldError> : null}
        </Field>

        <label className="flex cursor-pointer items-start gap-2.5 text-xs text-[var(--color-text-muted)]">
          <input
            type="checkbox"
            checked={acknowledged}
            onChange={(event) => setAcknowledged(event.target.checked)}
            className="mt-0.5 size-4 shrink-0 accent-[var(--color-passwords)]"
          />
          I understand that forgetting this password means losing the vault.
        </label>

        {error ? <p className="text-xs text-[var(--color-passwords)]">{error}</p> : null}

        <Button type="submit" disabled={!ready} style={accent}>
          {submitting ? "Creating…" : "Create vault"}
        </Button>
      </form>
    </GateShell>
  );
}
