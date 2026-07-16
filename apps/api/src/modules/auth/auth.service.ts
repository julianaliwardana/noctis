import bcrypt from "bcrypt";
import type { FastifyInstance } from "fastify";
import { db } from "@noctis/db";
import type { User } from "@noctis/db";

const SALT_ROUNDS = 12;

export async function createUser(email: string, password: string): Promise<User> {
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  return db.user.create({ data: { email, passwordHash } });
}

export async function verifyCredentials(email: string, password: string): Promise<User | null> {
  const user = await db.user.findUnique({ where: { email } });
  if (!user) return null;

  const valid = await bcrypt.compare(password, user.passwordHash);
  return valid ? user : null;
}

export function signAccessToken(app: FastifyInstance, userId: string): string {
  return app.jwt.sign({ userId }, { expiresIn: "15m" });
}

export function signRefreshToken(app: FastifyInstance, userId: string): string {
  return app.jwt.sign({ userId }, { expiresIn: "30d" });
}
