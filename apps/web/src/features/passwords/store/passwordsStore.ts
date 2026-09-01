import { create } from "zustand";
import type { VaultSecret } from "@noctis/types";
import * as passwordsApi from "../api/passwords.api";
import { decryptSecret, encryptSecret } from "../crypto/vaultCrypto";

/** A decrypted entry. Only ever exists in memory, and only while the vault is unlocked. */
export interface VaultEntry extends VaultSecret {
  id: string;
  updatedAt: string;
}

export const EMPTY_SECRET: VaultSecret = {
  name: "",
  url: "",
  username: "",
  password: "",
  notes: "",
};

interface PasswordsState {
  entries: VaultEntry[];
  loading: boolean;
  /** Items the current key cannot open — surfaced rather than silently dropped. */
  undecryptable: number;

  load: (key: CryptoKey) => Promise<void>;
  addEntry: (key: CryptoKey, secret: VaultSecret) => Promise<void>;
  updateEntry: (key: CryptoKey, id: string, secret: VaultSecret) => Promise<void>;
  removeEntry: (id: string) => Promise<void>;
  clear: () => void;
}

export const usePasswordsStore = create<PasswordsState>((set, get) => ({
  entries: [],
  loading: false,
  undecryptable: 0,

  load: async (key) => {
    set({ loading: true });
    try {
      const items = await passwordsApi.fetchItems();
      const entries: VaultEntry[] = [];
      let undecryptable = 0;

      for (const item of items) {
        try {
          const secret = await decryptSecret(key, item.ciphertext, item.iv);
          entries.push({ ...secret, id: item.id, updatedAt: item.updatedAt });
        } catch {
          // Encrypted under a key this vault no longer holds. Counted, not hidden.
          undecryptable += 1;
        }
      }

      set({ entries, undecryptable, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  addEntry: async (key, secret) => {
    const item = await passwordsApi.createItem(await encryptSecret(key, secret));
    set({ entries: [{ ...secret, id: item.id, updatedAt: item.updatedAt }, ...get().entries] });
  },

  updateEntry: async (key, id, secret) => {
    const item = await passwordsApi.updateItem(id, await encryptSecret(key, secret));
    set({
      entries: get().entries.map((entry) =>
        entry.id === id ? { ...secret, id, updatedAt: item.updatedAt } : entry,
      ),
    });
  },

  removeEntry: async (id) => {
    await passwordsApi.deleteItem(id);
    set({ entries: get().entries.filter((entry) => entry.id !== id) });
  },

  clear: () => set({ entries: [], undecryptable: 0 }),
}));
