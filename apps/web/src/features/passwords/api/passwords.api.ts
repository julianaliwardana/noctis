import { apiFetch } from "@/lib/api";
import type { Password } from "@noctis/types";

export type PasswordDto = Omit<Password, "createdAt"> & { createdAt: string };

export interface SavePasswordInput {
  siteName: string;
  siteUrl?: string;
  username: string;
  ciphertext: string;
  iv: string;
}

export function fetchPasswords(): Promise<PasswordDto[]> {
  return apiFetch<PasswordDto[]>("/passwords");
}

export function savePassword(input: SavePasswordInput): Promise<PasswordDto> {
  return apiFetch<PasswordDto>("/passwords", { method: "POST", body: JSON.stringify(input) });
}

export function deletePassword(id: string): Promise<void> {
  return apiFetch<void>(`/passwords/${id}`, { method: "DELETE" });
}
