import { api, ApiError } from "@/lib/api";
import type { VaultItem, VaultKeyMaterial } from "@noctis/types";

export type VaultItemDto = Omit<VaultItem, "createdAt" | "updatedAt"> & {
  createdAt: string;
  updatedAt: string;
};

export interface VaultItemPayload {
  ciphertext: string;
  iv: string;
}

/** Resolves null when the vault has never been set up — the caller shows setup instead of unlock. */
export async function fetchVaultKey(): Promise<VaultKeyMaterial | null> {
  try {
    return await api.get<VaultKeyMaterial>("/passwords/key");
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
}

export function createVaultKey(material: VaultKeyMaterial): Promise<VaultKeyMaterial> {
  return api.post<VaultKeyMaterial>("/passwords/key", material);
}

export function replaceVaultKey(material: VaultKeyMaterial): Promise<VaultKeyMaterial> {
  return api.put<VaultKeyMaterial>("/passwords/key", material);
}

export function fetchItems(): Promise<VaultItemDto[]> {
  return api.get<VaultItemDto[]>("/passwords");
}

export function createItem(payload: VaultItemPayload): Promise<VaultItemDto> {
  return api.post<VaultItemDto>("/passwords", payload);
}

export function updateItem(id: string, payload: VaultItemPayload): Promise<VaultItemDto> {
  return api.patch<VaultItemDto>(`/passwords/${id}`, payload);
}

export function deleteItem(id: string): Promise<void> {
  return api.delete(`/passwords/${id}`);
}
