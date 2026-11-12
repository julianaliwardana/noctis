"use client";

import { useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { Plug, Unplug } from "lucide-react";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { fetchConnections, revokeConnection } from "../api/oauth.api";
import type { Connection } from "../api/oauth.api";

function ago(iso: string): string {
  return formatDistanceToNow(new Date(iso), { addSuffix: true });
}

/** Apps connected to the MCP server by signing in (OAuth). Static MCP_TOKENS don't show here. */
export function ConnectedApps() {
  const [connections, setConnections] = useState<Connection[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [revoking, setRevoking] = useState<string | null>(null);

  useEffect(() => {
    fetchConnections()
      .then(setConnections)
      .catch(() => setError("Couldn't load connected apps."));
  }, []);

  async function handleRevoke(id: string): Promise<void> {
    setRevoking(id);
    try {
      await revokeConnection(id);
      setConnections((current) => current?.filter((connection) => connection.id !== id) ?? null);
    } catch {
      setError("Couldn't disconnect that app. Try again.");
    } finally {
      setRevoking(null);
    }
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-4">
        <div>
          <h2 className="text-sm font-medium text-[var(--color-text)]">Connected apps</h2>
          <p className="text-xs text-[var(--color-text-muted)]">
            Apps that reach Noctis through the MCP server after you approved them. Disconnecting one
            stops it at once; it has to ask again to come back.
          </p>
        </div>

        {error && <p className="text-xs text-destructive">{error}</p>}

        {connections === null && !error ? (
          <p className="text-xs text-[var(--color-text-muted)]">Loading…</p>
        ) : connections?.length === 0 ? (
          <p className="text-xs text-[var(--color-text-muted)]">No apps connected.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-[var(--color-border)]">
            {connections?.map((connection) => (
              <li key={connection.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                <div className="flex min-w-0 items-center gap-3">
                  <Plug className="size-4 shrink-0 text-[var(--color-text-muted)]" />
                  <div className="min-w-0">
                    <p className="truncate text-sm text-[var(--color-text)]">
                      {connection.clientName}
                      <span className="ml-2 rounded-full border border-[var(--color-border)] px-2 py-0.5 text-[10px] text-[var(--color-text-muted)]">
                        {connection.scopes.includes("noctis:write") ? "Read & write" : "Read only"}
                      </span>
                    </p>
                    <p className="text-xs text-[var(--color-text-muted)]">
                      Connected {ago(connection.createdAt)}
                      {" · "}
                      {connection.lastUsedAt ? `last used ${ago(connection.lastUsedAt)}` : "not used yet"}
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={revoking === connection.id}
                  onClick={() => void handleRevoke(connection.id)}
                >
                  <Unplug />
                  {revoking === connection.id ? "Disconnecting…" : "Disconnect"}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
