/* global process, console, Buffer */
/**
 * Create the first admin operator. Run once, locally:
 *   node --env-file=.env.local scripts/create-admin.mjs <email> <password> [OWNER|EDITOR]
 *
 * Prints the TOTP provisioning URI (add it to an authenticator) and the
 * one-time recovery codes — shown ONCE, never stored in plaintext. Requires
 * DATABASE_URL and TOTP_ENC_KEY in the environment (via --env-file).
 */
import { createCipheriv, createHash, randomBytes } from "node:crypto";
import { argon2id } from "hash-wasm";
import { Secret, TOTP } from "otpauth";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const [, , emailArg, passwordArg, roleArg] = process.argv;
if (!emailArg || !passwordArg) {
  console.error(
    "Usage: node --env-file=.env.local scripts/create-admin.mjs <email> <password> [OWNER|EDITOR]",
  );
  process.exit(1);
}
const email = emailArg.trim().toLowerCase();
const role = roleArg === "OWNER" ? "OWNER" : "EDITOR";
const ISSUER = "TowardPCC";

function encKey() {
  const key = Buffer.from(process.env.TOTP_ENC_KEY ?? "", "base64");
  if (key.length !== 32) throw new Error("TOTP_ENC_KEY must decode to 32 bytes");
  return key;
}
function encryptSecret(secretBase32) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encKey(), iv);
  const ct = Buffer.concat([cipher.update(secretBase32, "utf8"), cipher.final()]);
  return [
    iv.toString("base64"),
    cipher.getAuthTag().toString("base64"),
    ct.toString("base64"),
  ].join(".");
}
function hashRecoveryCode(code) {
  return createHash("sha256").update(code.trim().toLowerCase()).digest("hex");
}

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const existing = await db.adminUser.findUnique({ where: { email } });
if (existing) {
  console.error(`An admin with email ${email} already exists. Aborting.`);
  await db.$disconnect();
  process.exit(1);
}

const passwordHash = await argon2id({
  password: passwordArg,
  salt: randomBytes(16),
  parallelism: 1,
  iterations: 2,
  memorySize: 19456,
  hashLength: 32,
  outputType: "encoded",
});

const secretBase32 = new Secret({ size: 20 }).base32;
const provisioningUri = new TOTP({
  issuer: ISSUER,
  label: email,
  secret: Secret.fromBase32(secretBase32),
}).toString();

const recoveryPlain = [];
const recoveryHashed = [];
for (let i = 0; i < 10; i++) {
  const raw = randomBytes(5).toString("hex");
  const code = `${raw.slice(0, 5)}-${raw.slice(5)}`;
  recoveryPlain.push(code);
  recoveryHashed.push(hashRecoveryCode(code));
}

await db.adminUser.create({
  data: {
    email,
    passwordHash,
    totpSecret: encryptSecret(secretBase32),
    totpRecoveryCodes: recoveryHashed,
    role,
  },
});
await db.$disconnect();

console.log(`\n✅ Admin created: ${email} (${role})\n`);
console.log("Add this to your authenticator app (scan or paste the URI):");
console.log(`  ${provisioningUri}\n`);
console.log("Recovery codes — store these somewhere safe. They are shown ONCE:");
for (const c of recoveryPlain) console.log(`  ${c}`);
console.log("");
