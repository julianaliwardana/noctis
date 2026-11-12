import { db } from "@noctis/db";
import type { OAuthClient, OAuthCode, OAuthGrant, OAuthToken, Prisma } from "@noctis/db";

export type TokenWithGrant = OAuthToken & { grant: OAuthGrant };
export type GrantWithClient = OAuthGrant & { client: OAuthClient };

export function createClient(data: { id: string; name: string; redirectUris: string[] }): Promise<OAuthClient> {
  return db.oAuthClient.create({ data });
}

export function findClient(id: string): Promise<OAuthClient | null> {
  return db.oAuthClient.findUnique({ where: { id } });
}

export function createCode(data: Prisma.OAuthCodeUncheckedCreateInput): Promise<OAuthCode> {
  return db.oAuthCode.create({ data });
}

export function findCodeByHash(codeHash: string): Promise<OAuthCode | null> {
  return db.oAuthCode.findUnique({ where: { codeHash } });
}

/** True only for the caller that flips it: a code is spent once even if two exchanges race. */
export async function claimCode(id: string): Promise<boolean> {
  const { count } = await db.oAuthCode.updateMany({ where: { id, usedAt: null }, data: { usedAt: new Date() } });
  return count === 1;
}

export function attachGrantToCode(id: string, grantId: string): Promise<unknown> {
  return db.oAuthCode.update({ where: { id }, data: { grantId } });
}

export function createGrant(data: { clientId: string; userId: string; scope: string; resource: string | null }): Promise<OAuthGrant> {
  return db.oAuthGrant.create({ data });
}

export function createToken(data: { tokenHash: string; kind: "access" | "refresh"; grantId: string; expiresAt: Date }): Promise<OAuthToken> {
  return db.oAuthToken.create({ data });
}

export function findTokenByHash(tokenHash: string): Promise<TokenWithGrant | null> {
  return db.oAuthToken.findUnique({ where: { tokenHash }, include: { grant: true } });
}

/** True only for the caller that revokes it. */
export async function revokeToken(id: string): Promise<boolean> {
  const { count } = await db.oAuthToken.updateMany({ where: { id, revokedAt: null }, data: { revokedAt: new Date() } });
  return count === 1;
}

/** Ends a connection: the grant and every token it ever issued. */
export function revokeGrant(id: string): Promise<unknown> {
  const now = new Date();
  return db.$transaction([
    db.oAuthGrant.updateMany({ where: { id, revokedAt: null }, data: { revokedAt: now } }),
    db.oAuthToken.updateMany({ where: { grantId: id, revokedAt: null }, data: { revokedAt: now } }),
  ]);
}

export function touchGrant(id: string): Promise<unknown> {
  return db.oAuthGrant.update({ where: { id }, data: { lastUsedAt: new Date() } });
}

export function findActiveGrants(userId: string): Promise<GrantWithClient[]> {
  return db.oAuthGrant.findMany({
    where: { userId, revokedAt: null },
    include: { client: true },
    orderBy: { createdAt: "desc" },
  });
}

export function findGrant(id: string, userId: string): Promise<OAuthGrant | null> {
  return db.oAuthGrant.findFirst({ where: { id, userId } });
}
