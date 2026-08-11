import { api } from "@/lib/api";
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
  return api.get<PasswordDto[]>("/passwords");
}

export function savePassword(input: SavePasswordInput): Promise<PasswordDto> {
  return api.post<PasswordDto>("/passwords", input);
}

export function deletePassword(id: string): Promise<void> {
  return api.delete(`/passwords/${id}`);
}
