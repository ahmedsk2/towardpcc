import { expect, test } from "@playwright/test";

/**
 * Figures the site publishes about itself must be right in the SERVED HTML,
 * before a line of JavaScript runs.
 *
 * The homepage counters were `useState(0)`, so the document contained
 * "0 Referenced calculators" and "0 calculators, live today". Everything that
 * reads a page without waiting for hydration got zero: crawlers, previews, text
 * extraction. An outside reviewer found it by extracting the homepage text,
 * which is precisely how a reader would have.
 *
 * `request.get` is deliberate and load-bearing. `page.goto` executes the
 * bundle, the counters animate to their real values, and the assertion passes
 * over the exact bug it exists to catch. This fetches the raw document instead.
 */

const isDigits = /^\d+$/;

test.describe("published figures in the served document", () => {
  // The counters live on the parked home page while `/` is the holding page.
  test("the home page counters carry real numbers, not zero", async ({ request }) => {
    const html = await (await request.get("/home")).text();
    const text = html.replace(/<script[\s\S]*?<\/script>/g, "").replace(/<[^>]+>/g, " ");

    for (const label of ["Referenced calculators", "calculators, live today"]) {
      const at = text.indexOf(label);
      expect(at, `"${label}" is not in the served document at all`).toBeGreaterThan(-1);
      const before = text.slice(Math.max(0, at - 40), at);
      const digits = before.match(/(\d[\d,]*)\s*$/);
      expect(digits, `no number precedes "${label}" in the served HTML`).not.toBeNull();
      const n = Number((digits?.[1] ?? "").replace(/,/g, ""));
      expect(
        n,
        `"${label}" is served as ${n} — the pre-hydration value must be real`,
      ).toBeGreaterThan(0);
    }
  });

  test("every page that states a calculator count states the same one", async ({ request }) => {
    // The About page said 23 while the index, trust and validation pages said
    // 25. The number itself is not asserted here — only that the site agrees
    // with itself, which is the property that went wrong and the one that
    // survives adding a 26th score.
    const seen = new Map<string, number[]>();
    for (const path of ["/", "/about", "/calculators", "/trust", "/validation"]) {
      const html = await (await request.get(path)).text();
      const text = html.replace(/<script[\s\S]*?<\/script>/g, "").replace(/<[^>]+>/g, " ");
      const counts = [...text.matchAll(/\b(\d+)\s+(?:[a-z]+\s+){0,3}calculators?\b/gi)]
        .map((m) => Number(m[1]))
        .filter((n) => isDigits.test(String(n)) && n > 1);
      if (counts.length) seen.set(path, [...new Set(counts)]);
    }
    expect(
      seen.size,
      "no page stated a calculator count — has the wording changed?",
    ).toBeGreaterThan(0);
    const all = [...new Set([...seen.values()].flat())];
    expect(all, `pages disagree: ${JSON.stringify(Object.fromEntries(seen))}`).toHaveLength(1);
  });

  test("no page shows a reader an unresolved count token", async ({ request }) => {
    // SCRIPTS STRIPPED FIRST, and that is not a loosening. Next serialises the
    // copy object into the RSC payload, so the raw token is legitimately in the
    // document inside a <script> where no reader meets it. A first draft of this
    // test asserted against the whole document and went red on exactly that,
    // reporting a bug in the page when the bug was in the test.
    for (const path of ["/", "/about"]) {
      const html = await (await request.get(path)).text();
      const text = html.replace(/<script[\s\S]*?<\/script>/g, "").replace(/<[^>]+>/g, " ");
      expect(text, `${path} printed the token instead of the number`).not.toContain(
        "{liveCalculators}",
      );
    }
  });
});
