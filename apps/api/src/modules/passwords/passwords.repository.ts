import { db } from "@noctis/db";
import type { VaultItem, VaultKey } from "@noctis/db";
import type { VaultItemDto, VaultKeyDto } from "./passwords.dto";

export function findKey(userId: string): Promise<VaultKey | null> {
  return db.vaultKey.findUnique({ where: { userId } });
}

export function createKey(userId: string, data: VaultKeyDto): Promise<VaultKey> {
  return db.vaultKey.create({ data: { ...data, userId } });
}

export function updateKey(userId: string, data: VaultKeyDto): Promise<VaultKey> {
  return db.vaultKey.update({ where: { userId }, data });
}

export function findAllByUser(userId: string): Promise<VaultItem[]> {
  // Ordered by recency, not by name — the server cannot read the name.
  return db.vaultItem.findMany({ where: { userId }, orderBy: { updatedAt: "desc" } });
}

export function create(userId: string, data: VaultItemDto): Promise<VaultItem> {
  return db.vaultItem.create({ data: { ...data, userId } });
}

export function findById(id: string, userId: string): Promise<VaultItem | null> {
  return db.vaultItem.findFirst({ where: { id, userId } });
}

export function update(id: string, data: VaultItemDto): Promise<VaultItem> {
  return db.vaultItem.update({ where: { id }, data });
}

export function remove(id: string): Promise<VaultItem> {
  return db.vaultItem.delete({ where: { id } });
}
