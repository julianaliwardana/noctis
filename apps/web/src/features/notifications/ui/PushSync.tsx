"use client";

import { useEffect } from "react";
import { syncPush } from "../lib/push";

/** Mounted in the signed-in shell: keeps the API's copy of this device's push subscription current. */
export function PushSync() {
  useEffect(() => {
    syncPush().catch(() => undefined);
  }, []);
  return null;
}
