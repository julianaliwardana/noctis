import type { Password } from "@noctis/db";
import * as passwordsRepository from "./passwords.repository";
import type { CreatePasswordDto } from "./passwords.dto";

export function listPasswords(userId: string): Promise<Password[]> {
  return passwordsRepository.findAllByUser(userId);
}

export function savePassword(userId: string, dto: CreatePasswordDto): Promise<Password> {
  return passwordsRepository.create(userId, dto);
}

export async function deletePassword(id: string, userId: string): Promise<boolean> {
  const existing = await passwordsRepository.findById(id, userId);
  if (!existing) return false;
  await passwordsRepository.remove(id);
  return true;
}
