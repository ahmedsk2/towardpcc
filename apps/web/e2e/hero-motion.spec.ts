import { expect, test, devices, type Page } from "@playwright/test";

/**
 * Hero motion guard.
 *
 * The animated hero shipped and then silently stopped running. The scene was
 * enabled only when `prefers-reduced-motion` was false AND the viewport was
 * wider than 768px AND `pointer: coarse` was false AND WebGL was available.
 * On a touchscreen laptop the pointer check fails, so no canvas was ever
 * created: production had zero canvas elements and exactly one running
 * animation on the whole page — an 8px pulsing dot.
 *
 * Nothing caught it, because "the hero animates" was never asserted. It is now,
 * including on the device class it actually failed on.
 */

/** Reduces the canvas to one number, so frames can be compared without
 *  shipping pixel buffers across the wire. */
const SAMPLE = `(() => {
  const c = document.querySelector('canvas');
  if (!c) return null;
  const ctx = c.getContext('2d');
  const d = ctx.getImageData(0, 0, c.width, c.height).data;
  let sum = 0, lit = 0;
  for (let i = 0; i < d.length; i += 4 * 97) {
    sum += d[i] + d[i + 1] + d[i + 2];
    if (d[i + 3] > 8) lit++;
  }
  return { sum, lit };
})()`;

type Sample = { sum: number; lit: number } | null;

/**
 * Collects N distinct frame signatures.
 *
 * Retried as a whole because the PWA service worker can reload the page
 * mid-evaluate and destroy the execution context — the same hazard
 * layout.spec.ts and image-crop.spec.ts document.
 *
 * Scrolls the canvas into view first: the loop is deliberately paused while
 * off-screen, and on a phone the hero scene stacks below the heading and CTAs.
 * Measuring without scrolling would measure the pause, not the animation.
 */
async function sampleFrames(page: Page, count: number, gapMs: number): Promise<number[]> {
  let lastError = "unknown";
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      await page.locator("canvas").scrollIntoViewIfNeeded();
      // The chunk is lazy, so the element exists before it has drawn anything.
      await expect
        .poll(async () => ((await page.evaluate(SAMPLE)) as Sample)?.lit ?? 0, { timeout: 10_000 })
        .toBeGreaterThan(100);

      const sums: number[] = [];
      for (let i = 0; i < count; i++) {
        const s = (await page.evaluate(SAMPLE)) as Sample;
        if (!s || s.lit <= 100) throw new Error("canvas went blank mid-measurement");
        sums.push(s.sum);
        await page.waitForTimeout(gapMs);
      }
      return sums;
    } catch (e) {
      lastError = String(e);
      await page.waitForTimeout(600);
    }
  }
  throw new Error(`could not sample the hero canvas after 4 attempts: ${lastError}`);
}

test.describe("hero motion", () => {
  test("the hero canvas animates continuously", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("load");

    await expect(page.locator("canvas"), "the hero should mount an animated canvas").toHaveCount(1);

    const sums = await sampleFrames(page, 4, 250);
    // Every frame distinct: a static render repeats. This is the assertion
    // that would have failed for the hero as shipped.
    expect(new Set(sums).size, `expected 4 distinct frames, got ${JSON.stringify(sums)}`).toBe(4);
  });

  test("it still animates on a touchscreen, the device class it failed on", async ({ browser }) => {
    // `pointer: coarse` is exactly what disabled the old scene.
    const context = await browser.newContext({ ...devices["Pixel 7"] });
    const page = await context.newPage();
    try {
      await page.goto("/");
      await page.waitForLoadState("load");

      expect(
        await page.evaluate(() => matchMedia("(pointer: coarse)").matches),
        "this context should report a coarse pointer, or the test proves nothing",
      ).toBe(true);

      await expect(page.locator("canvas")).toHaveCount(1);

      const sums = await sampleFrames(page, 3, 300);
      expect(
        new Set(sums).size,
        `the hero is static on a touch device: ${JSON.stringify(sums)}`,
      ).toBe(3);
    } finally {
      await context.close();
    }
  });

  test("reduced motion shows the poster and never mounts the canvas", async ({ browser }) => {
    const context = await browser.newContext({ reducedMotion: "reduce" });
    const page = await context.newPage();
    try {
      await page.goto("/");
      await page.waitForLoadState("load");
      // motion.md rule 1: the hero is poster-only under reduced motion.
      await expect(page.locator("canvas")).toHaveCount(0);
      // The poster is still there, so the hero is never empty.
      await expect(page.locator('svg[role="img"]').first()).toBeVisible();
    } finally {
      await context.close();
    }
  });

  test("no three.js is downloaded for the hero", async ({ page }) => {
    // The scene used to pull ~874 KB of three.js. Canvas 2D needs none of it,
    // and a stray re-introduction should fail loudly rather than quietly cost
    // every visitor most of a megabyte.
    const scripts: string[] = [];
    page.on("response", (r) => {
      if (r.request().resourceType() === "script") scripts.push(r.url());
    });
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const bodies = await Promise.all(
      scripts.map(async (url) => {
        try {
          return await (await page.request.get(url)).text();
        } catch {
          return "";
        }
      }),
    );
    const offender = bodies.findIndex((b) => b.includes("WebGLRenderer") || b.includes("THREE."));
    expect(offender, `three.js found in ${scripts[offender] ?? ""}`).toBe(-1);
  });
});

/**
 * The pause behaviours, asserted negatively.
 *
 * All three already exist in waveform-canvas.tsx — IntersectionObserver drives
 * an `active` prop, a visibilitychange listener stops the loop, and devicePixelRatio
 * is capped at 2. None of them was tested. The spec above proves the animation
 * RUNS, and its helper deliberately scrolls the canvas into view to work around
 * the off-screen pause rather than asserting it — so every one of these guards
 * could have been deleted and the suite would have stayed green.
 *
 * The tab-hide listener in particular is a day old, added in the Canvas 2D
 * rewrite and absent from the WebGL scene before it. A new invariant with no
 * test is the one most likely to be refactored away by someone who cannot see
 * why it is there.
 */
test.describe("hero motion pauses when it should", () => {
  test("stops painting once scrolled out of view", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");
    await page.waitForLoadState("load");
    await expect(page.locator("canvas")).toHaveCount(1);

    // Let it start, so a still frame later means "stopped", not "never began".
    const first = await sampleFrames(page, 2, 200);
    expect(new Set(first).size, "the canvas never started").toBe(2);

    // Well past the hero, so the IntersectionObserver has fired.
    await page.evaluate(() => window.scrollTo(0, Math.round(document.body.scrollHeight * 0.75)));
    await page.waitForTimeout(500);

    const a = (await page.evaluate(SAMPLE)) as Sample;
    await page.waitForTimeout(700);
    const b = (await page.evaluate(SAMPLE)) as Sample;

    // The canvas keeps its last frame; what must stop is the repainting.
    expect(
      a?.sum,
      "the hero canvas is still painting while off-screen — it should pause and stop burning CPU",
    ).toBe(b?.sum);
  });

  test("stops painting when the tab is hidden", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");
    await page.waitForLoadState("load");

    const running = await sampleFrames(page, 2, 200);
    expect(new Set(running).size, "the canvas never started").toBe(2);

    // Emulate a backgrounded tab: override the getter and fire the event the
    // component listens for. Playwright cannot truly background a page.
    await page.evaluate(() => {
      Object.defineProperty(document, "visibilityState", {
        configurable: true,
        get: () => "hidden",
      });
      document.dispatchEvent(new Event("visibilitychange"));
    });
    await page.waitForTimeout(400);

    const a = (await page.evaluate(SAMPLE)) as Sample;
    await page.waitForTimeout(700);
    const b = (await page.evaluate(SAMPLE)) as Sample;

    expect(a?.sum, "the hero canvas keeps painting in a hidden tab").toBe(b?.sum);
  });

  test("caps the backing store at 2x so a 3x screen does not quadruple the fill cost", async ({
    browser,
  }) => {
    const context = await browser.newContext({
      deviceScaleFactor: 3,
      viewport: { width: 1440, height: 900 },
    });
    const page = await context.newPage();
    try {
      await page.goto("/");
      await page.waitForLoadState("load");
      await expect(page.locator("canvas")).toHaveCount(1);
      await sampleFrames(page, 2, 200);

      const scale = await page.evaluate(() => {
        const c = document.querySelector("canvas")!;
        return c.width / c.getBoundingClientRect().width;
      });
      expect(
        Math.round(scale * 10) / 10,
        `backing store is ${scale}x device pixels`,
      ).toBeLessThanOrEqual(2.1);
    } finally {
      await context.close();
    }
  });
});
