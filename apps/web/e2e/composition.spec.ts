import { expect, test } from "@playwright/test";

/**
 * The composition panel on composite calculators.
 *
 * A composite total is the one number on this site that is not self-explaining:
 * pSOFA 15 from three organs at maximum is a different patient from 15 spread
 * across six, and the engine has always known which. The panel renders that.
 *
 * Two things can silently break it, and neither shows up in an engine test.
 * The first is DOUBLE RENDERING — the organ subscores are ordinary `ScoreValue`s,
 * so the flat value list shows them unless it is explicitly told not to, and the
 * panel below then repeats every one. The second is the bars becoming
 * load-bearing: they are `aria-hidden` by design and the `4 of 24` text is the
 * accessible content, the same contract the evidence chips keep. A refactor that
 * moved the number into the graphic would look identical in a screenshot.
 *
 * Service workers are blocked for this suite in `playwright.config.ts`.
 */

/** Values that drive every pSOFA organ to a different, non-zero subscore. */
const PSOFA_FRAGMENT =
  "#age_months=60;pao2=180;spo2=95;fio2=0.5;resp_support=true;platelets=100" +
  ";bilirubin=2;map=60;dopamine=5;dobutamine=5;epinephrine=0.1" +
  ";norepinephrine=0.1;gcs=12;creatinine=1";

/** The organs pSOFA declares, with the subscore the fragment above produces. */
const PSOFA_ORGANS = [
  ["Respiratory subscore", 1],
  ["Coagulation subscore", 1],
  ["Hepatic subscore", 2],
  ["Cardiovascular subscore", 3],
  ["Neurologic subscore", 2],
  ["Renal subscore", 1],
] as const;

const RESULT = '[data-print="result"]';

/**
 * Strip everything hidden from the a11y tree, then read what is left.
 *
 * The live region is removed too: it is `sr-only`, it restates every emitted
 * value including the components, and leaving it in would make the
 * once-and-only-once count below pass no matter what the visible panel did.
 */
async function accessibleResultText(page: import("@playwright/test").Page) {
  return page.locator(RESULT).evaluate((el) => {
    const clone = el.cloneNode(true) as HTMLElement;
    clone.querySelectorAll('[aria-hidden="true"], .sr-only').forEach((n) => n.remove());
    return clone.innerText.replace(/\s+/g, " ");
  });
}

/**
 * The composition rows as a screen reader would receive them: label and value
 * read off the `dt`/`dd` pair, from a tree with everything hidden removed.
 *
 * Structural rather than a substring of `innerText`, because the row is a
 * two-column grid — `innerText` puts no separator at all between the label and
 * the value in headless Chromium, so "Motor (M) 1 of 6" is not a substring of a
 * panel that is displaying exactly that. Reading the cells asserts the same
 * thing without depending on how the layout is flattened to text.
 */
async function accessibleRows(page: import("@playwright/test").Page) {
  return page.locator(RESULT).evaluate((el) => {
    const clone = el.cloneNode(true) as HTMLElement;
    clone.querySelectorAll('[aria-hidden="true"], .sr-only').forEach((n) => n.remove());
    return [...clone.querySelectorAll("dl > div")].map((row) => ({
      label: row.querySelector("dt")?.textContent?.trim() ?? "",
      value: row.querySelector("dd")?.textContent?.replace(/\s+/g, " ").trim() ?? "",
    }));
  });
}

/**
 * Load a calculator with values already in the fragment.
 *
 * The fragment IS this app's field state — it is how a shared link restores a
 * form — so this is a real entry path rather than a test-only shortcut. It also
 * asserts the fields actually took the values: if an input id is ever renamed,
 * the fragment would silently decode to nothing and every assertion below would
 * be checking an empty form.
 */
async function openWithValues(
  page: import("@playwright/test").Page,
  slug: string,
  fragment: string,
) {
  await page.goto(`/calculators/${slug}${fragment}`);
  /* The form reads the fragment ONCE, on mount, and owns its state from then on
     — after that it only writes the fragment back. So navigating between two
     fragments of the SAME calculator is a same-document navigation that mounts
     nothing and leaves the previous values on screen. Reloading is what makes
     each call actually apply its own values. */
  await page.reload();
  await expect(page.locator(RESULT)).toContainText("What makes up this total");

  for (const [id] of fragment
    .slice(1)
    .split(";")
    .map((p) => p.split("="))) {
    await expect(page.locator(`#field-${id}`), `#field-${id} is not on the page`).toHaveCount(1);
  }
}

test.describe("composition panel", () => {
  test("pSOFA shows each of its six organ components exactly once", async ({ page }) => {
    await openWithValues(page, "psofa", PSOFA_FRAGMENT);

    const rows = page.locator(`${RESULT} dl > div`);
    await expect(rows).toHaveCount(PSOFA_ORGANS.length);

    // THE REGRESSION THIS FILE EXISTS FOR. The organ subscores are ordinary
    // emitted values, so the flat list above renders them too unless filtered —
    // and "once" is the assertion, not "at least once".
    //
    // Asserted STRUCTURALLY first. pSOFA emits seven values and only the total
    // belongs in the flat list; the other six belong to the panel. Counting the
    // blocks catches the duplication even when the flat list is not labelling
    // them, which is the case a text search cannot see.
    const flat = page.locator(`${RESULT} [data-result-values]`);
    await expect(flat, "the flat value list is rendering the organ subscores too").toHaveAttribute(
      "data-result-values",
      "1",
    );
    await expect(flat.locator("> div")).toHaveCount(1);

    // Then by the words a screen reader actually receives, over the whole panel.
    const text = await accessibleResultText(page);
    for (const [organ] of PSOFA_ORGANS) {
      const occurrences = text.split(organ).length - 1;
      expect(occurrences, `"${organ}" appears ${occurrences}x in the result panel`).toBe(1);
    }

    // Each row states its value against its own maximum, in words.
    for (const [organ, value] of PSOFA_ORGANS) {
      await expect(rows.filter({ hasText: organ })).toContainText(`${value} of 4`);
    }
  });

  test("the proportion bars are hidden from assistive technology", async ({ page }) => {
    await openWithValues(page, "psofa", PSOFA_FRAGMENT);

    const bars = page.locator(`${RESULT} .chip-meter`);
    await expect(bars).toHaveCount(PSOFA_ORGANS.length);

    // Fails with the count of offenders rather than stopping at the first,
    // which is what you want when the point is that NONE may be announced.
    const exposed = await bars.evaluateAll(
      (els) => els.filter((e) => !e.closest('[aria-hidden="true"]')).length,
    );
    expect(exposed, "a proportion bar is being announced as well as drawn").toBe(0);

    // The other half of the contract: with every bar gone the numbers survive.
    // A bar that became the sole carrier of its value would pass the check
    // above and fail here.
    expect(
      await accessibleRows(page),
      "a row lost its label or value once the bars were removed",
    ).toEqual(PSOFA_ORGANS.map(([label, value]) => ({ label, value: `${value} of 4` })));
  });

  test("a component at its floor draws an empty bar, not a partial one", async ({ page }) => {
    // pGCS is the only composition with a non-zero `min`: its components are
    // 1-4, 1-5 and 1-6 and never 0. Drawn from zero, a motor score of 1 would
    // render a sixth full when it is in fact the floor — the bar would overstate
    // the patient. This is arithmetic no engine test can see and no
    // accessibility test can reach, because the bar is aria-hidden by design.
    await openWithValues(page, "pediatric-gcs", "#gcs_eye=1;gcs_verbal=1;gcs_motor=1");

    const fills = await page
      .locator(`${RESULT} .chip-meter`)
      .evaluateAll((els) => els.map((e) => getComputedStyle(e).getPropertyValue("--fill").trim()));
    expect(fills, "a component at its minimum is drawing a non-empty bar").toEqual(["0", "0", "0"]);

    // The floor is drawn as empty but never REPORTED as empty.
    expect(await accessibleRows(page), "a floored component under-reported itself").toEqual([
      { label: "Eye-opening (E)", value: "1 of 4" },
      { label: "Verbal / vocal (V)", value: "1 of 5" },
      { label: "Motor (M)", value: "1 of 6" },
    ]);

    // And the span still maps: mid-range and maximum must not also read zero,
    // which is what a `min` subtracted twice would produce.
    await openWithValues(page, "pediatric-gcs", "#gcs_eye=4;gcs_verbal=3;gcs_motor=6");
    const spread = await page
      .locator(`${RESULT} .chip-meter`)
      .evaluateAll((els) => els.map((e) => getComputedStyle(e).getPropertyValue("--fill").trim()));
    expect(spread, "4 of 4, 3 of 5 and 6 of 6 must fill full, half and full").toEqual([
      "1",
      "0.5",
      "1",
    ]);
  });

  test("the panel introduces no horizontal scroll at 320px", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 800 });

    for (const [slug, fragment] of [
      ["psofa", PSOFA_FRAGMENT],
      ["pediatric-gcs", "#gcs_eye=4;gcs_verbal=3;gcs_motor=6"],
    ] as const) {
      await openWithValues(page, slug, fragment);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow, `/calculators/${slug} scrolls sideways at 320px`).toBeLessThanOrEqual(0);
    }
  });
});
