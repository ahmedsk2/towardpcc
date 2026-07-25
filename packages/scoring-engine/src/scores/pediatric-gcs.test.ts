import { describeScore } from "../testing/harness";
import { pediatricGcs } from "./pediatric-gcs";

// Every worked example is drawn from pgcs.md "Worked examples". Those vectors are
// derived step-by-step from the published summation formula total = E + V + M
// (Teasdale & Jennett 1974, PMID 4136544), with component wording per the
// James/PECARN descriptor tables. Integer points → exact match (no tolerance).
const gcsSum = {
  citation:
    "Teasdale G, Jennett B. Assessment of coma and impaired consciousness. Lancet. 1974;2(7872):81–84.",
  pmid: "4136544",
  doi: "10.1016/s0140-6736(74)91639-0",
};

describeScore(pediatricGcs, (ctx) => {
  // pgcs.md Example 1 — normal, alert 6-month-old infant: E4 + V5 + M6 = 15 (best possible).
  ctx.workedExample(
    { ...gcsSum, locator: "pgcs.md Worked example 1 (best possible, 15)" },
    {
      gcs_eye: { value: "4" },
      gcs_verbal: { value: "5" },
      gcs_motor: { value: "6" },
    },
    [{ id: "pgcs_total", value: 15 }],
  );

  // pgcs.md Example 2 — unresponsive infant: E1 + V1 + M1 = 3 (worst possible).
  ctx.workedExample(
    { ...gcsSum, locator: "pgcs.md Worked example 2 (worst possible, 3)" },
    {
      gcs_eye: { value: "1" },
      gcs_verbal: { value: "1" },
      gcs_motor: { value: "1" },
    },
    [{ id: "pgcs_total", value: 3 }],
  );

  // pgcs.md Example 3 — obtunded infant, painful-stimulus-only: E2 + V3 + M4 = 9.
  ctx.workedExample(
    { ...gcsSum, locator: "pgcs.md Worked example 3 (painful-stimulus-only, 9)" },
    {
      gcs_eye: { value: "2" },
      gcs_verbal: { value: "3" },
      gcs_motor: { value: "4" },
    },
    [{ id: "pgcs_total", value: 9 }],
  );

  // pgcs.md Example 4 — verbal child ≥2 y, confused: E3 + V4 + M5 = 12.
  ctx.workedExample(
    { ...gcsSum, locator: "pgcs.md Worked example 4 (verbal child, 12)" },
    {
      gcs_eye: { value: "3" },
      gcs_verbal: { value: "4" },
      gcs_motor: { value: "5" },
    },
    [{ id: "pgcs_total", value: 12 }],
  );

  // Categorical inputs have no numeric bounds — plausibility is enforced by the
  // fixed option set. An out-of-range level (0 or above the ceiling) is rejected
  // as invalid-category, one required rejection per required input (harness floor).
  // The value types are literal unions ("1".."4" etc.), so an out-of-set level is
  // itself a compile error — we cast past that to exercise the runtime rejection.
  type Inputs = Parameters<typeof ctx.rejectsImplausible>[1];

  ctx.rejectsImplausible(
    "an eye level below the 1–4 option set",
    {
      gcs_eye: { value: "0" },
      gcs_verbal: { value: "5" },
      gcs_motor: { value: "6" },
    } as unknown as Inputs,
    { inputId: "gcs_eye", code: "invalid-category" },
  );

  ctx.rejectsImplausible(
    "a verbal level above the 1–5 option set",
    {
      gcs_eye: { value: "4" },
      gcs_verbal: { value: "6" },
      gcs_motor: { value: "6" },
    } as unknown as Inputs,
    { inputId: "gcs_verbal", code: "invalid-category" },
  );

  ctx.rejectsImplausible(
    "a motor level above the 1–6 option set",
    {
      gcs_eye: { value: "4" },
      gcs_verbal: { value: "5" },
      gcs_motor: { value: "7" },
    } as unknown as Inputs,
    { inputId: "gcs_motor", code: "invalid-category" },
  );

  // Severity tri-band boundaries (pgcs.md interpretation: 3–8 / 9–12 / 13–15).
  ctx.interpretationBoundary("pgcs_total", 9, "severe", "moderate");
  ctx.interpretationBoundary("pgcs_total", 13, "moderate", "mild");
});
