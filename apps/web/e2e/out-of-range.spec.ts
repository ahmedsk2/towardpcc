import { expect, test } from "@playwright/test";

/**
 * A value that was entered and rejected must not be reported as one that was
 * never entered.
 *
 * The reviewer's scenario, reproduced: type 5,000 mg/dL of glucose into
 * corrected sodium, which accepts 0 to 2000, and look at the form. The result
 * rail said "Waiting on: Serum glucose", which reads as "you have not filled
 * this in" and sends the reader back to a box they know they filled.
 *
 * Two things the review got wrong about this, worth pinning so they are not
 * re-fixed later. `aria-invalid`, `aria-describedby`, `role="alert"` and a red
 * border ALL already existed. And the full rejection message was already
 * reaching screen readers through the rail's `sr-only` span, so the
 * accessibility path was in better shape than the visual one, not worse. What
 * was missing was the sighted half.
 *
 * Inline messages stay gated on blur, deliberately: typing one digit into a
 * 26-input score must not paint the form red. The rail is un-gated, which is
 * why the distinction belongs there.
 */

const CALC = "/calculators/corrected-sodium";

test.describe("out-of-range input", () => {
  test("the rail says the value was rejected, not that it is missing", async ({ page }) => {
    await page.goto(CALC, { waitUntil: "networkidle" });
    await page.locator("#field-measured_na").fill("140");
    await page.locator("#field-glucose").fill("5000");

    const rail = page.getByText(/Waiting on/).locator("xpath=..");
    await expect(rail).toContainText("out of range");
  });

  test("a genuinely blank field carries no reason, because the heading is already true", async ({
    page,
  }) => {
    // The other direction. Without this, printing a reason on every chip would
    // pass the test above while telling a blank field it is out of range.
    await page.goto(CALC, { waitUntil: "networkidle" });
    await page.locator("#field-measured_na").fill("140");

    const rail = page.getByText(/Waiting on/).locator("xpath=..");
    await expect(rail).toContainText("Serum glucose");
    await expect(rail).not.toContainText("out of range");
  });

  test("the field itself still carries the accessible error state after blur", async ({ page }) => {
    await page.goto(CALC, { waitUntil: "networkidle" });
    const glucose = page.locator("#field-glucose");
    await glucose.fill("5000");
    await glucose.blur();
    await expect(glucose).toHaveAttribute("aria-invalid", "true");
    const describedBy = await glucose.getAttribute("aria-describedby");
    expect(describedBy, "the error must be linked, not just present").toBeTruthy();
    await expect(page.locator(`#${describedBy}`)).toHaveAttribute("role", "alert");
  });
});
