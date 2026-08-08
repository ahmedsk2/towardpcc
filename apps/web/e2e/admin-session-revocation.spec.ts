import { createHmac } from "node:crypto";
import { expect, test, type BrowserContext, type Page } from "@playwright/test";
// Relative path, not a package import — the fixture is dependency-free so it can
// be read from both here and the seeder in packages/db, which do not share a
// resolvable dependency graph under pnpm's strict node_modules layout.
import { TEST_ADMIN } from "../../../packages/db/scripts/e2e-admin-fixture.mjs";

/**
 * Sessions are revocable, and the proof is a REPLAY (SPC-TM-002).
 *
 * WHAT WAS BROKEN AND WHY A NORMAL SIGN-OUT TEST WOULD NOT CATCH IT. Sessions
 * were stateless JWTs with no server-side record. Signing out cleared the cookie,
 * so every test that clicks "Sign out" and checks it landed on the login page
 * passed — while the token itself stayed perfectly valid. Anyone holding a copy
 * of that cookie could keep using it until it expired, and `@auth/core` re-signs
 * the token with a fresh `exp` on every read, so "until it expired" meant
 * indefinitely.
 *
 * So this test does the thing an attacker would: it keeps a copy of the cookie,
 * signs out through the UI, then puts the cookie back and asks for `/admin`
 * again. Against the old stateless design that request SUCCEEDS. It is refused
 * only because the `jwt` callback now checks the token's id against an
 * `AdminSession` row that sign-out deleted.
 *
 * That makes this a negative control rather than a happy path — the failure it
 * describes is invisible to every other spec in this suite.
 */

const CODE_DIGITS = 6;
const STEP_SECONDS = 30;

/**
 * RFC 6238 TOTP, computed independently of `lib/auth/totp.ts` on purpose — a
 * code derived from the same module the server verifies with would agree even
 * when both were wrong. Duplicated from `admin-login.spec.ts` rather than
 * shared: extracting it into a helper the specs import would recreate exactly
 * the coupling this independence exists to avoid.
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

/** The session cookie is unprefixed in dev/test; production adds `__Secure-`. */
const SESSION_COOKIE = "authjs.session-token";

async function logIn(page: Page): Promise<void> {
  await page.goto("/admin/login");
  await page.locator("#email").fill(TEST_ADMIN.email);
  await page.locator("#password").fill(TEST_ADMIN.password);
  await page.locator("#token").fill(totpCode(TEST_ADMIN.totpSecret));
  await page.locator('button[type="submit"]').click();
  await expect(page).toHaveURL(/\/admin(?!\/login)/, { timeout: 15_000 });
}

async function sessionCookie(context: BrowserContext) {
  const cookie = (await context.cookies()).find((c) => c.name === SESSION_COOKIE);
  expect(cookie, `no ${SESSION_COOKIE} cookie after login`).toBeTruthy();
  return cookie!;
}

/** The same contract `admin-login.spec.ts` enforces: a skip in CI is a fault. */
if (process.env.CI && !process.env.E2E_DATABASE_URL) {
  throw new Error(
    "E2E_DATABASE_URL must be set in CI — the session-revocation spec may never silently skip there.",
  );
}

test.describe("admin session revocation", () => {
  test.skip(!process.env.E2E_DATABASE_URL, "needs E2E_DATABASE_URL — see e2e/global-setup.mjs");

  test("a cookie captured before sign-out no longer works after it", async ({ page, context }) => {
    await logIn(page);
    const stolen = await sessionCookie(context);

    // Sanity: the captured cookie is genuinely the thing granting access, so a
    // later refusal means the SESSION died rather than the cookie being wrong.
    await page.goto("/admin");
    await expect(page).not.toHaveURL(/\/admin\/login/);

    await page.getByRole("button", { name: /sign out/i }).click();
    await expect(page).toHaveURL(/\/admin\/login/, { timeout: 15_000 });

    // Replay it. Against a stateless JWT this restores access completely.
    await context.clearCookies();
    await context.addCookies([stolen]);
    await page.goto("/admin");

    await expect(page).toHaveURL(/\/admin\/login/, { timeout: 15_000 });
  });

  /**
   * The complement: a cookie that was never signed out MUST keep working across
   * a fresh browser context.
   *
   * Without this, the test above would still pass if the allow-list rejected
   * everything — which is the classic way a security control gets "fixed" into
   * uselessness. Together they pin the boundary from both sides.
   */
  test("an un-revoked cookie still works in a fresh context", async ({
    page,
    context,
    browser,
  }) => {
    await logIn(page);
    const live = await sessionCookie(context);

    const second = await browser.newContext();
    await second.addCookies([live]);
    const secondPage = await second.newPage();
    await secondPage.goto("/admin");

    await expect(secondPage).not.toHaveURL(/\/admin\/login/);
    await second.close();
  });
});
