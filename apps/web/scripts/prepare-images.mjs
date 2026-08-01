/* global process, console */
/**
 * Downscale and install the site photography.
 *
 * The supplied originals are stock-resolution (one is 6500x4338 / 36 MB) — far
 * too heavy for a tool used at the bedside on hospital wifi. This renders each
 * through Chromium at a sane web width and writes a JPEG, the same trick the
 * icon generator uses (sharp has no Windows-ARM64 binary on the dev box).
 *
 * Re-run after replacing a source:  node scripts/prepare-images.mjs
 */
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const here = dirname(fileURLToPath(import.meta.url));
const OUT = join(here, "..", "public", "images");
const SRC = join(process.env.USERPROFILE ?? process.env.HOME ?? "", "Downloads");

/** width: target CSS width. cropTo: optional [w,h] aspect crop (cover). */
const JOBS = [
  { src: "OG.png", out: "og-waveform.jpg", width: 1200, cropTo: [1200, 630] },
  { src: "Designer 1.png", out: "brand-waveform.jpg", width: 1200 },
  { src: "33513.jpg", out: "care-teddy-oxygen.jpg", width: 1400 },
  { src: "young-sick-girl-staying-hospital.jpg", out: "care-nurse-smiling.jpg", width: 1400 },
  { src: "Screenshot 2026-07-27 162938.png", out: "care-thermometer.jpg", width: 1242 },
  {
    src: "portrait-tired-sick-child-sleeping-after-suffering-medical-recovery-surgery.jpg",
    out: "care-resting.jpg",
    width: 900,
  },
  { src: "image-1785163481760.png", out: "library-screenshot.jpg", width: 1400 },
  /**
   * /services replacement, PENDING THE SOURCE FILE.
   *
   * That page currently shows `care-thermometer.jpg` — a clinician taking a
   * child's temperature — while its subject is study design, IRB guidance and
   * biostatistics. It is the one photograph on the site whose subject does not
   * match its page, so it is being replaced with researchers reading
   * statistical output (Envato Elements PQBLD6T, licensed under the account's
   * subscription).
   *
   * This job is inert until the file exists: save the download to Downloads as
   * `services-statistics.jpg` and re-run. The page still points at
   * `care-thermometer.jpg` and is switched over once this produces output, so
   * merging in between cannot swap a real photograph for a placeholder.
   */
  { src: "services-statistics.jpg", out: "services-statistics.jpg", width: 1400 },
  /**
   * Registry dashboard. The source shows that unit's real operating figures —
   * year-to-date admissions, bed occupancy above 100%, live census and dated
   * admissions. Those are not ours to publish, and labelling real numbers
   * "illustrative" would be a lie. So the sensitive regions are cropped away
   * instead: this window keeps the sidebar and the admissions/discharges chart,
   * which shows what the product looks like without asserting anything about a
   * real unit's performance.
   */
  {
    src: "Screenshot 2026-07-27 170852.png",
    out: "registry-dashboard.jpg",
    width: 1200,
    sourceCrop: { x: 0, y: 180, w: 1000, h: 850 },
  },
];

mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch();

for (const job of JOBS) {
  const srcPath = join(SRC, job.src);
  if (!existsSync(srcPath)) {
    console.log(`SKIP  ${job.out} — source not found: ${job.src}`);
    continue;
  }
  const page = await browser.newPage();
  // Chromium refuses to load file:// sub-resources from a setContent page, so
  // the harness HTML is written next to the sources and navigated to directly —
  // then a relative src is same-origin and loads.
  const harness = join(SRC, "__resize-harness.html");
  const rel = encodeURIComponent(job.src);
  writeFileSync(
    harness,
    `<body style="margin:0;background:#000"><img id="i" src="${rel}" style="display:block"></body>`,
  );
  await page.goto("file:///" + harness.replace(/\\/g, "/"));
  await page.waitForFunction(() => {
    const el = document.getElementById("i");
    return el && el.complete && el.naturalWidth > 0;
  });
  const nat = await page.evaluate(() => {
    const el = document.getElementById("i");
    return { w: el.naturalWidth, h: el.naturalHeight };
  });

  // A sourceCrop selects a window of the ORIGINAL before scaling, so regions
  // can be excluded outright rather than merely shrunk.
  const src = job.sourceCrop ?? { x: 0, y: 0, w: nat.w, h: nat.h };
  const outW = Math.min(job.width, src.w);
  const outH = job.cropTo
    ? Math.round((outW * job.cropTo[1]) / job.cropTo[0])
    : Math.round((outW * src.h) / src.w);

  await page.setViewportSize({ width: outW, height: outH });
  await page.evaluate(
    ({ w, h, c }) => {
      const el = document.getElementById("i");
      const scale = w / c.w;
      Object.assign(document.body.style, {
        margin: "0",
        width: `${w}px`,
        height: `${h}px`,
        overflow: "hidden",
        position: "relative",
      });
      Object.assign(el.style, {
        position: "absolute",
        width: `${el.naturalWidth * scale}px`,
        height: `${el.naturalHeight * scale}px`,
        left: `${-c.x * scale}px`,
        top: `${-c.y * scale}px`,
        maxWidth: "none",
      });
    },
    { w: outW, h: outH, c: src },
  );

  const buf = await page.screenshot({
    type: "jpeg",
    quality: 82,
    clip: { x: 0, y: 0, width: outW, height: outH },
  });
  writeFileSync(join(OUT, job.out), buf);
  console.log(
    `OK    ${job.out.padEnd(26)} ${nat.w}x${nat.h} -> ${outW}x${outH}  ${Math.round(buf.length / 1024)}KB`,
  );
  await page.close();
}

await browser.close();
