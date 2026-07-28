import { expect, test } from "@playwright/test";

/**
 * Every protected admin route turns an unauthenticated visitor away, and does
 * not leak its content while doing so.
 *
 * There was no test for this. The suite covered the admin CSP tier and the
 * login page's headers, but nothing asserted that `/admin` itself is actually
 * closed — the guard was trusted because it is called in a layout, which is
 * exactly the reasoning the guard's own comment warns against ("re-guarded
 * server-side — never trust the layout alone").
 *
 * It matters more since /admin/settings shipped, because that page renders the
 * mail relay's host, username and sender addresses. A redirect that still
 * streamed the body first would disclose them.
 */
const PROTECTED = [
  "/admin",
  "/admin/settings",
  "/admin/calculators",
  // A submission id that does not exist: the point is that authentication is
  // checked BEFORE the row is looked up, so this must redirect rather than 404.
  "/admin/submissions/does-not-exist",
];

test.describe("admin routes are closed to anonymous visitors", () => {
  for (const path of PROTECTED) {
    test(`${path} redirects to the login page`, async ({ page }) => {
      const response = await page.goto(path);

      // Landing on login is the requirement; how many hops it took is not.
      await expect(page).toHaveURL(/\/admin\/login/);
      expect(
        response?.status(),
        "the final response should still be a 200 login page",
      ).toBeLessThan(400);
    });
  }

  test("the settings page does not disclose relay configuration to anonymous visitors", async ({
    page,
  }) => {
    await page.goto("/admin/settings");
    const body = (await page.locator("body").innerText()).toLowerCase();

    // Named individually rather than as one regex so a failure says which
    // value leaked.
    for (const secret of ["smtp_host", "smtp_user", "smtp_password", "admin_email"]) {
      expect(body, `"${secret}" appeared on the page served to an anonymous visitor`).not.toContain(
        secret,
      );
    }
  });

  test("the login page itself stays reachable", async ({ page }) => {
    // Guards the guard: if the matcher above were wrong and every admin path
    // 404'd, the redirect assertions could pass for the wrong reason.
    const response = await page.goto("/admin/login");
    expect(response?.status()).toBe(200);
    await expect(page.locator("form")).toBeVisible();
  });
});
