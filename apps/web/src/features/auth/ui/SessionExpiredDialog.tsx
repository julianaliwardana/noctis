"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { LogIn } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Field, FieldLabel } from "@/shared/components/ui/field";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { login, logout } from "@/features/auth/api/auth.api";
import { useUserStore } from "@/features/auth/store/userStore";
import { ApiError } from "@/lib/api";
import { loginUrl } from "@/lib/authRedirect";
import { restoreSession, useSessionStore } from "@/lib/session";

/**
 * Shown when the refresh token is gone (expired, or revoked by "sign out everywhere"). Signing in
 * right here restores the session without leaving the page: requests that hit the dead session
 * are parked and replay as soon as this succeeds, so nothing typed or half-loaded is lost.
 *
 * It can't be dismissed. A dead session can't do anything, so closing the dialog only led to the
 * next click failing again.
 */
export function SessionExpiredDialog() {
  const router = useRouter();
  const expired = useSessionStore((state) => state.expired);
  const knownEmail = useUserStore((state) => state.user?.email);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!expired) return;
    setEmail(knownEmail ?? "");
    setPassword("");
    setError(null);
  }, [expired, knownEmail]);

  async function handleSubmit(event: FormEvent): Promise<void> {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
      restoreSession();
    } catch (cause) {
      setError(
        cause instanceof ApiError && cause.status === 429
          ? "Too many attempts. Wait a minute and try again."
          : "That email and password don't match our records.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  /** Full sign-in page, coming back here afterwards. Drops anything unsaved on this page. */
  async function goToSignIn(): Promise<void> {
    await logout().catch(() => {});
    router.replace(loginUrl(window.location.pathname + window.location.search));
  }

  return (
    <Dialog open={expired}>
      <DialogContent
        showCloseButton={false}
        className="max-w-sm"
        onEscapeKeyDown={(event) => event.preventDefault()}
        onInteractOutside={(event) => event.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Session expired</DialogTitle>
          <DialogDescription>
            You&apos;ve been signed out. Sign in again to keep going — you&apos;ll stay on this page.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Field>
            <FieldLabel htmlFor="session-email">Email</FieldLabel>
            <Input
              id="session-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="session-password">Password</FieldLabel>
            <Input
              id="session-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoFocus
              required
            />
          </Field>
          {error && <p className="text-sm text-[var(--color-passwords)]">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => void goToSignIn()}>
              Use sign-in page
            </Button>
            <Button type="submit" disabled={submitting}>
              <LogIn />
              {submitting ? "Signing in…" : "Sign in"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
