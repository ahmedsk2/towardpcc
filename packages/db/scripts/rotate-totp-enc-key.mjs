/* global process, console, Buffer */
/**
 * Re-encrypt every application-sealed value from one TOTP_ENC_KEY to another.
 *
 * WHY THIS EXISTS. `TOTP_ENC_KEY` cannot simply be swapped in the environment.
 * It seals two different things — admin TOTP secrets (`AdminUser.totpSecret`)
 * and any `AppSetting` row with `encrypted = true`, which today is the SMTP
 * password — and both are AES-256-GCM boxes that fail closed under the wrong
 * key. Rotating without re-encrypting does not degrade gracefully: every admin
 * loses their second factor and mail stops sending, at the same moment.
 *
 * So the order is: run this, THEN change the environment variable. Both keys
 * are needed at once, which is the whole point.
 *
 *   node scripts/rotate-totp-enc-key.mjs --self-test        # no database
 *
 *   TOTP_ENC_KEY_OLD=<base64-32> TOTP_ENC_KEY_NEW=<base64-32> \
 *     node --env-file=.env.local scripts/rotate-totp-enc-key.mjs [--commit]
 *
 * Dry-run unless `--commit`: it decrypts, re-encrypts and verifies every row,
 * reports the counts, and writes nothing.
 *
 * SAFETY PROPERTIES, each deliberate:
 *
 *   - `--self-test` exercises the crypto and all three `migrate` branches with
 *     throwaway keys and no database, so the guarantee travels with the script
 *     and can be run on the host before it is pointed at real data. There is no
 *     test runner in this package; this is how the logic stays checkable.
 *   - Every new box is round-tripped under the new key IN MEMORY before any
 *     write. A value that cannot be read back is a hard failure, not a row that
 *     silently becomes unrecoverable.
 *   - All writes share one transaction. A partial rotation is the worst
 *     outcome, because half the admins can log in and half cannot.
 *   - Re-runnable. A row already under the new key is detected and skipped
 *     rather than double-encrypted, so an interrupted run can just be redone.
 *   - It never prints a plaintext, a key, or a ciphertext.
 *
 * Needs UPDATE on `AdminUser` and `AppSetting`. The application role has that;
 * unlike the retention purge this never touches the append-only audit log, so
 * it does not need `towardpcc_owner`.
 */
import { createCipheriv, createDecipheriv, randomBytes, timingSafeEqual } from "node:crypto";
import { pathToFileURL } from "node:url";

const COMMIT = process.argv.includes("--commit");
const SELF_TEST = process.argv.includes("--self-test");

/** Matches apps/web/lib/crypto/secret-box.ts exactly: iv.tag.ciphertext, base64. */
export function open(sealed, key) {
  const [ivB, tagB, ctB] = sealed.split(".");
  if (!ivB || !tagB || !ctB) throw new Error("malformed sealed value");
  const d = createDecipheriv("aes-256-gcm", key, Buffer.from(ivB, "base64"));
  d.setAuthTag(Buffer.from(tagB, "base64"));
  return Buffer.concat([d.update(Buffer.from(ctB, "base64")), d.final()]).toString("utf8");
}

export function seal(plaintext, key) {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", key, iv);
  const ct = Buffer.concat([c.update(plaintext, "utf8"), c.final()]);
  return [iv.toString("base64"), c.getAuthTag().toString("base64"), ct.toString("base64")].join(
    ".",
  );
}

/**
 * Returns the re-encrypted box, or null when the row is already migrated.
 *
 * Trying the NEW key on failure is what makes this re-runnable: after a crash
 * some rows are under the new key, and decrypting those with the old one
 * throws. Without this branch a second run would abort on the first migrated
 * row — exactly when you most need it to work.
 */
export function migrate(sealed, label, oldKey, newKey) {
  let plaintext;
  try {
    plaintext = open(sealed, oldKey);
  } catch {
    try {
      open(sealed, newKey);
      return null; // already rotated
    } catch {
      throw new Error(
        `${label}: unreadable under BOTH the old and the new key. ` +
          `Do not proceed — establish which key sealed it before rotating.`,
      );
    }
  }
  const reSealed = seal(plaintext, newKey);
  // Verify before writing, not after. An unverifiable box written to the
  // database is an admin who can never log in again.
  if (open(reSealed, newKey) !== plaintext) throw new Error(`${label}: re-encrypted value failed`);
  return reSealed;
}

function loadKey(name) {
  const raw = process.env[name];
  if (!raw) throw new Error(`${name} is not set`);
  const k = Buffer.from(raw, "base64");
  if (k.length !== 32) throw new Error(`${name} must decode to 32 bytes (got ${k.length})`);
  return k;
}

function selfTest() {
  const a = randomBytes(32);
  const b = randomBytes(32);
  const checks = [];
  const check = (name, fn) => {
    try {
      fn();
      checks.push(`  PASS  ${name}`);
    } catch (e) {
      checks.push(`  FAIL  ${name} — ${e.message}`);
      process.exitCode = 1;
    }
  };

  check("a sealed value round-trips under its own key", () => {
    const box = seal("JBSWY3DPEHPK3PXP", a);
    if (open(box, a) !== "JBSWY3DPEHPK3PXP") throw new Error("round-trip mismatch");
  });

  check("the wrong key cannot open a box", () => {
    const box = seal("secret", a);
    try {
      open(box, b);
    } catch {
      return;
    }
    throw new Error("opened under the wrong key — GCM auth is not working");
  });

  check("migrate re-seals an old-key box so the new key opens it", () => {
    const out = migrate(seal("hello", a), "test", a, b);
    if (out === null) throw new Error("reported already-migrated");
    if (open(out, b) !== "hello") throw new Error("new box does not carry the plaintext");
    try {
      open(out, a);
    } catch {
      return;
    }
    throw new Error("old key still opens the new box");
  });

  check("migrate skips a row already under the new key (re-runnable)", () => {
    if (migrate(seal("hello", b), "test", a, b) !== null) throw new Error("did not skip");
  });

  check("migrate refuses a box readable under neither key", () => {
    try {
      migrate(seal("hello", randomBytes(32)), "test", a, b);
    } catch (e) {
      if (!/unreadable under BOTH/.test(e.message)) throw new Error("wrong error: " + e.message);
      return;
    }
    throw new Error("accepted an unreadable box");
  });

  check("a malformed value is rejected rather than guessed at", () => {
    try {
      migrate("not-a-sealed-value", "test", a, b);
    } catch {
      return;
    }
    throw new Error("accepted a malformed value");
  });

  console.log("Self-test (no database touched):\n" + checks.join("\n"));
  console.log(
    process.exitCode ? "\nSELF-TEST FAILED — do not run this against data." : "\nAll good.",
  );
}

async function rotate() {
  const OLD = loadKey("TOTP_ENC_KEY_OLD");
  const NEW = loadKey("TOTP_ENC_KEY_NEW");
  if (OLD.length === NEW.length && timingSafeEqual(OLD, NEW)) {
    throw new Error("TOTP_ENC_KEY_OLD and TOTP_ENC_KEY_NEW are identical — nothing to rotate");
  }

  const { PrismaPg } = await import("@prisma/adapter-pg");
  const { PrismaClient } = await import("@prisma/client");
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });

  const admins = await prisma.adminUser.findMany({ select: { id: true, totpSecret: true } });
  const settings = await prisma.appSetting.findMany({
    where: { encrypted: true },
    select: { key: true, value: true },
  });

  const adminWrites = [];
  let adminsSkipped = 0;
  for (const a of admins) {
    const next = migrate(a.totpSecret, `AdminUser ${a.id}`, OLD, NEW);
    if (next === null) adminsSkipped++;
    else adminWrites.push({ id: a.id, totpSecret: next });
  }

  const settingWrites = [];
  let settingsSkipped = 0;
  for (const s of settings) {
    const next = migrate(s.value, `AppSetting ${s.key}`, OLD, NEW);
    if (next === null) settingsSkipped++;
    else settingWrites.push({ key: s.key, value: next });
  }

  console.log(
    `admins:   ${admins.length} found, ${adminWrites.length} to rotate, ${adminsSkipped} already on the new key`,
  );
  console.log(
    `settings: ${settings.length} sealed, ${settingWrites.length} to rotate, ${settingsSkipped} already on the new key`,
  );

  if (!COMMIT) {
    console.log("\nDRY RUN — every value decrypted, re-encrypted and verified. Nothing written.");
    console.log("Re-run with --commit, then set TOTP_ENC_KEY to the new value and redeploy.");
  } else if (adminWrites.length === 0 && settingWrites.length === 0) {
    console.log("\nNothing to do — every value is already under the new key.");
  } else {
    await prisma.$transaction([
      ...adminWrites.map((w) =>
        prisma.adminUser.update({ where: { id: w.id }, data: { totpSecret: w.totpSecret } }),
      ),
      ...settingWrites.map((w) =>
        prisma.appSetting.update({ where: { key: w.key }, data: { value: w.value } }),
      ),
    ]);
    console.log(
      `\nCOMMITTED ${adminWrites.length + settingWrites.length} row(s) in one transaction.`,
    );
    console.log("NOW set TOTP_ENC_KEY to the new value and redeploy — until you do, the");
    console.log("running app still holds the old key and every sealed value will fail to open.");
  }

  await prisma.$disconnect();
}

/**
 * Pipe mode: re-encrypt `id<TAB>sealed` on stdin to `id<TAB>sealed` on stdout.
 *
 * WHY THIS EXISTS, and it is not hypothetical. The Prisma path above cannot run
 * against this production deployment: `packages/db` is not in the image (Next
 * traces only what the app imports), the host has no Node at all, and inside
 * the container Prisma sits in a pnpm store path with `pg` never traced in. The
 * one thing available everywhere is Node's built-in `crypto`.
 *
 * So the values move with `psql` and only the crypto happens here — which keeps
 * a single tested implementation rather than a second copy written under
 * pressure against a live database. `TOTP_ENC_KEY_OLD` is read from the
 * container's own `TOTP_ENC_KEY`, so the old key never leaves the host.
 *
 * Rows already under the new key are dropped from stdout and reported on
 * stderr, so re-running is safe and the caller updates only what changed.
 */
async function filterMode() {
  const OLD = loadKey("TOTP_ENC_KEY_OLD");
  const NEW = loadKey("TOTP_ENC_KEY_NEW");
  if (OLD.length === NEW.length && timingSafeEqual(OLD, NEW)) {
    throw new Error("TOTP_ENC_KEY_OLD and TOTP_ENC_KEY_NEW are identical — nothing to rotate");
  }
  let input = "";
  for await (const chunk of process.stdin) input += chunk;

  let rotated = 0;
  let skipped = 0;
  for (const line of input.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const tab = trimmed.indexOf("\t");
    if (tab < 0) throw new Error(`malformed input line (no tab): ${trimmed.slice(0, 24)}…`);
    const id = trimmed.slice(0, tab);
    const next = migrate(trimmed.slice(tab + 1), id, OLD, NEW);
    if (next === null) {
      skipped++;
      process.stderr.write(`skip ${id} (already on the new key)\n`);
    } else {
      rotated++;
      process.stdout.write(`${id}\t${next}\n`);
    }
  }
  process.stderr.write(`filter: ${rotated} rotated, ${skipped} already current\n`);
}

/**
 * Only act when executed directly. `seal`/`open` are exported so a test can
 * prove they interoperate with `apps/web/lib/crypto/secret-box.ts` — and
 * without this guard, importing the module to run that test would connect to
 * the database and start rotating.
 */
const executedDirectly = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (executedDirectly) {
  if (process.argv.includes("--filter")) await filterMode();
  else if (SELF_TEST) selfTest();
  else await rotate();
}
