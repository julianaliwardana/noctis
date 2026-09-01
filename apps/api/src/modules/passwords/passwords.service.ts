import type { VaultItem, VaultKey } from "@noctis/db";
import * as passwordsRepository from "./passwords.repository";
import type { VaultItemDto, VaultKeyDto } from "./passwords.dto";

export function getVaultKey(userId: string): Promise<VaultKey | null> {
  return passwordsRepository.findKey(userId);
}

/** First-run setup. Returns null if a vault already exists — overwriting it would orphan every item. */
export async function createVaultKey(userId: string, dto: VaultKeyDto): Promise<VaultKey | null> {
  if (await passwordsRepository.findKey(userId)) return null;
  return passwordsRepository.createKey(userId, dto);
}

/**
 * Master password change. The client re-wraps the same vault key, so items stay valid and
 * the server has nothing to verify — it could not check the old password even if it wanted to.
 */
export async function rotateVaultKey(userId: string, dto: VaultKeyDto): Promise<VaultKey | null> {
  if (!(await passwordsRepository.findKey(userId))) return null;
  return passwordsRepository.updateKey(userId, dto);
}

export function listItems(userId: string): Promise<VaultItem[]> {
  return passwordsRepository.findAllByUser(userId);
}

export function createItem(userId: string, dto: VaultItemDto): Promise<VaultItem> {
  return passwordsRepository.create(userId, dto);
}

export async function updateItem(
  id: string,
  userId: string,
  dto: VaultItemDto,
): Promise<VaultItem | null> {
  if (!(await passwordsRepository.findById(id, userId))) return null;
  return passwordsRepository.update(id, dto);
}

export async function deleteItem(id: string, userId: string): Promise<boolean> {
  if (!(await passwordsRepository.findById(id, userId))) return false;
  await passwordsRepository.remove(id);
  return true;
}
