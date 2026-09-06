import { expect, test } from "@playwright/test";

/**
 * An accepted-range hint must read low to high, including when the unit
 * conversion REVERSES the order.
 *
 * QTc's R–R alternates are reciprocal (RR_ms = 60000 / bpm), so the canonical
 * minimum of 30 bpm converts to the R–R maximum of 2000 ms. Printed in
 * declaration order the field read "Accepted 2000–240 ms", paired with a
 * rejection naming the canonical bound in a different unit again. Found
 * 2026-09-03 by an independent recompute of every calculator.
 *
 * Nothing was over-promised, because 2000 and 240 convert exactly — the point
 * is the contract: `roundInward` exists so the printed range is a SUBSET of the
 * accepted one, and under a reversing conversion both rounding directions
 * invert too, so the lower bound would have rounded OUTWARD. qtc is the only
 * score in the registry with a reciprocal alternate, so this is the only page
 * that can catch it.
 */
test.describe("an accepted-range hint reads low to high", () => {
  test("including under a reciprocal unit conversion", async ({ page }) => {
    await page.goto("/calculators/qtc", { waitUntil: "networkidle" });
    await page
      .getByRole("button", { name: /not now/i })
      .click({ timeout: 3000 })
      .catch(() => {});

    // The accepted-range caption only renders once a value is present
    // (2026-09-06), and it is no longer a sibling with a `-help` id — it is
    // a plain `<p>` beside the field. Fill both fields so the captions render,
    // then locate each caption by walking up from the input to the field's
    // wrapper and reading the "Accepted …" text inside it.
    await page.locator("#field-hr").fill("60");
    await page.locator("#field-qt").fill("400");

    const hrHint = page
      .locator("#field-hr")
      .locator("xpath=../..")
      .getByText(/^Accepted /);

    // Canonical unit: unchanged, and the control case for everything below.
    await expect(hrHint).toContainText("Accepted 30–250 bpm");

    // Reciprocal alternates: the bounds must swap ends, not just convert.
    // The unit radios are sr-only, so Playwright's check() cannot reach them
    // and a
    // role-based locator matches the QT field's "ms" as well. Scope by the
    // radio group's name and force the click past the visibility check.
    await page.locator('input[name="unit-hr"][value="ms"]').click({ force: true });
    await expect(hrHint).toContainText("Accepted 240–2000 ms");

    await page.locator('input[name="unit-hr"][value="s"]').click({ force: true });
    await expect(hrHint).toContainText("Accepted 0.24–2 s");

    // A same-direction conversion on the same page must be untouched.
    const qtHint = page
      .locator("#field-qt")
      .locator("xpath=../..")
      .getByText(/^Accepted /);
    await expect(qtHint).toContainText("Accepted 200–700 ms");
  });
});
