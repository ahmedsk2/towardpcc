import { expect, test } from "@playwright/test";

/**
 * The evidence chips on /trust and /validation.
 *
 * These exist because /trust described its proofs and showed none of them. The
 * risk that creates is the mirror image: a graphic that becomes the only place
 * a claim is stated, announced twice to a screen reader, or quietly turned into
 * a client component to make a number move.
 *
 * The spec committed to an e2e test asserting every chip is `aria-hidden` and
 * that its claim survives in the prose. That test did not exist — the chips
 * were checked by eye and shipped — which is precisely the "asserted once and
 * hoped" failure the /trust accessibility claim itself calls out. This is it.
 */

/** Strip everything hidden from the a11y tree, then read what is left. */
async function accessibleText(page: import("@playwright/test").Page) {
  return page.evaluate(() => {
    const clone = document.body.cloneNode(true) as HTMLElement;
    clone.querySelectorAll('[aria-hidden="true"]').forEach((n) => n.remove());
    return clone.innerText.replace(/\s+/g, " ");
  });
}

test.describe("evidence chips", () => {
  test("every chip on /trust is hidden from assistive technology", async ({ page }) => {
    await page.goto("/trust");
    const chips = page.locator("figure");
    await expect(chips).toHaveCount(5);
    // Not a loop over `toHaveAttribute`: this fails with the count of offenders
    // rather than stopping at the first, which is what you want when the whole
    // point is that NONE of them may be announced.
    const exposed = await chips.evaluateAll(
      (els) => els.filter((e) => e.getAttribute("aria-hidden") !== "true").length,
    );
    expect(exposed, "a chip is being announced as well as read in the prose").toBe(0);
  });

  test("no chip is the sole carrier of its claim", async ({ page }) => {
    await page.goto("/trust");
    const text = await accessibleText(page);

    // Each chip's claim, in the words a screen reader still receives with every
    // chip removed. The chip is redundant encoding; if any of these vanish, the
    // graphic has silently become load-bearing.
    expect(text, "zero-network claim").toContain("transmitted");
    expect(text, "coverage gate").toContain("100%");
    expect(text, "clinical review is pending").toMatch(/pending/i);
    expect(text, "accessibility target").toContain("WCAG 2.2 AA");
    expect(text, "citation count").toMatch(/\d+ calculators, \d+ citations/);
  });

  test("the chip and the heading cannot disagree", async ({ page }) => {
    await page.goto("/trust");

    // lib/evidence.ts exists so one module owns every figure. This is the
    // assertion that makes that worth having: the counts rendered in the
    // heading and the counts rendered in the chip are read back and compared.
    const heading = await page
      .getByRole("heading", { name: /calculators, .* citations/ })
      .innerText();
    const [, headingScores, headingCitations] = heading.match(
      /(\d+) calculators, (\d+) citations/,
    )!;

    const chip = page.locator("figure").filter({ hasText: "calculators published" });
    const figures = (await chip.innerText()).match(/\d+/g)!;

    expect(figures).toContain(headingScores);
    expect(figures).toContain(headingCitations);
  });

  test("the review chip renders zero rather than hiding", async ({ page }) => {
    await page.goto("/validation");
    const chip = page.locator("figure").filter({ hasText: /completed clinical review/i });
    await expect(chip).toHaveCount(1);

    // THE CASE THAT MATTERS MOST. Every reviewer slot is empty today. A
    // progress component that treats 0 as "nothing to display" would delete
    // the site's most honest claim. The track must render at full length with
    // nothing filled, and the count must be spelled out beside it.
    await expect(chip).toContainText(/0 of \d+/);

    // The track renders one segment per score with none filled — the empty
    // slot shown rather than omitted.
    const [segments, filled] = await chip
      .locator("[data-review-track] > span")
      .evaluateAll((els) => [
        els.length,
        els.filter((e) => e.className.includes("bg-accent")).length,
      ]);
    expect(segments).toBeGreaterThan(20);
    expect(filled, "a reviewer slot is rendering as filled").toBe(0);
  });

  test("chips introduce no horizontal scroll at 320px", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 800 });
    for (const route of ["/trust", "/validation"]) {
      await page.goto(route);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow, `${route} scrolls sideways at 320px`).toBeLessThanOrEqual(0);
    }
  });
});
