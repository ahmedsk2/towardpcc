import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Threat-model TM-001 static guard: the calculator privacy invariant.
 * Calculator inputs must never reach the server — so nothing under the
 * calculator routes may use the query string (`useSearchParams`/`searchParams`)
 * or a server action (`"use server"`). Shareable state lives only in the URL
 * fragment, which the browser never sends. This is the executable half of the
 * invariant the threat model asked to "start now"; the Playwright zero-network
 * compute assertion is the runtime half (P3 e2e).
 */
// `(site)` is a route group: it changes no URL, but it does change this
// path. TM-001 scans the calculator sources, so it has to follow them or it
// silently scans nothing.
const CALC_DIR = join(__dirname, "..", "app", "(site)", "calculators");
const CALC_COMPONENTS = join(__dirname, "..", "components", "calculator");

function collectTs(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...collectTs(full));
    else if (/\.(ts|tsx)$/.test(entry)) out.push(full);
  }
  return out;
}

describe("TM-001 calculator privacy invariant (static guard)", () => {
  const files = [...collectTs(CALC_DIR), ...collectTs(CALC_COMPONENTS)];

  it("finds the calculator source files", () => {
    expect(files.length).toBeGreaterThan(0);
  });

  it.each(files)("%s does not read the query string or use a server action", (file) => {
    const src = readFileSync(file, "utf8");
    expect(
      src,
      `${file} must not use useSearchParams (query string reaches server logs)`,
    ).not.toMatch(/useSearchParams|\bsearchParams\b/);
    expect(
      src,
      `${file} must not declare a server action (would post inputs to the server)`,
    ).not.toMatch(/["']use server["']/);
  });
});
