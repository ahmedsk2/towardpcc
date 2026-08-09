import { describe, expect, it } from "vitest";
import { defineText } from "./i18n/text";
import type { ScoreInput } from "./types";
import { isVisible, visibleInputs } from "./visibility";

const controller: ScoreInput = {
  id: "window",
  label: defineText("window", "Window"),
  required: true,
  type: "categorical",
  options: [
    { value: "a", label: defineText("a", "A") },
    { value: "b", label: defineText("b", "B") },
  ],
};

const gated: ScoreInput = {
  id: "extra",
  label: defineText("extra", "Extra"),
  required: false,
  type: "boolean",
  showWhen: { input: "window", equals: ["a"] },
};

const ungated: ScoreInput = {
  id: "always",
  label: defineText("always", "Always"),
  required: false,
  type: "boolean",
};

/**
 * One case per branch, because this package gates at 100% branches and because
 * the two "malformed controller" branches are the ones a reader is most likely
 * to assume behave the other way.
 */
describe("isVisible", () => {
  it("shows an input that declares no condition, whatever the values hold", () => {
    expect(isVisible(ungated, {})).toBe(true);
    expect(isVisible(ungated, { window: { value: "b" } })).toBe(true);
  });

  it("shows a gated input when the controller holds a listed value", () => {
    expect(isVisible(gated, { window: { value: "a" } })).toBe(true);
  });

  it("hides a gated input when the controller holds an unlisted value", () => {
    expect(isVisible(gated, { window: { value: "b" } })).toBe(false);
  });

  it("hides a gated input when the controller is absent", () => {
    expect(isVisible(gated, {})).toBe(false);
  });

  it("hides a gated input when the controller is explicitly null", () => {
    expect(isVisible(gated, { window: null })).toBe(false);
  });

  it("hides a gated input when the controller's value is not a string", () => {
    // An unanswered categorical, a numeric mistakenly used as controller, and a
    // hand-built payload all land here. Hiding is the safe direction: it can
    // only ever withhold a number, never invent one.
    expect(isVisible(gated, { window: { value: 4 } })).toBe(false);
    expect(isVisible(gated, { window: {} })).toBe(false);
  });
});

describe("visibleInputs", () => {
  it("keeps the unconditional inputs and drops the unsatisfied ones", () => {
    const all = [controller, ungated, gated];
    expect(visibleInputs(all, { window: { value: "a" } }).map((i) => i.id)).toEqual([
      "window",
      "always",
      "extra",
    ]);
    expect(visibleInputs(all, { window: { value: "b" } }).map((i) => i.id)).toEqual([
      "window",
      "always",
    ]);
  });
});
