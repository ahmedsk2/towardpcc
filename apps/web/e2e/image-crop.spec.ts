import { expect, test, type Page } from "@playwright/test";

/**
 * Image framing guard.
 *
 * `aspect-4/3.4` is not a valid Tailwind class — the fraction shorthand takes
 * integers — so it compiled to nothing, `aspect-ratio` resolved to `auto`, and
 * the container collapsed onto its caption at 581x99. `object-fit: cover` then
 * discarded 74-80% of four photographs across four pages, including a registry
 * dashboard rendered through a 99px slit.
 *
 * Nothing caught it: the class was silently dropped at build time, the markup
 * looked correct, and no test compared a rendered image against its source.
 * This does, covering both failure modes — an invalid ratio class (collapsed
 * box) and a valid one that simply does not match the asset (excessive crop).
 *
 * A deliberate crop is still allowed; it just has to be declared, with
 * data-crop="intentional" on the image's container.
 */
/**
 * `imageless: true` says the page is EXPECTED to render no images, so the
 * "at least one image" assertion is skipped for it — the crop checks still run
 * over whatever it does render.
 *
 * `/data` earned that flag on 2026-08-07. It carried a screenshot of the pilot
 * unit's Command Center showing their real dated admissions curve, published
 * without permission, and the image was pulled (see
 * `content/unpublished-imagery.test.ts`). The page is deliberately imageless
 * until a permitted replacement exists.
 *
 * Kept in the list rather than removed, and flagged rather than silently
 * exempted: if an image reappears on `/data`, the crop assertions below still
 * measure it, and the flag is a visible thing to delete when a permitted image
 * arrives. Dropping the page entirely would have removed both.
 */
const PAGES = [
  // `/` serves the pre-launch holding page, whose only figure is the
  // server-rendered cardiopulmonary mesh: no photography to crop. The home
  // page's images moved to /home with it.
  { path: "/", imageless: true },
  { path: "/home" },
  { path: "/about" },
  { path: "/knowledge" },
  { path: "/data", imageless: true },
  { path: "/services" },
] as const;

/** A photograph can lose a little to a container without harm. Past this it is
 *  no longer the picture that was chosen. */
const MAX_CROP = 0.12;

/** Below this a container has effectively collapsed rather than been sized. */
const MIN_RENDERED_HEIGHT = 80;

type Measured = {
  src: string;
  naturalWidth: number;
  naturalHeight: number;
  boxWidth: number;
  boxHeight: number;
  objectFit: string;
  intentional: boolean;
};

/**
 * Wait until the boxes this spec measures have stopped moving.
 *
 * THE RACE THIS CLOSES. `measure` reads `getBoundingClientRect()`, and
 * `next/image` with `fill` renders an absolutely-positioned `<img>` inside a
 * container that gets its size from an aspect-ratio class. Until that CSS
 * applies, the image's containing block is the initial one — the viewport — so
 * the box reads exactly the viewport size and a correctly framed portrait photo
 * looks like a 65% crop. Observed once in four full runs on 2026-08-08:
 * `/images/care-resting.jpg`, natural 640x1138, measured in "a 1440x900 box",
 * which is precisely the viewport set on the line below.
 *
 * WHY THE EXISTING RETRY DID NOT CATCH IT. That loop wraps a `try/catch` around
 * a service-worker context destruction. A measurement that succeeds too early
 * throws nothing, so the loop never engaged. This function throws on timeout,
 * which connects the two: a page that will not settle now fails the same way a
 * destroyed context does, and gets the same retry.
 *
 * WHY STABILITY RATHER THAN "NOT THE VIEWPORT SIZE". Asserting that no box
 * equals 1440x900 would encode this one signature and hold against nothing
 * else — and a legitimately full-bleed image would hang it forever. "The boxes
 * are the same as they were a moment ago" is a property of the page rather than
 * an absence of one known bad value, so it also covers a sizing bug nobody has
 * thought of yet. That shape is the root CLAUDE.md's own rule: assert a
 * property, not an absence.
 */
async function settleLayout(page: Page): Promise<void> {
  // Fonts first: a container sized in em/ch resizes when the webfont swaps in,
  // so measuring before that is measuring a different box.
  await page.evaluate(async () => {
    await document.fonts.ready;
  });

  await page.waitForFunction(
    () => {
      const w = window as unknown as { __tpccBoxes?: string };
      const now = [...document.querySelectorAll("img")]
        .map((i) => {
          const r = i.getBoundingClientRect();
          return `${Math.round(r.width)}x${Math.round(r.height)}`;
        })
        .join("|");
      const unchanged = w.__tpccBoxes === now;
      w.__tpccBoxes = now;
      // An imageless page settles immediately — "" equals "" on the second
      // poll — which is correct: /data is expected to render nothing.
      return unchanged;
    },
    undefined,
    { timeout: 15_000, polling: 250 },
  );
}

async function measure(page: Page): Promise<Measured[]> {
  // next/image lazy-loads below the fold, so nothing off-screen has decoded
  // yet. Walk the page to trigger them, then return to the top.
  await page.evaluate(async () => {
    const step = window.innerHeight;
    for (let y = 0; y < document.body.scrollHeight; y += step) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 120));
    }
    window.scrollTo(0, 0);
  });

  // AFTER the scroll walk, not before it: walking the page is what triggers the
  // lazy loads, and every one of them changes layout. Settling first would
  // settle the wrong page.
  await settleLayout(page);

  return page.evaluate(async () => {
    // next/image rewrites src to /_next/image?url=%2Fimages%2F… , so the asset
    // path is percent-encoded inside a query parameter and a plain
    // `img[src*="/images/"]` selector matches nothing at all.
    const assetPath = (img: HTMLImageElement): string | null => {
      const raw = img.currentSrc || img.src;
      if (!raw) return null;
      const url = new URL(raw, location.origin);
      const inner = url.searchParams.get("url");
      const path = inner ?? url.pathname;
      return path.startsWith("/images/") ? path : null;
    };

    const imgs = [...document.querySelectorAll<HTMLImageElement>("img")].filter(
      (i) => assetPath(i) !== null,
    );
    const out = [];
    for (const img of imgs) {
      // naturalWidth reads 0 when the page is not compositing frames, so fall
      // back to decoding the bytes rather than reporting a false 0x0 and
      // silently passing.
      let nw = img.naturalWidth;
      let nh = img.naturalHeight;
      if (!nw || !nh) {
        try {
          const blob = await (await fetch(img.currentSrc || img.src)).blob();
          const bmp = await createImageBitmap(blob);
          nw = bmp.width;
          nh = bmp.height;
          bmp.close();
        } catch {
          nw = 0;
          nh = 0;
        }
      }
      const rect = img.getBoundingClientRect();
      out.push({
        src: assetPath(img) ?? "(unknown)",
        naturalWidth: nw,
        naturalHeight: nh,
        boxWidth: Math.round(rect.width),
        boxHeight: Math.round(rect.height),
        objectFit: getComputedStyle(img).objectFit,
        intentional: !!img.closest('[data-crop="intentional"]'),
      });
    }
    return out;
  });
}

test.describe("image framing", () => {
  for (const { path, imageless } of PAGES.map((p) => ({ imageless: false, ...p }))) {
    test(`${path} renders every image without unintended cropping`, async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 900 });

      // The PWA service worker can reload the page mid-evaluate and destroy the
      // execution context (layout.spec.ts documents the same hazard). Retry the
      // whole navigate-and-measure cycle rather than measuring once and hoping.
      let measured: Measured[] | null = null;
      for (let attempt = 0; attempt < 4 && measured === null; attempt++) {
        try {
          await page.goto(path);
          await page.waitForLoadState("load");
          measured = await measure(page);
        } catch {
          await page.waitForTimeout(600);
        }
      }

      expect(measured, `could not measure ${path} without a service-worker reload`).not.toBeNull();
      const images = measured ?? [];
      if (imageless) {
        expect(images.length, `${path} is flagged imageless but rendered images`).toBe(0);
      } else {
        expect(images.length, `${path} should render at least one image`).toBeGreaterThan(0);
      }

      for (const m of images) {
        expect(m.naturalWidth, `could not decode ${m.src}`).toBeGreaterThan(0);

        // Catches the collapsed-container failure directly: an image box only
        // as tall as its caption means the ratio class never applied.
        expect(
          m.boxHeight,
          `${m.src} on ${path} rendered ${m.boxWidth}x${m.boxHeight} — the container looks collapsed, which is exactly what an invalid aspect class produces`,
        ).toBeGreaterThan(MIN_RENDERED_HEIGHT);

        if (m.objectFit === "contain" || m.intentional) continue;

        const boxAR = m.boxWidth / m.boxHeight;
        const imgAR = m.naturalWidth / m.naturalHeight;
        // cover crops whichever axis overflows the box.
        const crop = imgAR > boxAR ? 1 - boxAR / imgAR : 1 - imgAR / boxAR;

        expect(
          crop,
          `${m.src} on ${path} loses ${(crop * 100).toFixed(1)}% — natural ${m.naturalWidth}x${m.naturalHeight} (AR ${imgAR.toFixed(3)}) in a ${m.boxWidth}x${m.boxHeight} box (AR ${boxAR.toFixed(3)}). Match the container to the asset, use fit="contain", or declare data-crop="intentional".`,
        ).toBeLessThanOrEqual(MAX_CROP);
      }
    });
  }
});

/**
 * Authoring metadata must never reach a visitor — including via the
 * accessibility tree.
 *
 * ImageSlot renders a designed empty plate beneath the photograph so a missing
 * asset degrades to something deliberate rather than a broken-image icon. The
 * plate carried the asset's filename as a hint to whoever wired the slot up.
 *
 * That was invisible to sighted users (the loaded image occludes it completely)
 * but `aria-hidden` was applied only when `src` was ABSENT — inverted. So
 * exactly the slots that worked announced "Mission photograph,
 * care-nurse-smiling.jpg" to a screen reader, and the strings surfaced in
 * text extraction, reader mode and select-all.
 *
 * Checked through the accessibility tree rather than innerText, because the
 * defect lived there and a visual check would have missed it entirely.
 */
test.describe("no authoring metadata reaches the page", () => {
  const BANNED = [
    /save as public\//i,
    /\b[\w-]+\.(?:jpe?g|png|webp|avif|svg)\b/i,
    /public\/images\//i,
  ];

  for (const { path } of PAGES) {
    test(`${path} exposes no filenames or save-as notes`, async ({ page }) => {
      await page.goto(path);
      await page.waitForLoadState("load");

      // Everything a screen reader or a text scraper can reach.
      const exposed = await page.evaluate(() => {
        const bits: string[] = [];
        const walk = (node: Element) => {
          if (node.getAttribute("aria-hidden") === "true") return;
          for (const attr of ["aria-label", "alt", "title"]) {
            const v = node.getAttribute(attr);
            if (v) bits.push(v);
          }
          for (const child of node.children) walk(child);
        };
        walk(document.body);
        bits.push(document.body.innerText);
        return bits.join("\n");
      });

      for (const pattern of BANNED) {
        const hit = exposed.match(pattern);
        expect(
          hit?.[0] ?? null,
          `${path} exposes authoring metadata to assistive tech or text extraction: "${hit?.[0]}"`,
        ).toBeNull();
      }
    });
  }
});
