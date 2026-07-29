import { describe, expect, it } from "vitest";
import { MIN_FILL_MS, classifyDrop } from "./submission-guards";

const NOW = 1_800_000_000_000;
/** A stamp that fills for `ms` before submitting. */
const filledFor = (ms: number) => String(NOW - ms);

const good = { honeypot: null, stamp: filledFor(MIN_FILL_MS * 2), now: NOW };

describe("classifyDrop", () => {
  it("lets a genuine submission through", () => {
    expect(classifyDrop(good)).toBeNull();
  });

  it("drops a filled honeypot", () => {
    expect(classifyDrop({ ...good, honeypot: "http://spam.example" })).toBe("honeypot");
  });

  it("treats an empty honeypot as untouched", () => {
    // Browsers submit the field as "" when a real user leaves it alone, so an
    // empty string must not be mistaken for a bot filling it in.
    expect(classifyDrop({ ...good, honeypot: "" })).toBeNull();
  });

  it("reports the honeypot first when both gates would fire", () => {
    expect(classifyDrop({ honeypot: "spam", stamp: null, now: NOW })).toBe("honeypot");
  });

  it("drops a submission that arrived faster than a human could type", () => {
    expect(classifyDrop({ ...good, stamp: filledFor(MIN_FILL_MS - 1) })).toBe("too-fast");
  });

  it("accepts a fill of exactly the minimum", () => {
    // The boundary is inclusive; a fill of exactly MIN_FILL_MS is a pass, so a
    // one-millisecond drift cannot silently start discarding real messages.
    expect(classifyDrop({ ...good, stamp: filledFor(MIN_FILL_MS) })).toBeNull();
  });

  it("drops a stamp from the future rather than treating it as a slow fill", () => {
    // Negative elapsed time would otherwise sail past a `> MIN_FILL_MS` check.
    expect(classifyDrop({ ...good, stamp: String(NOW + 60_000) })).toBe("too-fast");
  });

  // The regression this module exists for: a visitor whose JavaScript never ran
  // submits `t` at its rendered default of "0". Before this split, that landed
  // in the same branch as a bot and returned success with nothing written, and
  // nothing anywhere recorded that it had happened.
  describe("no-timestamp — the real-visitor case", () => {
    it.each([
      ["the rendered default", "0"],
      ["an absent field", null],
      ["an empty field", ""],
      ["a non-numeric field", "abc"],
    ])("is distinguished from a bot for %s", (_label, stamp) => {
      expect(classifyDrop({ ...good, stamp })).toBe("no-timestamp");
    });

    it("never reports no-timestamp as too-fast", () => {
      // The two must stay separable: one means the form is broken for humans,
      // the other means the anti-bot gate is working. Conflating them would
      // bury a site-wide outage inside an expected-noise metric.
      const reasons = ["0", null, "", "abc"].map((stamp) => classifyDrop({ ...good, stamp }));
      expect(reasons).not.toContain("too-fast");
    });
  });
});
