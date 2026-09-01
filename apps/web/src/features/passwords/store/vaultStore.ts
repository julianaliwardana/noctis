import { create } from "zustand";
import type { VaultKeyMaterial } from "@noctis/types";
import * as passwordsApi from "../api/passwords.api";
import { createVault, rotateMasterPassword, unlockVault } from "../crypto/vaultCrypto";

const TIMEOUT_KEY = "noctis_vault_lock_minutes";
export const LOCK_TIMEOUT_CHOICES = [1, 5, 15, 60] as const;
const DEFAULT_LOCK_MINUTES = 15;

/** A preference, not a secret — the key itself never touches storage. */
function readLockMinutes(): number {
  if (typeof window === "undefined") return DEFAULT_LOCK_MINUTES;
  const stored = Number(window.localStorage.getItem(TIMEOUT_KEY));
  return LOCK_TIMEOUT_CHOICES.includes(stored as (typeof LOCK_TIMEOUT_CHOICES)[number])
    ? stored
    : DEFAULT_LOCK_MINUTES;
}

export type VaultStatus = "loading" | "setup" | "locked" | "unlocked";

interface VaultState {
  status: VaultStatus;
  /** Held in memory only: a reload, a closed tab, or the idle timer all lose it. */
  key: CryptoKey | null;
  material: VaultKeyMaterial | null;
  lockMinutes: number;
  lockAt: number | null;
  lockedByTimeout: boolean;

  init: () => Promise<void>;
  setup: (masterPassword: string) => Promise<void>;
  unlock: (masterPassword: string) => Promise<void>;
  changeMasterPassword: (current: string, next: string) => Promise<void>;
  setLockMinutes: (minutes: number) => void;
  touch: () => void;
  lock: (byTimeout?: boolean) => void;
  tick: () => void;
}

export const useVaultStore = create<VaultState>((set, get) => ({
  status: "loading",
  key: null,
  material: null,
  lockMinutes: DEFAULT_LOCK_MINUTES,
  lockAt: null,
  lockedByTimeout: false,

  init: async () => {
    const material = await passwordsApi.fetchVaultKey();
    set({
      material,
      status: material ? "locked" : "setup",
      lockMinutes: readLockMinutes(),
    });
  },

  setup: async (masterPassword) => {
    const { vaultKey, material } = await createVault(masterPassword);
    const saved = await passwordsApi.createVaultKey(material);
    set({
      key: vaultKey,
      material: saved,
      status: "unlocked",
      lockedByTimeout: false,
      lockAt: Date.now() + get().lockMinutes * 60_000,
    });
  },

  unlock: async (masterPassword) => {
    const material = get().material;
    if (!material) throw new Error("Vault key material not loaded");

    // Throws WrongMasterPasswordError, which the gate renders. State stays locked.
    const key = await unlockVault(masterPassword, material);
    set({
      key,
      status: "unlocked",
      lockedByTimeout: false,
      lockAt: Date.now() + get().lockMinutes * 60_000,
    });
  },

  changeMasterPassword: async (current, next) => {
    const material = get().material;
    if (!material) throw new Error("Vault key material not loaded");

    // Re-wraps the same vault key, so the session key and every stored item stay valid.
    const rotated = await rotateMasterPassword(current, next, material);
    set({ material: await passwordsApi.replaceVaultKey(rotated) });
  },

  setLockMinutes: (minutes) => {
    window.localStorage.setItem(TIMEOUT_KEY, String(minutes));
    set({ lockMinutes: minutes, lockAt: get().key ? Date.now() + minutes * 60_000 : null });
  },

  touch: () => {
    if (!get().key) return;
    set({ lockAt: Date.now() + get().lockMinutes * 60_000 });
  },

  lock: (byTimeout = false) => {
    set({ key: null, status: "locked", lockAt: null, lockedByTimeout: byTimeout });
  },

  tick: () => {
    const { key, lockAt } = get();
    if (key && lockAt && Date.now() > lockAt) get().lock(true);
  },
}));
