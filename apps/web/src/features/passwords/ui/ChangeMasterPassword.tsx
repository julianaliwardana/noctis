"use client";

import { useState, type FormEvent } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { Input } from "@/shared/components/ui/input";
import { Button } from "@/shared/components/ui/button";
import { Field, FieldLabel, FieldError } from "@/shared/components/ui/field";
import { useVaultStore } from "../store/vaultStore";
import { WrongMasterPasswordError } from "../crypto/vaultCrypto";
import { scorePassword } from "../crypto/generator";
import { StrengthMeter } from "./StrengthMeter";

export function ChangeMasterPassword({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const changeMasterPassword = useVaultStore((state) => state.changeMasterPassword);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const mismatch = confirmation.length > 0 && confirmation !== next;
  const ready = current && scorePassword(next).score >= 1 && next === confirmation && !saving;

  function reset(): void {
    setCurrent("");
    setNext("");
    setConfirmation("");
    setError("");
  }

  async function handleSubmit(event: FormEvent): Promise<void> {
    event.preventDefault();
    if (!ready) return;
    setSaving(true);
    setError("");
    try {
      await changeMasterPassword(current, next);
      reset();
      onOpenChange(false);
    } catch (cause) {
      setError(
        cause instanceof WrongMasterPasswordError
          ? "That is not your current master password."
          : "Could not change the master password.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!value) reset();
        onOpenChange(value);
      }}
    >
      <DialogContent className="sm:max-w-sm">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Change master password</DialogTitle>
            <DialogDescription>
              Your entries are not re-encrypted — this only re-wraps the vault key, so the
              vault stays unlocked and every saved entry keeps working.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-4">
            <Field data-invalid={error ? true : undefined}>
              <FieldLabel htmlFor="current-master">Current master password</FieldLabel>
              <Input
                id="current-master"
                type="password"
                autoComplete="current-password"
                value={current}
                onChange={(event) => setCurrent(event.target.value)}
                aria-invalid={error ? true : undefined}
              />
              {error ? <FieldError>{error}</FieldError> : null}
            </Field>

            <Field>
              <FieldLabel htmlFor="next-master">New master password</FieldLabel>
              <Input
                id="next-master"
                type="password"
                autoComplete="new-password"
                value={next}
                onChange={(event) => setNext(event.target.value)}
              />
              <StrengthMeter value={next} />
            </Field>

            <Field data-invalid={mismatch ? true : undefined}>
              <FieldLabel htmlFor="confirm-next-master">Confirm new password</FieldLabel>
              <Input
                id="confirm-next-master"
                type="password"
                autoComplete="new-password"
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
                aria-invalid={mismatch ? true : undefined}
              />
              {mismatch ? <FieldError>Passwords do not match.</FieldError> : null}
            </Field>
          </div>

          <DialogFooter>
            <Button
              type="submit"
              disabled={!ready}
              style={{ ["--color-primary" as string]: "var(--color-passwords)" }}
            >
              {saving ? "Changing…" : "Change password"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
