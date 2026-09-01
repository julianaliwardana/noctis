"use client";

import { useEffect, useState } from "react";
import { EyeIcon, EyeOffIcon } from "lucide-react";
import type { VaultSecret } from "@noctis/types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { Input } from "@/shared/components/ui/input";
import { Textarea } from "@/shared/components/ui/textarea";
import { Button } from "@/shared/components/ui/button";
import { Field, FieldLabel } from "@/shared/components/ui/field";
import { EMPTY_SECRET } from "../store/passwordsStore";
import { PasswordGenerator } from "./PasswordGenerator";

const accent = { ["--color-primary" as string]: "var(--color-passwords)" };

export interface VaultItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Null for a new entry. */
  entry: (VaultSecret & { id: string }) | null;
  onSave: (secret: VaultSecret) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export function VaultItemDialog({
  open,
  onOpenChange,
  entry,
  onSave,
  onDelete,
}: VaultItemDialogProps) {
  const [draft, setDraft] = useState<VaultSecret>(EMPTY_SECRET);
  const [revealed, setRevealed] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [saving, setSaving] = useState(false);

  // Reset every time the dialog opens so a previous entry's secret never bleeds into the next.
  useEffect(() => {
    if (!open) return;
    setDraft(entry ? { ...entry } : EMPTY_SECRET);
    setRevealed(false);
    setConfirmingDelete(false);
  }, [open, entry]);

  function field<K extends keyof VaultSecret>(key: K) {
    return (value: string) => setDraft((current) => ({ ...current, [key]: value }));
  }

  async function handleSave(): Promise<void> {
    if (!draft.name.trim() || !draft.password) return;
    setSaving(true);
    try {
      await onSave({ ...draft, name: draft.name.trim(), username: draft.username.trim() });
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{entry ? "Edit entry" : "New entry"}</DialogTitle>
          <DialogDescription>
            Everything here is encrypted on this device before it is saved.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <Field>
            <FieldLabel htmlFor="item-name">Name</FieldLabel>
            <Input
              id="item-name"
              value={draft.name}
              onChange={(event) => field("name")(event.target.value)}
              placeholder="GitHub"
              autoFocus={!entry}
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="item-url">Website</FieldLabel>
            <Input
              id="item-url"
              type="url"
              inputMode="url"
              value={draft.url}
              onChange={(event) => field("url")(event.target.value)}
              placeholder="https://github.com"
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="item-username">Username</FieldLabel>
            <Input
              id="item-username"
              value={draft.username}
              onChange={(event) => field("username")(event.target.value)}
              autoComplete="off"
            />
          </Field>

          <Field>
            <div className="flex items-center justify-between gap-2">
              <FieldLabel htmlFor="item-password">Password</FieldLabel>
              <PasswordGenerator
                onGenerate={(value) => {
                  field("password")(value);
                  setRevealed(true);
                }}
              />
            </div>
            <div className="flex gap-2">
              <Input
                id="item-password"
                type={revealed ? "text" : "password"}
                value={draft.password}
                onChange={(event) => field("password")(event.target.value)}
                autoComplete="off"
                className="flex-1 font-[family-name:var(--font-mono)]"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => setRevealed((value) => !value)}
                aria-label={revealed ? "Hide password" : "Reveal password"}
              >
                {revealed ? (
                  <EyeOffIcon className="size-4" aria-hidden />
                ) : (
                  <EyeIcon className="size-4" aria-hidden />
                )}
              </Button>
            </div>
          </Field>

          <Field>
            <FieldLabel htmlFor="item-notes">Notes</FieldLabel>
            <Textarea
              id="item-notes"
              rows={3}
              value={draft.notes}
              onChange={(event) => field("notes")(event.target.value)}
              placeholder="Recovery codes, security answers…"
            />
          </Field>
        </div>

        <DialogFooter className="sm:justify-between">
          {entry ? (
            confirmingDelete ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-[var(--color-text-muted)]">Delete for good?</span>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={async () => {
                    await onDelete(entry.id);
                    onOpenChange(false);
                  }}
                >
                  Delete
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setConfirmingDelete(false)}
                >
                  Cancel
                </Button>
              </div>
            ) : (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setConfirmingDelete(true)}
                className="text-[var(--color-passwords)]"
              >
                Delete
              </Button>
            )
          ) : (
            <span />
          )}

          <Button
            type="button"
            onClick={handleSave}
            disabled={saving || !draft.name.trim() || !draft.password}
            style={accent}
          >
            {saving ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
