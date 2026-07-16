import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

declare global {
  // eslint-disable-next-line no-var
  var __db__: PrismaClient | undefined;
}

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });

export const db = globalThis.__db__ ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  globalThis.__db__ = db;
}

export * from "../generated/prisma/client";
