import { expect, test } from "@playwright/test";

// The real home page is parked at /home while `/` serves the pre-launch
// holding page. This spec tests home-page content, so it follows the content.

/**
 * The evidence rail is the site's testimonial-killer — the section that says
 * "we don't have testimonials, we have the literature" — so it is worth it
 * behaving like a finished control rather than a bare overflow container.
 *
 * Three things it lacked, each asserted here:
 *   - no sense of position: the scrollbar is hidden, so nothing said how many
 *     citations there were or which one you were on;
 *   - arrows stayed enabled at both extremes, where clicking does nothing, and
 *     a control that accepts a click and changes nothing reads as broken;
 *   - `aria-controls` on both arrows pointed at an id that did not exist.
 */
test.describe("evidence rail", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/home");
    // `networkidle`, not just `load`. The service worker registers on load and
    // then reloads the page to take control; interacting before that reload
    // means the click scrolls the rail, the reload resets it to the start, and
    // the indicator returns to where it began — so the "it moved" assertion
    // fails for a reason that has nothing to do with the rail. Waiting for the
    // network to settle lets the SW's reload happen first. This is the same
    // reload the layout suite works around with a scrollHeight poll.
    await page.waitForLoadState("networkidle");
    await page.locator("#evidence-track").scrollIntoViewIfNeeded();
  });

  test("the arrows point at a track that exists", async ({ page }) => {
    const arrows = page.getByRole("button", { name: /previous|next/i });
    await expect(arrows).toHaveCount(2);
    for (const id of await arrows.evaluateAll((els) =>
      els.map((e) => e.getAttribute("aria-controls")),
    )) {
      expect(id).toBeTruthy();
      await expect(page.locator(`#${id}`)).toHaveCount(1);
    }
  });

  test("shows one position indicator per citation", async ({ page }) => {
    const cards = page.locator("#evidence-track > li");
    const dots = page.locator('ol button[aria-controls="evidence-track"]');
    const count = await cards.count();
    expect(count).toBeGreaterThan(1);
    await expect(dots).toHaveCount(count);
  });

  test("marks exactly one indicator current, and it moves when you scroll", async ({ page }) => {
    const current = page.locator('ol button[aria-controls="evidence-track"][aria-current="true"]');
    await expect(current).toHaveCount(1);
    const before = await current.getAttribute("aria-label");

    await page.getByRole("button", { name: /next/i }).click();

    /**
     * Polled, not waited.
     *
     * This was a fixed 600ms sleep followed by a single assertion. It passed on
     * a developer machine for weeks and then failed on a CI runner — the rail
     * scrolls smoothly and the indicator is driven by an IntersectionObserver,
     * so settling time depends entirely on how busy the machine is. A test that
     * fails once in twenty is worse than no test: the fix people reach for is
     * "re-run CI", and a suite that gets re-run stops being believed.
     *
     * Both conditions are checked inside the poll rather than after it, because
     * mid-scroll there is a moment with zero or two current indicators, and an
     * assertion that lands in that window fails for the wrong reason.
     */
    await expect
      .poll(
        async () => {
          // The service worker can reload the page out from under an in-flight
          // evaluate, which destroys the execution context and throws — not a
          // product failure, but it took the whole suite red about one run in
          // twenty. layout.spec.ts already guards its evaluate this way; this
          // one polled but still let the throw escape, so the retry it was
          // built around never got a chance to run.
          let labels: (string | null)[];
          try {
            labels = await current.evaluateAll((els) =>
              els.map((el) => el.getAttribute("aria-label")),
            );
          } catch {
            return null; // context destroyed mid-navigation — poll again
          }
          // The accessible name is the citation source, so a change proves the
          // indicator tracks the real scroll position rather than a counter.
          return labels.length === 1 && labels[0] !== before ? labels[0] : null;
        },
        {
          timeout: 5000,
          message:
            "the current-position indicator never moved after pressing next — either the rail did not scroll or the indicator is not following it",
        },
      )
      .not.toBeNull();
  });

  test("disables the arrow that would do nothing at each end", async ({ page }) => {
    const prev = page.getByRole("button", { name: /previous/i });
    const next = page.getByRole("button", { name: /next/i });

    await expect(prev, "previous should be disabled at the start").toBeDisabled();
    await expect(next).toBeEnabled();

    // Jump to the far end rather than clicking N times, so the test does not
    // depend on how many citations there happen to be. Assigning scrollLeft
    // directly rather than scrollTo({behavior}) — the smooth path is still
    // animating when the assertion runs.
    await page.locator("#evidence-track").evaluate((el) => {
      el.scrollLeft = el.scrollWidth;
    });

    await expect(next, "next should be disabled at the end").toBeDisabled();
    await expect(prev).toBeEnabled();
  });

  test("the track is reachable by keyboard", async ({ page }) => {
    // It is a scrollable region with no focusable children of its own, so it
    // needs its own tab stop or a keyboard user cannot scroll it at all.
    await expect(page.locator("#evidence-track")).toHaveAttribute("tabindex", "0");
  });
});
