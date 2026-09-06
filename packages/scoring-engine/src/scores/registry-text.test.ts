import { describe, expect, it } from "vitest";
import { registry } from "./registry";

/**
 * Text the catalogue and the form render, held to a shape (2026-09-06).
 *
 * A tagline is the one line a card shows under the name; it has to be short
 * enough for a three-column grid and say what the score is FOR. Help text
 * sits behind an info toggle on the form, and the toggle is only an
 * improvement if what it opens can be read in one glance — the cap is 70
 * words, chosen because the seven longest entries (74–223 words) all
 * condensed to that length without dropping a rule, threshold or prohibition.
 */
describe("registry text", () => {
  it("every score carries a tagline: 20–90 characters, no trailing full stop, unique", () => {
    const seen = new Set<string>();
    for (const s of registry) {
      const t = s.tagline.en.trim();
      expect(t.length, `${s.slug}: "${t}"`).toBeGreaterThanOrEqual(20);
      expect(t.length, `${s.slug}: "${t}"`).toBeLessThanOrEqual(90);
      expect(t.endsWith("."), `${s.slug} tagline ends with a full stop`).toBe(false);
      expect(seen.has(t), `${s.slug} duplicates another tagline`).toBe(false);
      seen.add(t);
    }
  });

  it("no field help exceeds 70 words", () => {
    const over: string[] = [];
    for (const s of registry) {
      for (const input of s.inputs) {
        const words = input.helpText?.en.trim().split(/\s+/).length ?? 0;
        if (words > 70) over.push(`${s.slug}.${input.id} (${words})`);
      }
    }
    expect(over).toEqual([]);
  });
});
