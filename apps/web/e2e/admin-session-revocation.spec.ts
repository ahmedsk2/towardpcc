import { expect, test, type BrowserContext, type Page } from "@playwright/test";
// Relative path, not a package import — the fixture is dependency-free so it can
// be read from both here and the seeder in packages/db, which do not share a
// resolvable dependency graph under pnpm's strict node_modules layout.
import { TEST_ADMIN } from "../../../packages/db/scripts/e2e-admin-fixture.mjs";

/**
 * Sessions are revocable, and the proof is a REPLAY (SPC-TM-002).
 *
 * WHAT WAS BROKEN, AND WHY A NORMAL SIGN-OUT TEST WOULD NOT CATCH IT. Sessions
 * were stateless JWTs with no server-side record. Signing out cleared the cookie,
 * so any test that clicks "Sign out" and checks it landed on the login page
 * passed — while the token itself stayed perfectly valid. Anyone holding a copy
 * of that cookie could keep using it, and `@auth/core` re-signs the token with a
 * fresh `exp` on every read, so "until it expires" meant indefinitely.
 *
 * So this does what an attacker would: keep a copy of the cookie, use it from a
 * second browser context, then sign out in the FIRST context and try the copy
 * again. Against the old design the second attempt still succeeds.
 *
 * Both assertions live in one test on purpose — see the login note below.
 */

/**
 * Both spellings, because this suite gets the PRODUCTION one.
 *
 * `auth.ts` pins the cookie name off `NODE_ENV`, and the e2e webServer runs
 * `pnpm build && pnpm start` — so `NODE_ENV` is `production` here and the cookie
 * is `__Secure-authjs.session-token`, not the bare name, despite the tests
 * talking to `http://localhost:3100`. It is still accepted over plain http only
 * because Chrome treats localhost as a trustworthy origin; anywhere else that
 * cookie would be dropped outright.
 *
 * Matching both spellings keeps this working if the suite is ever pointed at a
 * dev server, and — more importantly — makes the failure legible: looking for
 * only the bare name produced "no authjs.session-token cookie after login" on a
 * login that had actually succeeded.
 */
const SESSION_COOKIE_NAMES = ["__Secure-authjs.session-token", "authjs.session-token"];

/**
 * Signs in with a RECOVERY CODE, deliberately, and not with TOTP.
 *
 * A successful TOTP login consumes its step — `verifyTotpStep` accepts the
 * current step ±1 and the server records the match, so a code cannot be used
 * twice (RFC 6238 §5.2). Steps are 30 seconds and this whole suite runs in about
 * two minutes, so a TOTP login here would land in the same window as
 * `admin-login.spec.ts`'s and be correctly rejected as a replay. That is not a
 * hypothetical: it is what happened when this spec was first written, and the
 * anti-replay guard was right both times.
 *
 * Recovery codes have no step, so this path is immune to the collision.
 *
 * FIXTURE ALLOCATION, which is a real coupling: the seed provides two codes.
 * `admin-login.spec.ts` consumes `recoveryCodes[1]`; this spec consumes
 * `recoveryCodes[0]`. A third spec needing a login must either add a code to the
 * fixture or accept the TOTP timing constraint.
 *
 * Using the recovery path costs nothing in coverage here. `ok()` in `auth.ts` is
 * the single success funnel for both second factors, so the session row is
 * created identically either way — which is the only part this spec is about.
 */
async function logIn(page: Page): Promise<void> {
  await page.goto("/admin/login");
  await page.locator("#email").fill(TEST_ADMIN.email);
  await page.locator("#password").fill(TEST_ADMIN.password);
  await page.locator("#token").fill(TEST_ADMIN.recoveryCodes[0]!);
  await page.locator('button[type="submit"]').click();
  await expect(page).toHaveURL(/\/admin(?!\/login)/, { timeout: 15_000 });
}

async function sessionCookie(context: BrowserContext) {
  const all = await context.cookies();
  const cookie = all.find((c) => SESSION_COOKIE_NAMES.includes(c.name));
  expect(
    cookie,
    `no session cookie after login — saw [${all.map((c) => c.name).join(", ")}]`,
  ).toBeTruthy();
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

  /**
   * One login, both assertions — a constraint from the single-use credential
   * above, and a stronger claim than either assertion alone.
   *
   * The SAME cookie in the SAME browser context is shown working, then shown
   * refused after a sign-out that happened somewhere else entirely. Nothing
   * about a cleared local cookie can explain that; only a server-side record
   * can.
   *
   * The first assertion is also the negative control. Without it this would
   * still pass if the allow-list rejected everything — which is the classic way
   * a security control gets "fixed" into uselessness.
   */
  test("a live cookie stops working the moment its session is revoked", async ({
    page,
    context,
    browser,
  }) => {
    await logIn(page);
    const cookie = await sessionCookie(context);

    // A second context holding only that cookie — no login, no local state.
    const copied = await browser.newContext();
    await copied.addCookies([cookie]);
    const copiedPage = await copied.newPage();

    // FIRST: the cookie alone grants access.
    await copiedPage.goto("/admin");
    await expect(copiedPage).not.toHaveURL(/\/admin\/login/);

    // Revoke from the original session. The copy is not touched.
    await page.getByRole("button", { name: /sign out/i }).click();
    await expect(page).toHaveURL(/\/admin\/login/, { timeout: 15_000 });

    // SECOND: the same cookie, in the same context that just used it, is now
    // refused. Against a stateless JWT this request still succeeds.
    await copiedPage.goto("/admin");
    await expect(copiedPage).toHaveURL(/\/admin\/login/, { timeout: 15_000 });

    await copied.close();
  });
});
