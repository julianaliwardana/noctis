import { db } from "@noctis/db";
import { findUserByEmail } from "../auth/auth.service";

/** The account the MCP endpoint serves. Prefer MCP_USER_ID: MCP_USER_EMAIL breaks when the email changes. */
export function mcpUserConfig(): { userId?: string; email?: string } {
  return { userId: process.env.MCP_USER_ID?.trim() || undefined, email: process.env.MCP_USER_EMAIL?.trim() || undefined };
}

export async function resolveMcpUserId(): Promise<string | null> {
  const { userId, email } = mcpUserConfig();
  if (userId) return (await db.user.findUnique({ where: { id: userId }, select: { id: true } }))?.id ?? null;
  if (email) return (await findUserByEmail(email))?.id ?? null;
  return null;
}
