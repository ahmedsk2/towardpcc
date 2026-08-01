/**
 * Deterministic route-JS budget gate (PRD §10: "route JS ≤ 170 KB gzipped
 * excluding the lazy hero chunk").
 *
 * Why this instead of Lighthouse's resource-summary: Lighthouse reports the
 * over-the-wire transfer size, which depends on whether the server compresses
 * (`next start` does not, a CDN would) — so it can't reliably enforce a budget
 * stated in *gzipped* bytes. This reads the prerendered HTML for each route,
 * gzips exactly the scripts a modern browser downloads (skipping the `nomodule`
 * polyfills chunk it never fetches), and compares against the budget. The
 * number is a property of the build, not of the runner or the server.
 *
 * Run after `next build`. Exits non-zero if any route is over budget.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { gzipSync } from "node:zlib";

const NEXT = ".next";
const BUDGET_BYTES = 170 * 1024;

/**
 * Routes to hold to the budget. `excludeChunks` lists substrings of chunk
 * filenames that are lazily loaded and excluded from First Load JS (e.g. the
 * P4 R3F hero, which is next/dynamic-imported and has its own ≤300 KB budget).
 */
const ROUTES = [
  // Home first-load excludes the R3F hero, which is next/dynamic-imported and
  // so never appears in these <script> tags (it has its own ≤300 KB budget).
  { label: "/ (home)", html: "server/app/index.html" },
  { label: "/calculators", html: "server/app/calculators.html" },
  { label: "/calculators/[slug]", html: "server/app/calculators/anion-gap.html" },
  // The evidence chips are server-rendered by design, so these two routes must
  // stay flat. They are here because the chip spec asserted "route JS
  // unchanged" and a one-off measurement found +0.2 KB — an assertion nobody
  // was checking. If a chip ever becomes a client component, this catches it.
  { label: "/trust", html: "server/app/trust.html" },
  { label: "/validation", html: "server/app/validation.html" },
];

const SCRIPT_TAG = /<script[^>]*\ssrc="\/_next\/(static\/[^"]+?\.js)"([^>]*)><\/script>/g;

function firstLoadGzip(html, excludeChunks = []) {
  let total = 0;
  const seen = new Set();
  let m;
  while ((m = SCRIPT_TAG.exec(html)) !== null) {
    const rel = m[1];
    const attrs = m[2];
    if (/\bnoModule\b/i.test(attrs)) continue; // modern browsers never fetch these
    if (excludeChunks.some((c) => rel.includes(c))) continue;
    if (seen.has(rel)) continue;
    seen.add(rel);
    const fp = join(NEXT, rel);
    if (existsSync(fp)) total += gzipSync(readFileSync(fp)).length;
  }
  return total;
}

let failed = false;
console.log(`Route JS budget: ${(BUDGET_BYTES / 1024).toFixed(0)} KB gzipped (PRD §10)\n`);
for (const route of ROUTES) {
  const p = join(NEXT, route.html);
  if (!existsSync(p)) {
    console.error(`  MISSING  ${route.label} — no prerendered HTML at ${route.html}`);
    failed = true;
    continue;
  }
  const bytes = firstLoadGzip(readFileSync(p, "utf8"), route.excludeChunks);
  const kb = (bytes / 1024).toFixed(1);
  const ok = bytes <= BUDGET_BYTES;
  if (!ok) failed = true;
  console.log(`  ${ok ? "PASS" : "OVER"}  ${route.label.padEnd(24)} ${kb} KB`);
}

if (failed) {
  console.error("\nRoute JS budget exceeded — trim the first-load bundle (PRD §10).");
  process.exit(1);
}
console.log("\nAll routes within the 170 KB gzipped budget.");
