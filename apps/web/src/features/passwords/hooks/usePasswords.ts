"use client";

import { useEffect } from "react";
import { useVaultStore } from "../store/vaultStore";
import { usePasswordsStore } from "../store/passwordsStore";

const TICK_MS = 15_000;

/**
 * Drives the vault's lifecycle: fetch the key material once, load and decrypt items each
 * time it unlocks, drop them the moment it locks, and run the idle timer.
 */
export function useVault() {
  const status = useVaultStore((state) => state.status);
  const key = useVaultStore((state) => state.key);

  useEffect(() => {
    void useVaultStore.getState().init();
  }, []);

  useEffect(() => {
    const passwords = usePasswordsStore.getState();
    if (key) void passwords.load(key);
    else passwords.clear();
  }, [key]);

  useEffect(() => {
    if (!key) return;
    const timer = window.setInterval(() => useVaultStore.getState().tick(), TICK_MS);
    return () => window.clearInterval(timer);
  }, [key]);

  return { status, vaultKey: key };
}

/** Any interaction inside the unlocked vault pushes the idle deadline back. */
export function useIdleReset(active: boolean) {
  useEffect(() => {
    if (!active) return;
    const touch = () => useVaultStore.getState().touch();
    const events = ["pointerdown", "keydown"] as const;
    for (const event of events) window.addEventListener(event, touch);
    return () => {
      for (const event of events) window.removeEventListener(event, touch);
    };
  }, [active]);
}
