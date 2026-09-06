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
  h4: /^PRISM IV \(score and mortality probability\)$/,
  // ONE PRISM III option since v2.7.0: the 12- and 24-hour windows returned
  // byte-identical output, and the models that distinguish them are models
  // this platform does not ship.
  iii: /^PRISM III \(severity score only\)$/,
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
/** All four covariates answered, which is what unlocks the probability. */
async function answerCovariates(page: import("@playwright/test").Page) {
  await page
    .locator("#field-admission_source")
    .getByRole("radio", { name: /Emergency/ })
    .check();
  for (const id of ["cpr_24h", "cancer", "low_risk_system"]) {
    await page.locator(`#field-${id}`).getByRole("radio", { name: /^No$/ }).check();
  }
}

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

    await chooseWindow(page, WINDOW.iii);
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
    await chooseWindow(page, WINDOW.iii);
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
    await chooseWindow(page, WINDOW.iii);
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

    await chooseWindow(page, WINDOW.iii);
    await expect(page.locator("#field-cancer")).toHaveCount(0);

    await page.getByRole("button", { name: /^copy link$/i }).click();
    const link = await page.evaluate(() => navigator.clipboard.readText());
    expect(link).toContain("collection_window=first_12_24h");
    expect(link).not.toContain("cancer");

    await page.getByRole("button", { name: /^copy summary$/i }).click();
    const summary = await page.evaluate(() => navigator.clipboard.readText());
    expect(summary).toContain("PRISM III (severity score only)");
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
      `${PRISM}#collection_window=first_12_24h;age=3~years;pupils=both_reactive;cancer=true;cpr_24h=true`,
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
    await chooseWindow(page, WINDOW.iii);
    await enterRequired(page);
    // The total; the two subscores are claimed by the declared composition and
    // render in the panel rather than in the flat list.
    await expect(page.locator("[data-result-values]")).toHaveAttribute("data-result-values", "1");
    await expect(page.locator("[data-derived-output]")).toHaveCount(0);

    await chooseWindow(page, WINDOW.h4);
    await answerCovariates(page);
    // STILL ONE FLAT VALUE. Since v2.6.0 the probability is a declared derived
    // output and leaves the flat list for its own block — it is downstream of
    // the score, not a peer of it. A regression that put it back would read
    // "2" here.
    await expect(page.locator("[data-result-values]")).toHaveAttribute("data-result-values", "1");
    await expect(page.locator('[data-derived-output="mortality_probability"]')).toHaveCount(1);
  });

  test("the derived block names its working and carries the calibration caution", async ({
    page,
  }) => {
    await page.goto(PRISM, { waitUntil: "networkidle" });
    await chooseWindow(page, WINDOW.h4);
    await enterRequired(page);
    await answerCovariates(page);

    const block = page.locator('[data-derived-output="mortality_probability"]');
    await expect(block).toContainText("PRISM IV mortality estimate");
    // The working, and specifically that it is NOT the total. PRISM IV weights
    // the two subscores at 0.197 and 0.163 and never forms their sum, so a
    // block claiming derivation from the total would be a clinical falsehood
    // rendered in words.
    await expect(block).toContainText("Derived from the two subscores");
    await expect(block).not.toContainText("derived from the total");
    // The caution sits with the number it is about, not with the score.
    await expect(block).toContainText("UN-CALIBRATED FOR THIS POPULATION");
    await expect(block).toContainText("AUC 0.81");
  });

  test("the probability stays in the copied handover record", async ({ page, context }) => {
    // Pulling it out of the flat list for LAYOUT must not drop it from the
    // clipboard. It is the number a reader is most likely to act on, and a
    // handover note that silently omits it is worse than one that never had it.
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.goto(PRISM, { waitUntil: "networkidle" });
    await chooseWindow(page, WINDOW.h4);
    await enterRequired(page);
    await answerCovariates(page);

    await page.getByRole("button", { name: /^copy summary$/i }).click();
    const summary = await page.evaluate(() => navigator.clipboard.readText());
    // The real emitted labels, read off an actual clipboard capture rather than
    // guessed: a first draft of this test asserted "Mortality probability" and
    // "PRISM total", neither of which this score emits.
    expect(summary).toContain("Derived: PRISM IV predicted hospital mortality");
    expect(summary).toMatch(/\d+\.\d+ %/);
    // The score and its working are still there too.
    expect(summary).toContain("PRISM score:");
    expect(summary).toContain("Components:");
  });

  /**
   * LINKS ALREADY IN CIRCULATION, and this is the test that matters most for
   * the v2.7.0 collapse.
   *
   * `collection_window` is `required: true`, so a link carrying a value the
   * score no longer declares does NOT merely lose the window — the engine
   * returns `invalid-category` and the WHOLE score blocks. A colleague's link
   * that used to show a number would show nothing at all. Reproduced against
   * `compute` before the migration was written, which is why the migration
   * exists.
   */
  for (const legacy of ["first_12h", "first_24h"]) {
    test(`a link minted with the retired ${legacy} still computes`, async ({ page }) => {
      await page.goto(`${PRISM}#collection_window=${legacy};age=3~years;pupils=both_reactive`, {
        waitUntil: "networkidle",
      });
      // Migrated to the surviving option, not merely tolerated.
      await expect(
        page.locator("#field-collection_window").getByRole("radio", { checked: true }),
      ).toHaveCount(1);
      await expect(page.locator("#field-collection_window")).toContainText(
        "PRISM III (severity score only)",
      );
      // And the score actually renders, which is the thing that was at risk.
      await expect(page.locator("[data-result-values]")).toHaveAttribute("data-result-values", "1");
      await expect(page.locator("[data-derived-output]")).toHaveCount(0);
    });
  }
});
