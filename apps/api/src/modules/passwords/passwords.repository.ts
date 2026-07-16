import { db } from "@noctis/db";
import type { Password } from "@noctis/db";
import type { CreatePasswordDto } from "./passwords.dto";

export function findAllByUser(userId: string): Promise<Password[]> {
  return db.password.findMany({ where: { userId }, orderBy: { siteName: "asc" } });
}

export function create(userId: string, data: CreatePasswordDto): Promise<Password> {
  return db.password.create({ data: { ...data, userId } });
}

export function findById(id: string, userId: string): Promise<Password | null> {
  return db.password.findFirst({ where: { id, userId } });
}

export function remove(id: string): Promise<Password> {
  return db.password.delete({ where: { id } });
}
