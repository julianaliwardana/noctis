"use client";

import { useEffect } from "react";

/** Snapshots already copied into their store. A WeakSet so old snapshots can be collected. */
const seeded = new WeakSet<object>();

/**
 * Bridges server-rendered data into a zustand store.
 *
 * - With a snapshot from the server: render it straight away (no spinner, no layout shift), then
 *   copy it into the store after mount so mutations and other pages pick it up.
 * - Without one (no session on the server, or a server fetch failed): fetch on the client, as
 *   every page did before PPR.
 *
 * Returns the snapshot while it's the source of truth, or null once the store has it — callers
 * render `snapshot ?? storeState`. The store is never written during render: the stores are
 * module singletons, and on the server one would be shared across requests.
 */
export function useServerSeed<T extends object>(
  snapshot: T | null | undefined,
  seed: (data: T) => void,
  fetchOnClient: () => void,
): T | null {
  useEffect(() => {
    if (snapshot) {
      seed(snapshot);
      seeded.add(snapshot);
    } else {
      fetchOnClient();
    }
    // `seed`/`fetchOnClient` are stable store actions; re-run only for a new snapshot.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snapshot]);

  return snapshot && !seeded.has(snapshot) ? snapshot : null;
}
