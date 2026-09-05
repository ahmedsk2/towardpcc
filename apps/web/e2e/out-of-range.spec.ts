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

  /**
   * Found by an external arithmetic audit on 2026-09-05, identically on four
   * calculators: with FiO₂ switched to %, 15 was correctly refused, but the
   * message still read "between 0.21 and 1 fraction" while the caption under
   * the same field read "Accepted 21–100 %". Two strings for one bound. The
   * refusal now uses the caption's converted range — in the field and in the
   * rail's screen-reader message.
   */
  test("an out-of-range message names the range in the unit on screen", async ({ page }) => {
    await page.goto("/calculators/sf-ratio", { waitUntil: "networkidle" });
    await page.locator("#field-spo2").fill("90");
    await page.getByLabel("Fraction of inspired oxygen (FiO₂) Unit").selectOption("%");
    const fio2 = page.locator("#field-fio2");
    await fio2.fill("15");
    await fio2.blur();

    const error = page.locator("#field-fio2-error");
    await expect(error).toContainText("must be between 21 and 100 %");
    await expect(error).not.toContainText("fraction");

    const rail = page.getByText(/Waiting on/).locator("xpath=..");
    await expect(rail).toContainText("must be between 21 and 100 %");
  });

  test("a field in its canonical unit keeps the engine's own wording", async ({ page }) => {
    // The other direction: nothing is rewritten when there is nothing to convert.
    await page.goto(CALC, { waitUntil: "networkidle" });
    const glucose = page.locator("#field-glucose");
    await glucose.fill("5000");
    await glucose.blur();
    await expect(page.locator("#field-glucose-error")).toContainText("mg/dL");
  });

  /**
   * An exclusive ceiling is not a value the field takes. PELOD-2's age is
   * max 216 / maxExclusive 216 months; the caption used to promise "0–216"
   * over a field that refuses 216. Found by the 2026-09-05 follow-up audit.
   */
  test("a caption over an exclusive ceiling says the ceiling is excluded", async ({ page }) => {
    await page.goto("/calculators/pelod2", { waitUntil: "networkidle" });
    const age = page.locator("#field-age_months");
    await expect(age).toHaveAttribute("placeholder", "0 to under 216 months");
    await expect(page.getByText("Accepted 0 to under 216 months")).toBeVisible();

    await age.fill("216");
    await age.blur();
    await expect(page.locator("#field-age_months-error")).toContainText("less than 216 months");

    await age.fill("215.5");
    await age.blur();
    await expect(page.locator("#field-age_months-error")).toHaveCount(0);
  });
});
