import { create } from "zustand";

interface VaultState {
  key: CryptoKey | null;
  unlock: (key: CryptoKey) => void;
  lock: () => void;
}

export const useVaultStore = create<VaultState>((set) => ({
  key: null,
  unlock: (key) => set({ key }),
  lock: () => set({ key: null }),
}));
