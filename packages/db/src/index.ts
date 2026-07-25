import { PrismaClient } from "@prisma/client";

/**
 * A single PrismaClient across the process — Next dev's module reloads would
 * otherwise leak connections. Import `db` everywhere; never `new PrismaClient()`
 * in feature code (keeps "Prisma parameterized queries only", PRD §9, easy to
 * audit). Client-side calculator code must NEVER import this module.
 */
const globalForDb = globalThis as unknown as { db?: PrismaClient };

export const db =
  globalForDb.db ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForDb.db = db;

export * from "@prisma/client";
