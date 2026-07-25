import { expect, test } from "@playwright/test";

/**
 * P5 acceptance (PRD §9 / threat-model TM-005): the security headers ship with
 * every response. Runs against the production server, so it exercises the real
 * proxy.ts CSP + next.config headers().
 */
test.describe("security headers", () => {
  test("public pages carry the CSP and hardening headers", async ({ page }) => {
    const response = await page.goto("/");
    expect(response).not.toBeNull();
    const h = response!.headers();

    const csp = h["content-security-policy"];
    expect(csp, "CSP present").toBeTruthy();
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("base-uri 'none'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("form-action 'self'");

    expect(h["strict-transport-security"], "HSTS").toContain("max-age=");
    expect(h["x-content-type-options"]).toBe("nosniff");
    expect(h["referrer-policy"]).toBe("strict-origin-when-cross-origin");
    expect(h["x-frame-options"]).toBe("DENY");
    expect(h["permissions-policy"], "Permissions-Policy").toContain("geolocation=()");
  });

  test("the admin area is served with a strict, nonce-based script policy", async ({ page }) => {
    const response = await page.goto("/admin/login");
    const csp = response!.headers()["content-security-policy"] ?? "";
    // The /admin tier must be strict: a per-request nonce and strict-dynamic,
    // and NO 'unsafe-inline' for scripts.
    expect(csp).toContain("'nonce-");
    expect(csp).toContain("'strict-dynamic'");
    const scriptSrc = csp.split(";").find((d) => d.trim().startsWith("script-src")) ?? "";
    expect(scriptSrc).not.toContain("'unsafe-inline'");
  });
});
