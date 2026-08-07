/* global process, console, Buffer */
/**
 * Seed the end-to-end test admin, so a Playwright spec can actually LOG IN.
 *
 *   DATABASE_URL=... TOTP_ENC_KEY=... node scripts/seed-e2e-admin.mjs
 *
 * WHY THIS EXISTS. Until 2026-08-07 nothing in the suite exercised a login that
 * WORKS. `admin-auth.spec.ts` proved unauthenticated visitors are turned away,
 * `auth.ts` had no unit test, and the Playwright config said outright "no real
 * login is exercised here". The path whose failure locks the platform's only
 * operator out had no coverage, which also meant any change to the auth strategy
 * would ship unverifiable.
 *
 * WHY IT LIVES HERE AND NOT IN `apps/web/e2e`. It needs Prisma and hash-wasm,
 * which resolve in this package and not from `apps/web` under pnpm's strict
 * node_modules layout. The Playwright global setup runs it as a child process,
 * the same way it runs `prisma db push`. The credentials themselves live in
 * `e2e-admin-fixture.mjs`, which is dependency-free precisely so the spec can
 * import it by relative path.
 *
 * The crypto is duplicated from `create-admin.mjs` rather than shared: that
 * script is a CLI that reads argv and exits. The duplication is deliberate but
 * real — a change to the encryption format must land in both, and the login spec
 * is what fails if they drift.
 */
import { createCipheriv, createHash, randomBytes } from "node:crypto";
import { argon2id } from "hash-wasm";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { TEST_ADMIN } from "./e2e-admin-fixture.mjs";
// Shared with the Playwright global setup, which calls it FIRST — before
// `prisma db push` touches anything. This call is defence in depth.
import { assertDisposableDatabase } from "./assert-disposable-db.mjs";

function encryptSecret(secretBase32, encKeyBase64) {
  const key = Buffer.from(encKeyBase64 ?? "", "base64");
  if (key.length !== 32) throw new Error("TOTP_ENC_KEY must decode to 32 bytes");
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ct = Buffer.concat([cipher.update(secretBase32, "utf8"), cipher.final()]);
  return [
    iv.toString("base64"),
    cipher.getAuthTag().toString("base64"),
    ct.toString("base64"),
  ].join(".");
}

const hashRecoveryCode = (code) =>
  createHash("sha256").update(code.trim().toLowerCase()).digest("hex");

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is required");
assertDisposableDatabase(databaseUrl);

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) });
try {
  /*
   * Idempotent: a re-run must not trip the unique email, and must not inherit a
   * lockout or a consumed TOTP step from a previous run.
   *
   * AUDIT ROWS MUST GO FIRST, and discovering that was useful. A plain
   * `adminUser.deleteMany` failed with
   * `violates foreign key constraint "AuditLog_actorId_fkey"` — because the
   * login spec's successful logins now WRITE to the audit trail (SPC-TM-001,
   * added the same day), so the second run of the suite tripped over evidence
   * that the first run had worked.
   *
   * Deleting them here is safe precisely because this database is disposable —
   * `assertDisposableDatabase` above is what makes that true. Nothing in the
   * application may ever delete an AuditLog row: the app role holds INSERT and
   * SELECT only, by design (SPC-DB-003), and this script runs as the owner of a
   * throwaway database rather than as the app.
   */
  const existing = await db.adminUser.findUnique({ where: { email: TEST_ADMIN.email } });
  if (existing) {
    await db.auditLog.deleteMany({ where: { actorId: existing.id } });
    await db.adminUser.delete({ where: { id: existing.id } });
  }
  await db.adminUser.create({
    data: {
      email: TEST_ADMIN.email,
      passwordHash: await argon2id({
        password: TEST_ADMIN.password,
        salt: randomBytes(16),
        parallelism: 1,
        iterations: 3,
        memorySize: 65536,
        hashLength: 32,
        outputType: "encoded",
      }),
      role: TEST_ADMIN.role,
      totpSecret: encryptSecret(TEST_ADMIN.totpSecret, process.env.TOTP_ENC_KEY),
      totpRecoveryCodes: TEST_ADMIN.recoveryCodes.map(hashRecoveryCode),
    },
  });
  console.log(`[e2e] seeded ${TEST_ADMIN.email}`);
} finally {
  await db.$disconnect();
}
