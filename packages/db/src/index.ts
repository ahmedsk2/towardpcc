import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

/**
 * A single PrismaClient across the process — Next dev's module reloads would
 * otherwise leak connections. Import `db` everywhere; never `new PrismaClient()`
 * in feature code (keeps "Prisma parameterized queries only", PRD §9, easy to
 * audit). Client-side calculator code must NEVER import this module.
 *
 * Uses the pg driver adapter + WASM query compiler (engineType "client", no
 * native Rust engine) so it runs on the Windows-ARM64 dev box and the Linux
 * prod host alike. The client is created lazily on first use, so importing this
 * module at build time (e.g. bundling a Server Action) needs no DATABASE_URL —
 * only actually querying does.
 */
const globalForDb = globalThis as unknown as { db?: PrismaClient };

function createClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set — the database client cannot start.");
  }
  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
}

function getClient(): PrismaClient {
  if (globalForDb.db) return globalForDb.db;
  const client = createClient();
  if (process.env.NODE_ENV !== "production") globalForDb.db = client;
  return client;
}

/** Lazy handle: nothing connects until the first query touches the client. */
export const db: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, prop, receiver) {
    const client = getClient();
    const value = Reflect.get(client, prop, receiver);
    return typeof value === "function" ? value.bind(client) : value;
  },
});

export * from "@prisma/client";
