import { createHmac } from "node:crypto";
import { expect, test } from "@playwright/test";
// Relative path, not a package import: the fixture is dependency-free so it can
// be read from both here and the seeder in packages/db, which do not share a
// resolvable dependency graph under pnpm's strict node_modules layout.
import { TEST_ADMIN } from "../../../packages/db/scripts/e2e-admin-fixture.mjs";

/**
 * A successful admin login, end to end.
 *
 * THE GAP THIS CLOSES. Until 2026-08-07 nothing exercised a login that WORKS.
 * `admin-auth.spec.ts` proved unauthenticated visitors are turned away;
 * `auth.ts` had no unit test; the Playwright config said plainly "no real login
 * is exercised here". So the path whose failure locks the platform's only
 * operator out was covered by nothing at all, and any change to the auth
 * strategy would have shipped unverifiable.
 *
 * WHY IT MAY SKIP. The rest of the suite needs no database — the calculators are
 * client-side, which is the point of the project — so demanding Postgres for
 * every local run would fail fresh clones for unrelated reasons. It runs when
 * `E2E_DATABASE_URL` is set, which CI always does. A skip in CI therefore means
 * something is broken, not absent.
 */

/**
 * Fields are addressed by id, not by label.
 *
 * `getByLabel(/email/i)` matched more than one element — the page has other text
 * mentioning email — and a strict-mode violation reads as a broken test rather
 * than an ambiguous selector. The ids are stable and defined right beside the
 * labels in `app/admin/login/login-form.tsx`.
 */
const CODE_DIGITS = 6;
const STEP_SECONDS = 30;

/**
 * RFC 6238 TOTP, computed here rather than imported.
 *
 * Deliberately independent of `lib/auth/totp.ts`. If the test derived its code
 * from the same module the server verifies with, the two would agree even when
 * both were wrong — the test would be checking the app against itself. An
 * independent implementation means a genuine RFC-6238 code has to verify.
 */
function totpCode(base32Secret: string, atMs = Date.now()): string {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = "";
  for (const ch of base32Secret.replace(/=+$/, "").toUpperCase()) {
    const idx = alphabet.indexOf(ch);
    if (idx === -1) throw new Error(`not base32: ${ch}`);
    bits += idx.toString(2).padStart(5, "0");
  }
  const key = Buffer.from((bits.match(/.{8}/g) ?? []).map((b) => parseInt(b, 2)));

  const counter = Math.floor(atMs / 1000 / STEP_SECONDS);
  const msg = Buffer.alloc(8);
  msg.writeBigUInt64BE(BigInt(counter));

  const digest = createHmac("sha1", key).update(msg).digest();
  const offset = digest[digest.length - 1]! & 0x0f;
  const binary =
    ((digest[offset]! & 0x7f) << 24) |
    (digest[offset + 1]! << 16) |
    (digest[offset + 2]! << 8) |
    digest[offset + 3]!;
  return String(binary % 10 ** CODE_DIGITS).padStart(CODE_DIGITS, "0");
}

test.describe("admin login", () => {
  test.skip(
    !process.env.E2E_DATABASE_URL,
    "needs E2E_DATABASE_URL — see e2e/global-setup.mjs. CI always sets it, so a skip there is a fault.",
  );

  test("a correct password and TOTP code reach the admin area", async ({ page }) => {
    await page.goto("/admin/login");

    await page.locator("#email").fill(TEST_ADMIN.email);
    await page.locator("#password").fill(TEST_ADMIN.password);
    await page.locator("#token").fill(totpCode(TEST_ADMIN.totpSecret));
    await page.locator('button[type="submit"]').click();

    // Landing anywhere under /admin that is NOT the login page is the assertion:
    // the exact destination is a routing detail, being authenticated is not.
    await expect(page).toHaveURL(/\/admin(?!\/login)/, { timeout: 15_000 });
    await expect(page).not.toHaveURL(/\/admin\/login/);
  });

  /**
   * The negative control. Without it, a login form that accepted ANYTHING would
   * pass the test above — which is precisely the shape of failure this project
   * keeps finding in guards that have never been made to fail.
   */
  test("a wrong TOTP code does not get in", async ({ page }) => {
    await page.goto("/admin/login");

    await page.locator("#email").fill(TEST_ADMIN.email);
    await page.locator("#password").fill(TEST_ADMIN.password);
    await page.locator("#token").fill("000000");
    await page.locator('button[type="submit"]').click();

    await expect(page).toHaveURL(/\/admin\/login/, { timeout: 15_000 });
  });

  /**
   * A recovery code is the documented way back in when the authenticator is
   * gone, and `docs/runbooks/deploy-production.md` now tells an operator to mint
   * one with `psql` during a lockout. That procedure is worth exercising rather
   * than trusting: it depends on the stored hash being plain
   * `sha256(lowercased)`, which is an assumption two files share.
   */
  test("a recovery code is accepted in place of a TOTP code", async ({ page }) => {
    await page.goto("/admin/login");

    await page.locator("#email").fill(TEST_ADMIN.email);
    await page.locator("#password").fill(TEST_ADMIN.password);
    await page.locator("#token").fill(TEST_ADMIN.recoveryCodes[1]!);
    await page.locator('button[type="submit"]').click();

    await expect(page).toHaveURL(/\/admin(?!\/login)/, { timeout: 15_000 });
  });
});
