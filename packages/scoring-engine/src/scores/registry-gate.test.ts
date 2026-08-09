import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { registry } from "./registry";
import { boundaryValues } from "../testing/harness";
import { isVisible } from "../visibility";
import type { ScoreDefinition } from "../types";

/**
 * A minimal valid input vector, built from each input's own declared domain.
 * Deliberately dumb: it exists to make `compute` return, not to be clinically
 * meaningful, and every assertion above is about ids rather than values.
 */
function sampleInputs(s: ScoreDefinition): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const i of s.inputs) {
    if (i.type === "numeric") out[i.id] = { value: i.min, unit: i.unit.canonical };
    else if (i.type === "boolean") out[i.id] = { value: false };
    else out[i.id] = { value: i.options[0]!.value };
  }
  return out;
}

/**
 * The minimal vector, plus one variant per input pushed off its floor.
 *
 * A single all-minimum vector is a weak place to check an arithmetic identity:
 * it can score an undeclared organ 0 and let `0 === 0` pass for it, which is
 * exactly the case the identity below exists to catch. Moving one input at a
 * time keeps every other term fixed, so any subscore that responds to any input
 * at all is non-zero in at least one vector.
 *
 * Still built only from each input's OWN declared domain — plausibility bounds
 * and declared options — so no vector asserts anything clinical, and none can
 * become stale against a score it does not know about.
 */
function sweepInputs(s: ScoreDefinition): Record<string, unknown>[] {
  const base = sampleInputs(s);
  const vectors = [base];
  for (const i of s.inputs) {
    if (i.type === "numeric") {
      // The largest ACCEPTED value, which is not `i.max` on an input with a
      // half-open ceiling — pushing 216 at PELOD-2's `maxExclusive: 216` would
      // be rejected, and the vector would silently drop out of the sweep below
      // instead of exercising the top of the range it was added for.
      const { bound } = boundaryValues(i, "max");
      vectors.push({ ...base, [i.id]: { value: bound, unit: i.unit.canonical } });
    } else if (i.type === "boolean") {
      vectors.push({ ...base, [i.id]: { value: true } });
    } else {
      for (const o of i.options.slice(1)) vectors.push({ ...base, [i.id]: { value: o.value } });
    }
  }
  return vectors;
}

/**
 * Crown-jewel structural gate (PRD §6.3): every registered score MUST have a
 * `<slug>.test.ts` that runs through `describeScore` — the harness that forces
 * a cited worked example and rejection coverage. Combined with the 100%
 * coverage gate (which forces the test to actually exercise the score), this
 * closes the "the floor is opt-in per test file" seam: a score cannot ship
 * with plain it() blocks that skip the citation/rejection floor.
 */
describe("registry §6.3 gate", () => {
  it("registers at least the P2 launch set", () => {
    expect(registry.length).toBeGreaterThanOrEqual(9);
  });

  it.each(registry.map((s) => s.slug))("score %s has a describeScore-driven test file", (slug) => {
    const src = readFileSync(join(__dirname, `${slug}.test.ts`), "utf8");
    expect(src, `${slug}.test.ts must run through describeScore (§6.3 floor)`).toMatch(
      /describeScore\s*\(/,
    );
  });

  /**
   * `version` must BE the newest changelog entry's version.
   *
   * /trust claims every score carries a version and a changelog, and the
   * detail page derives its "reviewed" date from the newest changelog entry —
   * so a score whose declared version is not the one that entry describes is
   * showing a review date for text it does not cover. Two scores had exactly
   * that: sf-ratio and phoenix gained new clinical paragraphs on 2026-08-01
   * while still declaring v1.0.0 dated 2026-07-25, so the page invited a
   * reviewer to sign off "v1.0.0, reviewed 2026-07-25" over different text
   * from the one that was reviewed.
   *
   * WHAT THIS DOES AND DOES NOT CATCH. It catches a bumped version with no
   * entry, an entry with no bump, and an entry added out of order. It does NOT
   * catch prose edited with neither touched — that needs a content hash over
   * the user-visible fields, which is a bigger mechanism (a committed manifest
   * plus a reseal script) and is deliberately not attempted here. This is the
   * part that is free.
   */
  it("every score's version is the newest entry in its own changelog", () => {
    for (const s of registry) {
      expect(s.changelog.length, `${s.slug} needs at least one changelog entry`).toBeGreaterThan(0);

      const dates = s.changelog.map((e) => e.date);
      const sortedDates = [...dates].sort((a, b) => a.localeCompare(b));
      expect(
        dates,
        `${s.slug}: changelog must read oldest-first so "newest" is unambiguous`,
      ).toEqual(sortedDates);

      const newest = s.changelog[s.changelog.length - 1];
      expect(
        s.version,
        `${s.slug}: declares v${s.version} but its newest changelog entry is ` +
          `v${newest?.version} (${newest?.date}) — a version without an entry describing ` +
          `it means the page shows a review date for text that entry does not cover`,
      ).toBe(newest?.version);
    }
  });

  it("every score carries the honest two-slot validator tuple and a locator-able reference", () => {
    for (const s of registry) {
      expect(s.validators, `${s.slug} needs exactly two validator slots`).toHaveLength(2);
      expect(s.references.length, `${s.slug} needs at least one reference`).toBeGreaterThan(0);
      for (const ref of s.references) {
        const traceable = "pmid" in ref || "doi" in ref || "url" in ref;
        expect(traceable, `${s.slug} reference must be traceable (pmid/doi/url)`).toBe(true);
      }
    }
  });

  /**
   * A composition that names an id the score does not emit is invisible without
   * this: the panel renders one fewer row and nothing fails. These assertions
   * are the entire reason the maxima are declared rather than computed.
   *
   * INERT UNTIL THE FIRST COMPOSITION IS DECLARED. No score carries one yet, so
   * both loops `continue` on every score and `sampleInputs` never runs. Written
   * first on purpose — the gate exists before the thing it guards, so the first
   * declaration is checked the moment it lands rather than audited afterwards.
   */
  it("every declared composition names ids the score actually emits", () => {
    for (const s of registry) {
      if (!s.composition) continue;
      const outcome = s.compute(sampleInputs(s) as never);
      expect(outcome.ok, `${s.slug}: sample inputs did not compute`).toBe(true);
      if (!outcome.ok) continue;
      const emitted = new Set(outcome.result.values.map((v) => v.id));
      expect(
        emitted,
        `${s.slug}: composition.total "${s.composition.total}" is not emitted`,
      ).toContain(s.composition.total);
      for (const c of s.composition.components) {
        expect(emitted, `${s.slug}: component "${c.id}" is not emitted`).toContain(c.id);
      }
    }
  });

  /**
   * The OTHER direction: a value the score sums into its total but never
   * declares. Add a seventh pSOFA organ, forget the declaration, and the check
   * above is silent — the panel renders six rows, the flat list quietly filters
   * the seventh out, and the total no longer equals what is on screen.
   *
   * WHY AN IDENTITY AND NOT "EVERY EMITTED VALUE IS DECLARED".
   *
   * The obvious reverse of `declared ⊆ emitted` is `emitted ⊆ declared ∪ {total}`,
   * and it is not true of this corpus. PRISM and PELOD-2 emit
   * `mortality_probability`; Phoenix emits `sepsis` and `septic_shock`. All
   * three are legitimate outputs that are not parts of a total, so any check of
   * that shape needs an exception list.
   *
   * And the list could not be derived — it would have to be written by hand.
   * Nothing in a `ScoreValue` separates a derived output from a subscore:
   * Phoenix's two flags are integers carrying `unit: ""` and `precision: 0`,
   * structurally identical to an organ subscore, so a "non-integer or
   * unit-bearing values are exempt" rule would exempt neither and a
   * `["mortality_probability", "sepsis", "septic_shock"]` literal would need
   * editing by the next author to add a derived output — the same author who
   * just forgot to declare a component. A gate that has to be edited by the
   * person it is guarding against is not a gate.
   *
   * The sum identity needs no list and answers the real question. It also
   * happens to state the thing the panel promises: these rows ARE this total.
   * A derived output is not a summand, so it never enters the identity, and
   * adding one tomorrow requires no change here.
   *
   * `toBeCloseTo` rather than `toBe`: every composition in the corpus is
   * integer today, and this should not be the assertion that has to be
   * rewritten for the first score whose parts are not.
   */
  it("a composition's declared components add up to its total", () => {
    for (const s of registry) {
      if (!s.composition) continue;
      const { total: totalId, components } = s.composition;
      let checked = 0;
      let sawNonZeroTotal = false;

      for (const vector of sweepInputs(s)) {
        const outcome = s.compute(vector as never);
        // A vector that fails validation emits no values, so there is nothing
        // to check — not a failure of the identity. The base vector is asserted
        // to compute by the test above, so this can never skip everything
        // silently; `checked` below proves it did not.
        if (!outcome.ok) continue;
        const byId = new Map(outcome.result.values.map((v) => [v.id, v.value]));
        const total = byId.get(totalId);
        if (total === undefined) continue;
        const sum = components.reduce((acc, c) => acc + (byId.get(c.id) ?? 0), 0);
        expect(
          sum,
          `${s.slug}: components sum to ${sum} but the total is ${total} — ` +
            `a value summed into the total is missing from the composition`,
        ).toBeCloseTo(total, 10);
        if (total !== 0) sawNonZeroTotal = true;
        checked += 1;
      }

      expect(
        checked,
        `${s.slug}: no input vector computed, so nothing was checked`,
      ).toBeGreaterThan(0);
      // 0 === 0 across every vector would pass the identity while proving
      // nothing about it.
      expect(
        sawNonZeroTotal,
        `${s.slug}: every vector totalled 0, so the identity above is vacuous`,
      ).toBe(true);
    }
  });

  it("composition components declare a sane range", () => {
    for (const s of registry) {
      if (!s.composition) continue;
      for (const c of s.composition.components) {
        const min = c.min ?? 0;
        expect(c.max, `${s.slug}/${c.id}: max must exceed min`).toBeGreaterThan(min);
      }
    }
  });
});

/**
 * Structural gates on `showWhen`.
 *
 * `ScoreInput` is a non-generic union, so `showWhen.input` is a plain `string`
 * and the compiler cannot catch a typo in it. These four assertions are what
 * replaces that check — and the reason the condition is declarative data rather
 * than a predicate function, which none of them could read.
 *
 * One `it` per property so a failure names itself.
 */
describe("showWhen is structurally sound wherever it is declared", () => {
  const conditional = registry.flatMap((s) =>
    s.inputs.filter((i) => i.showWhen).map((i) => ({ s, i, cond: i.showWhen! })),
  );

  it("every showWhen names an input the same score declares", () => {
    for (const { s, i, cond } of conditional) {
      const ids = s.inputs.map((x) => x.id);
      expect(ids, `${s.slug}/${i.id}: showWhen names "${cond.input}"`).toContain(cond.input);
    }
  });

  it("every showWhen controller is categorical and itself unconditional", () => {
    // One level only. A chain would need a fixpoint to evaluate and a cycle
    // check to be safe; a single pass over the submitted values needs neither,
    // and this is what keeps that true.
    for (const { s, i, cond } of conditional) {
      const controller = s.inputs.find((x) => x.id === cond.input);
      expect(controller?.type, `${s.slug}/${i.id}: controller ${cond.input}`).toBe("categorical");
      expect(
        controller?.showWhen,
        `${s.slug}/${i.id}: controller ${cond.input} is itself conditional — chains are not evaluated`,
      ).toBeUndefined();
    }
  });

  it("every showWhen value is a declared option of its controller", () => {
    // A value matching no option hides the input forever, and silently: the
    // form simply never renders it and nothing else notices.
    for (const { s, i, cond } of conditional) {
      const controller = s.inputs.find((x) => x.id === cond.input);
      if (controller?.type !== "categorical") continue;
      const values = controller.options.map((o) => o.value);
      expect(cond.equals.length, `${s.slug}/${i.id}: equals is empty`).toBeGreaterThan(0);
      for (const v of cond.equals) {
        expect(values, `${s.slug}/${i.id}: equals "${v}"`).toContain(v);
      }
    }
  });

  it("no conditional input is required", () => {
    // A hidden required input is an uncomputable score. `runValidation` skips
    // it before the required check, so it would be silently exempt — and if
    // that skip were ever removed, `missing-required` would fire forever on a
    // field that is not in the DOM, killing the total and both subscores.
    for (const { s, i } of conditional) {
      expect(i.required, `${s.slug}/${i.id}: showWhen may not be combined with required`).toBe(
        false,
      );
    }
  });
});

/**
 * The general detector: a hidden input's value cannot move a number.
 *
 * `sweepInputs` supplies EVERY declared input unconditionally, so it already
 * constructs the illegal state this change forbids — no hand-maintained list,
 * for the reason given above: a gate that has to be edited by the person it is
 * guarding against is not a gate.
 *
 * BE HONEST ABOUT ITS REACH ON PRISM. It passes today even without the skip in
 * `runValidation`, because PRISM's `calculate` returns before every read of the
 * four covariates. It binds for the next score that gates an input its
 * `calculate` actually reads. The assertion that binds NOW is the key-absence
 * test in validation.test.ts, stated against the object `calculate` receives.
 */
describe("hidden inputs cannot change what a score emits", () => {
  const otherLegalValue = (i: ScoreDefinition["inputs"][number]): unknown => {
    if (i.type === "numeric") return { value: i.max, unit: i.unit.canonical };
    if (i.type === "boolean") return { value: true };
    return { value: i.options[i.options.length - 1]!.value };
  };

  it("perturbing a hidden input leaves the whole result identical", () => {
    for (const s of registry) {
      const gated = s.inputs.filter((i) => i.showWhen);
      if (gated.length === 0) continue;
      for (const vector of sweepInputs(s)) {
        for (const i of gated) {
          if (isVisible(i, vector)) continue;
          const perturbed = { ...vector, [i.id]: otherLegalValue(i) };
          expect(s.compute(perturbed as never), `${s.slug}/${i.id}`).toEqual(
            s.compute(vector as never),
          );
        }
      }
    }
  });
});
