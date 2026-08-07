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

/**
 * TLS to Postgres, configured by CERTIFICATE rather than by `sslmode`.
 *
 * WHY NOT JUST PUT `sslmode=` IN THE URL. Measured against pg 8.22.0 and a
 * TLS-enabled Postgres 16 with a self-signed certificate — every row observed,
 * none inferred:
 *
 *   (no ssl param)      connects, *** PLAINTEXT ***
 *   sslmode=prefer      FAILS   "self-signed certificate"
 *   sslmode=require     FAILS   "self-signed certificate"
 *   sslmode=no-verify   connects, encrypted (TLSv1.3), certificate UNCHECKED
 *   sslmode=verify-full connects, encrypted (TLSv1.3), certificate checked
 *
 * `require` failing is the surprise, and it is not a bug: pg currently aliases
 * `prefer`, `require` and `verify-ca` to `verify-full`, and it emits a runtime
 * warning saying those will adopt weaker libpq semantics in pg 9. So the two
 * modes that look safest are the ones whose meaning is about to change, and the
 * mode that reads as a middle ground (`no-verify`) encrypts without
 * authenticating — it stops passive sniffing on the shared Docker network but
 * not an active neighbour impersonating the database.
 *
 * Passing the CA explicitly sidesteps all of it: the behaviour is identical
 * before and after that pg 9 change, and it does not depend on reading the
 * alias table correctly.
 *
 * THE PEM LIVES IN AN ENV VAR, NOT A FILE. A CA certificate is public by
 * construction — it is what clients verify against — so there is nothing to
 * protect, and this avoids mounting a file into a Coolify-built image whose
 * Dockerfile we do not control at deploy time.
 *
 * Unset means unchanged: connections stay exactly as they are today. That is
 * deliberate, so this can ship before the server has a certificate, and so a
 * developer machine and CI need no TLS setup at all.
 */
function tlsOptions(): { ssl?: { ca: string; rejectUnauthorized: true } } {
  const ca = process.env.DATABASE_CA_CERT;
  if (!ca) return {};
  return { ssl: { ca, rejectUnauthorized: true } };
}

function createClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set — the database client cannot start.");
  }
  // Bound hung dependencies so one stuck query can't hold a pooled connection
  // indefinitely and stall submissions/admin (prod-readiness RES-01). Migrations
  // run via `prisma migrate deploy` on their own connection, so a statement
  // timeout here does not interrupt them.
  const adapter = new PrismaPg({
    connectionString,
    ...tlsOptions(),
    connectionTimeoutMillis: 5_000,
    statement_timeout: 10_000,
    query_timeout: 10_000,
    max: 10,
    idleTimeoutMillis: 30_000,
  });
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
