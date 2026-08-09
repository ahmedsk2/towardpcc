import { expect, test } from "@playwright/test";

/**
 * PRISM's collection window, and the four questions that are asked only when a
 * mortality probability is reachable.
 *
 * WHY THIS SPEC EXISTS AT THE UI BOUNDARY. The engine gate — a hidden input's
 * id never reaches `calculate` — is asserted directly in
 * `packages/scoring-engine/src/validation.test.ts`, and it is the assertion
 * that binds for the number. But on PRISM a stale hidden value cannot change
 * the number at all: `calculate` returns before every read of the four
 * covariates on the 12- and 24-hour windows. The visible damage is therefore in
 * the RECORD and the LINK — a covariate printed in a copied handover note is an
 * answer the reader believes was on screen, and a covariate baked into a shared
 * link is state that arrives at someone else's form with no keystroke. Nothing
 * in the engine suite can see either. That is what these tests are for.
 *
 * Service workers are blocked for this suite in `playwright.config.ts`.
 */

const PRISM = "/calculators/prism";

const WINDOW = {
  h4: /First 4 hours of PICU care/,
  h12: /First 12 hours of PICU care/,
  h24: /First 24 hours of PICU care/,
};

/** The four PRISM IV admission-context covariates, by field id. */
const COVARIATES = ["admission_source", "cpr_24h", "cancer", "low_risk_system"] as const;

async function chooseWindow(page: import("@playwright/test").Page, label: RegExp) {
  await page.locator("#field-collection_window").getByRole("radio", { name: label }).check();
}

/**
 * The minimum PRISM needs to return a result: `collection_window`, `age` and
 * `pupils` are its three required inputs. A first draft of this spec entered
 * only age and a blood pressure, and the result panel simply never rendered —
 * so the two tests that read from it timed out on a missing copy button rather
 * than on anything about visibility.
 */
async function enterRequired(page: import("@playwright/test").Page) {
  await page.locator("#field-age").fill("3");
  await page
    .locator("#field-pupils")
    .getByRole("radio", { name: /^Both reactive$/ })
    .check();
}

test.describe("PRISM collection window", () => {
  test("the four covariates are asked on the 4-hour window and on no other", async ({ page }) => {
    await page.goto(PRISM, { waitUntil: "networkidle" });

    // Nothing selected yet: an unanswered controller hides its dependents, which
    // is the safe direction — it can only ever withhold a question, never
    // invent one.
    for (const id of COVARIATES) await expect(page.locator(`#field-${id}`)).toHaveCount(0);

    await chooseWindow(page, WINDOW.h4);
    for (const id of COVARIATES) await expect(page.locator(`#field-${id}`)).toHaveCount(1);

    await chooseWindow(page, WINDOW.h12);
    for (const id of COVARIATES) await expect(page.locator(`#field-${id}`)).toHaveCount(0);

    await chooseWindow(page, WINDOW.h24);
    for (const id of COVARIATES) await expect(page.locator(`#field-${id}`)).toHaveCount(0);

    // And back, because the answers are held in state rather than destroyed —
    // switching window on a 26-field form whose only reset is all-or-nothing
    // must not be a way to lose four answers to a mis-tap.
    await chooseWindow(page, WINDOW.h4);
    for (const id of COVARIATES) await expect(page.locator(`#field-${id}`)).toHaveCount(1);
  });

  test("the whole Admission context section disappears, legend and all", async ({ page }) => {
    // Filtering happens BEFORE the inputs are grouped, so a section whose
    // members are all hidden never opens a bucket. Filtering inside the render
    // loop instead would leave a labelled empty section.
    await page.goto(PRISM, { waitUntil: "networkidle" });
    await chooseWindow(page, WINDOW.h4);
    await expect(page.getByText("Admission context", { exact: true })).toHaveCount(1);
    await chooseWindow(page, WINDOW.h12);
    await expect(page.getByText("Admission context", { exact: true })).toHaveCount(0);
  });

  test("the completion counter moves both its numerator and its denominator", async ({ page }) => {
    // The single assertion that catches an N/M desync. Filtering the numerator
    // alone reads "26 of 22"; filtering neither pins a fully entered 12-hour
    // PRISM at "22 of 26" forever, which is the same falsehood in the other
    // direction as the one the counter exists to prevent.
    await page.goto(PRISM, { waitUntil: "networkidle" });
    await chooseWindow(page, WINDOW.h4);
    await expect(page.getByText(/\d+ of \d+ entered/)).toHaveText("1 of 26 entered");
    await chooseWindow(page, WINDOW.h12);
    await expect(page.getByText(/\d+ of \d+ entered/)).toHaveText("1 of 22 entered");
  });

  test("a covariate answered on the 4-hour window does not survive into the link or the record", async ({
    page,
    context,
  }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.goto(PRISM, { waitUntil: "networkidle" });

    await chooseWindow(page, WINDOW.h4);
    await page.locator("#field-cancer").getByRole("radio", { name: /^Yes$/ }).check();
    // Enough for the score to compute, so both copy buttons are live.
    await enterRequired(page);

    await chooseWindow(page, WINDOW.h12);
    await expect(page.locator("#field-cancer")).toHaveCount(0);

    await page.getByRole("button", { name: /copy link with these values/i }).click();
    const link = await page.evaluate(() => navigator.clipboard.readText());
    expect(link).toContain("collection_window=first_12h");
    expect(link).not.toContain("cancer");

    await page.getByRole("button", { name: /copy result summary/i }).click();
    const summary = await page.evaluate(() => navigator.clipboard.readText());
    expect(summary).toContain("First 12 hours");
    expect(summary).not.toContain("Cancer, acute or chronic");
  });

  test("a link from the installed base cannot inject a hidden answer", async ({ page }) => {
    // NOT hypothetical. Links already in circulation legitimately carry
    // `collection_window=first_12h` together with all four covariates, because
    // until v2.5.0 every window rendered all 26 fields. They are the hazard
    // case on first load, and decode prunes them — the property being kept is
    // that a value in a field that is not on screen was typed in this session
    // by the person looking at the screen.
    await page.goto(
      `${PRISM}#collection_window=first_12h;age=3~years;pupils=both_reactive;cancer=true;cpr_24h=true`,
      { waitUntil: "networkidle" },
    );
    await expect(page.locator("#field-cancer")).toHaveCount(0);

    await chooseWindow(page, WINDOW.h4);
    await expect(page.locator("#field-cancer")).toHaveCount(1);
    await expect(page.locator("#field-cancer").getByRole("radio", { checked: true })).toHaveCount(
      0,
    );
    await expect(page.locator("#field-cpr_24h").getByRole("radio", { checked: true })).toHaveCount(
      0,
    );
    // The values that WERE visible in that link survive untouched.
    await expect(page.locator("#field-age")).toHaveValue("3");
  });

  test("the 12-hour window emits the score alone and the 4-hour window adds the probability", async ({
    page,
  }) => {
    await page.goto(PRISM, { waitUntil: "networkidle" });
    await chooseWindow(page, WINDOW.h12);
    await enterRequired(page);
    // The total; the two subscores are claimed by the declared composition and
    // render in the panel rather than in the flat list.
    await expect(page.locator("[data-result-values]")).toHaveAttribute("data-result-values", "1");

    await chooseWindow(page, WINDOW.h4);
    await page
      .locator("#field-admission_source")
      .getByRole("radio", { name: /Emergency/ })
      .check();
    for (const id of ["cpr_24h", "cancer", "low_risk_system"]) {
      await page.locator(`#field-${id}`).getByRole("radio", { name: /^No$/ }).check();
    }
    await expect(page.locator("[data-result-values]")).toHaveAttribute("data-result-values", "2");
  });
});
