import { create } from "zustand";
import * as passwordsApi from "../api/passwords.api";
import type { PasswordDto } from "../api/passwords.api";
import { encryptSecret } from "../crypto/passwordCrypto";

export interface AddPasswordInput {
  siteName: string;
  siteUrl?: string;
  username: string;
  password: string;
}

interface PasswordsState {
  entries: PasswordDto[];
  loading: boolean;
  fetchEntries: () => Promise<void>;
  addEntry: (key: CryptoKey, input: AddPasswordInput) => Promise<void>;
  removeEntry: (id: string) => Promise<void>;
}

export const usePasswordsStore = create<PasswordsState>((set, get) => ({
  entries: [],
  loading: false,

  fetchEntries: async () => {
    set({ loading: true });
    const entries = await passwordsApi.fetchPasswords();
    set({ entries, loading: false });
  },

  addEntry: async (key, input) => {
    const { ciphertext, iv } = await encryptSecret(key, input.password);
    const entry = await passwordsApi.savePassword({
      siteName: input.siteName,
      siteUrl: input.siteUrl,
      username: input.username,
      ciphertext,
      iv,
    });
    set({ entries: [entry, ...get().entries] });
  },

  removeEntry: async (id) => {
    await passwordsApi.deletePassword(id);
    set({ entries: get().entries.filter((entry) => entry.id !== id) });
  },
}));
