"use client";

import { useEffect } from "react";

/** Snapshots already copied into their store. A WeakSet so old snapshots can be collected. */
const seeded = new WeakSet<object>();

/**
 * Bridges server data into a zustand store: render the snapshot at once and copy it into the store
 * after mount, or fetch on the client when there is none. Never writes the store during render:
 * the stores are module singletons, shared across requests on the server.
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
