"use client";

import { useEffect, useState } from "react";
import { Eye, PencilLine, ShieldCheck } from "lucide-react";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { ApiError } from "@/lib/api";
import { decideAuthorization, fetchAuthorizeInfo } from "@/features/oauth/api/oauth.api";
import type { AuthorizeInfo, AuthorizeRequest, OAuthScope } from "@/features/oauth/api/oauth.api";

const AUTHORIZE_FIELDS = [
  "response_type",
  "client_id",
  "redirect_uri",
  "scope",
  "state",
  "code_challenge",
  "code_challenge_method",
  "resource",
];

function readRequest(): AuthorizeRequest {
  const params = new URLSearchParams(window.location.search);
  const request: AuthorizeRequest = {};
  for (const field of AUTHORIZE_FIELDS) {
    const value = params.get(field);
    if (value !== null) request[field] = value;
  }
  return request;
}

function errorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    const data = error.data as { error_description?: string } | undefined;
    return data?.error_description ?? error.message;
  }
  return "Something went wrong. Try connecting again from the app.";
}

/** Consent screen for MCP clients. The proxy sends signed-out visitors to /login first. */
export default function AuthorizePage() {
  const [info, setInfo] = useState<AuthorizeInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [allowWrite, setAllowWrite] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    // Read here rather than via useSearchParams, which would force a Suspense boundary on the page.
    fetchAuthorizeInfo(readRequest())
      .then((result) => {
        setInfo(result);
        setAllowWrite(result.scopes.includes("noctis:write"));
      })
      .catch((caught: unknown) => setError(errorMessage(caught)));
  }, []);

  async function decide(approve: boolean): Promise<void> {
    setSubmitting(true);
    try {
      const scopes: OAuthScope[] = allowWrite ? ["noctis:read", "noctis:write"] : ["noctis:read"];
      const { redirectTo } = await decideAuthorization(readRequest(), approve, scopes);
      // Leaving Noctis for the app's callback; keep the button disabled until the page unloads.
      window.location.assign(redirectTo);
    } catch (caught) {
      setError(errorMessage(caught));
      setSubmitting(false);
    }
  }

  const asksWrite = info?.scopes.includes("noctis:write") ?? false;

  return (
    <Card className="relative z-10 w-full max-w-md bg-[var(--color-surface)]/85 backdrop-blur-xl">
      <CardContent className="flex flex-col gap-5">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-full bg-[var(--color-primary)]/15 text-[var(--color-primary)]">
            <ShieldCheck className="size-5" />
          </span>
          <div>
            <h1 className="font-[family-name:var(--font-display)] text-xl text-[var(--color-text)]">
              {info ? `Connect ${info.clientName}?` : "Connect an app"}
            </h1>
            <p className="text-xs text-[var(--color-text-muted)]">Through the Noctis MCP server</p>
          </div>
        </div>

        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : !info ? (
          <p className="text-sm text-[var(--color-text-muted)]">Checking the request…</p>
        ) : (
          <>
            <ul className="flex flex-col gap-3 text-sm text-[var(--color-text)]">
              <li className="flex gap-3">
                <Eye className="mt-0.5 size-4 shrink-0 text-[var(--color-text-muted)]" />
                <span>Read your tasks, focus sessions, finance, budgets and subscriptions.</span>
              </li>
              {asksWrite && (
                <li className="flex gap-3">
                  <PencilLine className="mt-0.5 size-4 shrink-0 text-[var(--color-text-muted)]" />
                  <label className="flex flex-1 cursor-pointer items-start justify-between gap-3">
                    <span>
                      Make changes: add transactions and tasks, complete tasks, log focus, set budgets.
                      <span className="block text-xs text-[var(--color-text-muted)]">Untick to connect it read-only.</span>
                    </span>
                    <input
                      type="checkbox"
                      className="mt-1 size-4 accent-[var(--color-primary)]"
                      checked={allowWrite}
                      onChange={(event) => setAllowWrite(event.target.checked)}
                    />
                  </label>
                </li>
              )}
            </ul>

            <p className="text-xs text-[var(--color-text-muted)]">
              You&apos;ll be sent back to <span className="font-medium text-[var(--color-text)]">{info.redirectHost}</span>.
              Only connect apps you started connecting yourself. You can disconnect it any time on your
              Profile page.
            </p>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" disabled={submitting} onClick={() => void decide(false)}>
                Cancel
              </Button>
              <Button type="button" disabled={submitting} onClick={() => void decide(true)}>
                {submitting ? "Connecting…" : "Allow"}
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
