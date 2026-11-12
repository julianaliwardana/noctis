import { db } from "@noctis/db";
import { findUserByEmail } from "../auth/auth.service";

/**
 * The one Noctis account the MCP endpoint serves: static tokens act as it, and only it may approve
 * an OAuth connection. Prefer MCP_USER_ID — editing your email on the profile page used to silently
 * break MCP_USER_EMAIL and with it every scheduled import.
 */
export function mcpUserConfig(): { userId?: string; email?: string } {
  return { userId: process.env.MCP_USER_ID?.trim() || undefined, email: process.env.MCP_USER_EMAIL?.trim() || undefined };
}

export async function resolveMcpUserId(): Promise<string | null> {
  const { userId, email } = mcpUserConfig();
  if (userId) return (await db.user.findUnique({ where: { id: userId }, select: { id: true } }))?.id ?? null;
  if (email) return (await findUserByEmail(email))?.id ?? null;
  return null;
}
