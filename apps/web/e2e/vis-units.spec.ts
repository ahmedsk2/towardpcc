import { expect, test } from "@playwright/test";

/**
 * VIS unit toggles: the one that matters must stay, the one that did nothing
 * must go.
 *
 * Until 2026-08-10 four catecholamine fields offered a choice between
 * "mcg/kg/min" and "µg/kg/min" — two spellings of microgram, an identical
 * number either way. Vasopressin sits on the same form with a units versus
 * milliunits toggle that changes the answer by a factor of a thousand, and is
 * the documented trap the infusion unit file exists to contain.
 *
 * That is the whole reason this spec is not cosmetic. A control that visibly
 * does nothing teaches a clinician that infusion unit toggles do not matter,
 * and the next one they skip is the one that does. So this asserts BOTH
 * directions: no choice where there is no consequence, and a choice where
 * there is one.
 */

const VIS = "/calculators/vis";

/** The unit control for a field, whichever form it renders in. */
const unitControl = (page: import("@playwright/test").Page, id: string) =>
  page
    .locator(`#field-${id}`)
    .locator("xpath=..")
    .getByRole("radio")
    .or(page.locator(`#field-${id}`).locator("xpath=..").getByRole("combobox"));

test.describe("VIS infusion units", () => {
  test("the catecholamines offer no unit choice, because there is none to make", async ({
    page,
  }) => {
    await page.goto(VIS, { waitUntil: "networkidle" });
    for (const id of ["dopamine", "dobutamine", "epinephrine", "norepinephrine", "milrinone"]) {
      const field = page.locator(`#field-${id}`);
      await expect(field, `${id} should exist`).toHaveCount(1);
      await expect(unitControl(page, id), `${id} must not offer a unit toggle`).toHaveCount(0);
    }
  });

  test("the field shows µg and still accepts a link written in mcg", async ({ page }) => {
    // Older shared links encode the unit they were minted with. Dropping the
    // spelling from the toggle must not drop it from what decodes.
    await page.goto(`${VIS}#epinephrine=0.1~mcg%2Fkg%2Fmin`, { waitUntil: "networkidle" });
    await expect(page.locator("#field-epinephrine")).toHaveValue("0.1");
    await expect(page.locator("[data-result-values]")).toHaveAttribute("data-result-values", "1");
  });

  test("vasopressin keeps its toggle, because that one changes the answer", async ({ page }) => {
    await page.goto(VIS, { waitUntil: "networkidle" });
    await expect(unitControl(page, "vasopressin")).not.toHaveCount(0);
  });
});
