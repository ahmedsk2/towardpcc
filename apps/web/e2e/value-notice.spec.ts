import { expect, test } from "@playwright/test";

/**
 * A value the score ACCEPTED and then did not use has to say so.
 *
 * pSOFA and Phoenix both take an SpO₂ above 97 and discard it, because the
 * SpO₂:FiO₂ ratio saturates there. The respiratory subscore then reads 0 with
 * the field FILLED, so the form's partial-entry cue — which watches for blanks —
 * never fires. Until 2026-09-03 the only disclosure was one sentence in the
 * Limitations tab, and the text-condensing pass removed it.
 *
 * Asserted in the browser rather than only in the engine because the failure
 * this guards against is a rendering failure: the engine can emit a perfectly
 * good notice that no surface prints.
 */

/** Every required field of pSOFA, leaving the respiratory pair to each test. */
async function fillPsofaExceptOxygenation(page: import("@playwright/test").Page) {
  await page.goto("/calculators/psofa", { waitUntil: "networkidle" });
  await page
    .getByRole("button", { name: /not now/i })
    .click({ timeout: 3000 })
    .catch(() => {});
  for (const [id, value] of [
    ["age_months", "60"],
    ["fio2", "1.0"],
    ["platelets", "200"],
    ["bilirubin", "0.5"],
    ["gcs", "15"],
    ["creatinine", "0.5"],
  ] as const) {
    await page.locator(`#field-${id}`).fill(value);
  }
  // Required, and the score returns no result at all without it.
  await page.locator('input[name="field-resp_support"]').first().check();
}

test.describe("a discarded value says so", () => {
  test("an SpO₂ above 97 is flagged at the field and beside the subscore", async ({ page }) => {
    await fillPsofaExceptOxygenation(page);
    await page.locator("#field-spo2").fill("99");

    const atField = page.locator("#field-spo2-notice");
    await expect(atField).toBeVisible();
    await expect(atField).toContainText("97");

    // The field's accessible description must carry it, or a screen-reader user
    // hears the help text and nothing about the value being dropped.
    await expect(page.locator("#field-spo2")).toHaveAttribute(
      "aria-describedby",
      /field-spo2-notice/,
    );

    // And beside the number it explains, which is where the 0 is read.
    const respiratoryRow = page.locator("dl > div").filter({ hasText: "Respiratory subscore" });
    await expect(respiratoryRow).toContainText("0 of 4");
    await expect(respiratoryRow).toContainText(/saturates/);
  });

  test("it is silent for a usable SpO₂, and when a PaO₂ makes it moot", async ({ page }) => {
    await fillPsofaExceptOxygenation(page);

    // 95% is inside the S/F window, so nothing was discarded.
    await page.locator("#field-spo2").fill("95");
    await expect(page.locator("#field-spo2-notice")).toHaveCount(0);

    // A PaO₂ wins outright, so a saturating SpO₂ alongside it costs nothing.
    await page.locator("#field-spo2").fill("99");
    await expect(page.locator("#field-spo2-notice")).toBeVisible();
    await page.locator("#field-pao2").fill("90");
    await expect(page.locator("#field-spo2-notice")).toHaveCount(0);
  });
});
