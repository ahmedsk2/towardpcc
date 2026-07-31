import { expect, test } from "@playwright/test";

/**
 * The hero figure.
 *
 * Two scenes have now been retired here. First a canvas waveform, then six
 * organ-system planes stacked in depth. The figure is now a child's heart and
 * lungs in CSS 3D: 544 particles and six stroked pleural outlines, generated on
 * the server from the geometry in lib/hero-cardiopulm and asserted there.
 *
 * What each rewrite has kept, because none of it was ever really about the
 * scene that happened to be in the hero:
 *
 *  - No 3D library. The original pulled ~874 KB of three.js. The right number
 *    is zero, and a reintroduction should fail loudly rather than quietly cost
 *    every visitor most of a megabyte.
 *  - No canvas. Same reason.
 *  - Reduced motion holds a COMPOSED still, not a flat or empty one.
 *  - preserve-3d actually survives. It is easy to lose to a stray
 *    `overflow-hidden` or `filter` on an ancestor, and the failure is silent:
 *    the figure keeps rendering, just flat.
 *
 * What is new, because this scene can fail in ways the stack could not: the
 * geometry is server-rendered and only four custom properties are animated, so
 * both halves of that split need holding in place.
 */
test.describe("hero figure", () => {
  test("renders the cardiopulmonary scene, separated in depth", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("load");

    const scene = await page.evaluate(() => {
      const frame = document.querySelector(".cps-frame");
      const world = document.querySelector(".cps-world");
      if (!frame || !world) return null;
      const particles = Array.from(frame.querySelectorAll<HTMLElement>(".cps-g > i"));
      const depths = new Set(
        particles.map((el) => {
          const m = new DOMMatrixReadOnly(getComputedStyle(el).transform);
          return Math.round(m.m43);
        }),
      );
      return {
        particles: particles.length,
        groups: frame.querySelectorAll(".cps-g").length,
        shells: frame.querySelectorAll(".cps-shell").length,
        chambers: frame.querySelectorAll(".cps-chamber").length,
        preserve3d: getComputedStyle(world).transformStyle,
        worldTransformed: getComputedStyle(world).transform !== "none",
        perspective: getComputedStyle(document.querySelector(".cps-stage")!).perspective,
        distinctDepths: depths.size,
      };
    });

    expect(scene, "expected the scene in the DOM").not.toBeNull();
    expect(scene!.particles).toBeGreaterThan(400);
    expect(scene!.shells, "three nested pleural outlines per lung").toBe(6);
    expect(scene!.chambers, "four cardiac chambers").toBe(4);

    // The performance argument rests on grouping: per-frame cost scales with
    // the number of elements whose style changes, not with particle count.
    expect(scene!.groups).toBeLessThan(100);

    expect(scene!.preserve3d, "preserve-3d is lost — the scene will render flat").toBe(
      "preserve-3d",
    );
    expect(scene!.worldTransformed, "the scene is not rotated into perspective").toBe(true);
    expect(scene!.perspective, "no perspective — the depth is wasted").not.toBe("none");
    // Particles genuinely occupy different depths rather than one plane.
    expect(scene!.distinctDepths, "particles are not separated in Z").toBeGreaterThan(20);
  });

  test("lays the scene out proportionally, with nothing escaping the frame", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("load");

    // Positions are percentages and depths are container units, so the figure
    // must track its card at any width. An earlier build scaled the world with
    // calc(100cqw / 340), which resolves to a LENGTH where scale() needs a
    // number — the browser dropped the declaration and the scene rendered with
    // no transform and no perspective at all.
    for (const width of [320, 520, 760]) {
      const overflow = await page.evaluate((w) => {
        const frame = document.querySelector<HTMLElement>(".cps-frame")!;
        const card = frame.parentElement!;
        const previous = card.style.width;
        card.style.width = `${w}px`;
        const box = frame.getBoundingClientRect();
        const escaped = Array.from(frame.querySelectorAll<HTMLElement>(".cps-g > i")).filter(
          (el) => {
            const r = el.getBoundingClientRect();
            return (
              r.left < box.left - 2 ||
              r.right > box.right + 2 ||
              r.top < box.top - 2 ||
              r.bottom > box.bottom + 2
            );
          },
        ).length;
        const aspect = box.width / box.height;
        card.style.width = previous;
        return { escaped, aspect };
      }, width);

      expect(overflow.escaped, `particles escaped the frame at ${width}px`).toBe(0);
      expect(overflow.aspect, `aspect drifted at ${width}px`).toBeCloseTo(340 / 440, 2);
    }
  });

  test("the figure carries an accessible description", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("load");

    // The 3D construction is aria-hidden on purpose: its reading order is a
    // stacking order, which means nothing out loud. The caption is the route.
    const caption = page.locator("figure figcaption");
    await expect(caption).toHaveCount(1);
    await expect(caption).not.toBeEmpty();
    await expect(page.locator(".cps-frame")).toHaveAttribute("aria-hidden", "true");
  });

  test("reduced motion holds a composed still rather than freezing at zero", async ({
    browser,
  }) => {
    const ctx = await browser.newContext({ reducedMotion: "reduce" });
    try {
      const page = await ctx.newPage();
      await page.goto("/");
      await page.waitForLoadState("load");

      const before = await page.evaluate(() => {
        const f = document.querySelector<HTMLElement>(".cps-frame")!;
        const s = getComputedStyle(f);
        return {
          breath: Number(s.getPropertyValue("--breath")),
          beat: Number(s.getPropertyValue("--beat")),
          wave: Number(s.getPropertyValue("--wave")),
          running: document.getAnimations().filter((a) => a.playState === "running").length,
        };
      });

      // A composed pose, not frame zero: lungs full and a heart perfused, so a
      // reader who never sees this move still sees something alive.
      expect(before.breath).toBeGreaterThan(0.5);
      expect(before.beat).toBeGreaterThan(1);
      expect(before.wave).toBeGreaterThan(0);
      expect(before.running, "nothing may animate under reduced motion").toBe(0);

      // And it must STAY there — the driver must not have mounted at all.
      await page.waitForTimeout(900);
      const after = await page.evaluate(() => {
        const s = getComputedStyle(document.querySelector<HTMLElement>(".cps-frame")!);
        return {
          breath: Number(s.getPropertyValue("--breath")),
          beat: Number(s.getPropertyValue("--beat")),
        };
      });
      expect(after.breath, "the scene moved under reduced motion").toBe(before.breath);
      expect(after.beat, "the scene moved under reduced motion").toBe(before.beat);
    } finally {
      await ctx.close();
    }
  });

  test("the geometry is server-rendered, not built in the browser", async ({ page }) => {
    // 544 particles must arrive as HTML. If they ever start being constructed
    // client-side, the route pays for the geometry twice and the scene pops in
    // after hydration instead of being there on first paint.
    const response = await page.request.get("/");
    const html = await response.text();
    const particles = (html.match(/class="cps-g[^"]*"/g) ?? []).length;
    expect(particles, "groups are missing from the server HTML").toBeGreaterThan(50);
    expect(html).toContain("cps-shell");
  });

  test("no 3D library and no canvas is downloaded for the hero", async ({ page }) => {
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
    await expect(page.locator("canvas")).toHaveCount(0);
  });
});
