import { defineScore } from "../define-score";
import { defineText } from "../i18n/text";
import { mmhgWithKpa } from "../units/pressure";
import { NO_UNIT } from "../units/types";

/**
 * NON-CLINICAL internal fixture used only to test the engine plumbing and
 * harness. It computes an arithmetic ratio — deliberately not a medical
 * score, never registered, status stays "draft" forever.
 */
export const fixtureScore = defineScore({
  id: "fixture-ratio",
  slug: "fixture-ratio",
  name: "Engine test fixture (arithmetic ratio)",
  tagline: defineText("fixture.tagline", "Internal engine fixture, never displayed"),
  version: "1.0.0",
  status: "draft",
  category: "general",
  inputs: [
    {
      id: "numerator",
      label: defineText("fixture.numerator", "Numerator pressure"),
      required: true,
      type: "numeric",
      unit: mmhgWithKpa,
      min: 10,
      max: 700,
    },
    {
      id: "mode",
      label: defineText("fixture.mode", "Mode"),
      required: true,
      type: "categorical",
      options: [
        { value: "plain", label: defineText("fixture.mode.plain", "Plain") },
        { value: "doubled", label: defineText("fixture.mode.doubled", "Doubled") },
      ],
    },
    {
      id: "invert",
      label: defineText("fixture.invert", "Invert result"),
      required: false,
      type: "boolean",
    },
    {
      id: "factor",
      label: defineText("fixture.factor", "Scale factor"),
      required: false,
      type: "numeric",
      unit: NO_UNIT,
      min: 0,
      max: 10,
    },
  ] as const,
  interpretation: [
    {
      id: "low",
      appliesTo: "ratio",
      min: null,
      max: 100,
      label: defineText("fixture.band.low", "Below 100"),
      description: defineText("fixture.band.low.desc", "Fixture band below 100."),
    },
    {
      id: "high",
      appliesTo: "ratio",
      min: 100,
      max: null,
      label: defineText("fixture.band.high", "100 or above"),
      description: defineText("fixture.band.high.desc", "Fixture band at or above 100."),
    },
  ],
  references: [
    {
      citation: "Internal engine fixture — arithmetic identity, not a clinical score.",
      url: "about:blank",
    },
  ],
  validators: [{ status: "pending" }, { status: "pending" }],
  changelog: [
    { version: "1.0.0", date: "2026-07-25", summary: "Fixture.", reason: "initial-release" },
  ],
  ipStatus: { kind: "original-formula" },
  notes: defineText("fixture.notes", "Internal test fixture. Never displayed."),
  calculate: (values) => {
    const base =
      values.numerator.value *
      (values.mode.value === "doubled" ? 2 : 1) *
      (values.factor?.value ?? 1);
    const result = values.invert?.value === true ? 1 / base : base;
    return [
      {
        id: "ratio",
        label: defineText("fixture.output.ratio", "Ratio"),
        value: result,
        unit: "",
        precision: 1,
      },
    ];
  },
});
