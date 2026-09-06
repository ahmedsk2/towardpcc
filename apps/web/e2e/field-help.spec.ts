import { expect, test } from "@playwright/test";

/**
 * Field guidance sits behind an info toggle (2026-09-06). The text must stay
 * the input's accessible description, appear on hover, pin on click, and
 * unpin on Escape — the touch path is the pin, not the hover.
 */
test.describe("field help toggle", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/calculators/pelod2", { waitUntil: "networkidle" });
    await page
      .getByRole("button", { name: /not now/i })
      .click({ timeout: 3000 })
      .catch(() => {});
  });

  test("is the input's description, hidden until asked for", async ({ page }) => {
    const age = page.locator("#field-age_months");
    const describedBy = await age.getAttribute("aria-describedby");
    expect(describedBy).toContain("field-age_months-help");
    const help = page.locator("#field-age_months-help");
    await expect(help).toBeHidden();
    await expect(help).toHaveText(/age band/i);
  });

  test("pins on click and unpins on Escape", async ({ page }) => {
    const toggle = page.getByRole("button", { name: /about patient age/i });
    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-expanded", "true");
    await expect(page.locator("#field-age_months-help")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
    await expect(page.locator("#field-age_months-help")).toBeHidden();
  });

  test("the accepted range returns as a caption once a value is present", async ({ page }) => {
    await expect(page.getByText("Accepted 0 to under 216 months")).toHaveCount(0);
    await page.locator("#field-age_months").fill("47");
    await expect(page.getByText("Accepted 0 to under 216 months")).toBeVisible();
  });
});
