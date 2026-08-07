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
 * BASE64 IS ACCEPTED, AND IN PRODUCTION IT IS THE ONLY FORM THAT WORKS.
 * Coolify stores a multi-line value happily — the API returned all 1203
 * characters of the PEM back on read — and then never injects it into the
 * container. Measured: after creating the variable, a `restart`, and a forced
 * full rebuild, `DATABASE_CA_CERT` was absent from `docker inspect`'s env list
 * entirely while `DATABASE_URL` and `AUTH_SECRET` sat right there. It is
 * dropped silently: no warning in the deploy log, no empty string, nothing to
 * notice. A PEM's embedded newlines cannot survive the env-file mechanism
 * underneath, so the variable has to be a single line by the time Coolify sees
 * it.
 *
 * The form is sniffed rather than configured, because a second env var saying
 * which encoding the first one uses is one more thing to get wrong at 3am.
 *
 * Unset means unchanged: connections stay exactly as they are today. That is
 * deliberate, so this can ship before the server has a certificate, and so a
 * developer machine and CI need no TLS setup at all.
 */
function tlsOptions(): { ssl?: { ca: string; rejectUnauthorized: true } } {
  const raw = process.env.DATABASE_CA_CERT?.trim();
  if (!raw) return {};
  // A PEM announces itself. Anything else is assumed base64-wrapped, which is
  // what production must use — see above.
  const ca = raw.startsWith("-----BEGIN") ? raw : Buffer.from(raw, "base64").toString("utf8");
  if (!ca.startsWith("-----BEGIN")) {
    throw new Error(
      "DATABASE_CA_CERT is neither a PEM nor base64 of one. Expected it to start " +
        "with '-----BEGIN' after decoding. Refusing to start rather than falling " +
        "back to an unencrypted database connection.",
    );
  }
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
