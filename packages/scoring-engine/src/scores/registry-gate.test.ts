import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { registry } from "./registry";
import { sampleInputs, sweepInputs, sweepWithOmissions } from "../testing/sample-inputs";
import { isVisible } from "../visibility";
import type { ScoreDefinition } from "../types";

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
 * Structural gates on `ValueNotice`.
 *
 * Same problem `showWhen` has: `notice.about` is a plain `string`, so a typo
 * compiles, renders nothing next to any field, and looks exactly like a score
 * that declares no notice at all. And a notice is only worth anything if it is
 * CONDITIONAL — one attached to every result is a `caution` wearing the wrong
 * type, and readers learn to skip it.
 *
 * Both directions are gated across the whole registry, and a third assertion
 * requires that some score emits one somewhere, so a rename cannot leave these
 * passing vacuously over an empty set.
 */
describe("value notices are structurally sound wherever they are emitted", () => {
  /**
   * `sweepInputs` supplies EVERY declared input, so a condition of the form
   * "this optional input is ABSENT" is unreachable through it — and that is
   * the shape every notice has, because a notice explains a value that an
   * entered figure failed to reach. So each swept vector is also re-run with
   * one optional input dropped. The saturating-SpO₂ notice needs an SpO₂ above
   * 97 AND no PaO₂, which is exactly one perturbation plus one omission.
   *
   * Required inputs are never dropped: their absence is a rejection, not a
   * result, and `compute` would return `ok: false` with nothing to inspect.
   */
  const noticeVectors = sweepWithOmissions;

  const emitted = registry.flatMap((s) =>
    noticeVectors(s).flatMap((vector) => {
      const outcome = s.compute(vector as never);
      if (!outcome.ok) return [];
      return outcome.result.values
        .filter((v) => v.notice)
        .map((v) => ({ s, valueId: v.id, notice: v.notice! }));
    }),
  );

  it("some score emits a notice, or the two assertions below prove nothing", () => {
    expect(emitted.length).toBeGreaterThan(0);
  });

  it("every notice.about names an input the same score declares", () => {
    for (const { s, valueId, notice } of emitted) {
      if (notice.about === undefined) continue;
      const ids = s.inputs.map((i) => i.id);
      expect(ids, `${s.slug}/${valueId}: notice.about names "${notice.about}"`).toContain(
        notice.about,
      );
    }
  });

  it("every notice carries non-empty text", () => {
    for (const { s, valueId, notice } of emitted) {
      expect(
        notice.text.en.trim().length,
        `${s.slug}/${valueId}: empty notice text`,
      ).toBeGreaterThan(0);
    }
  });

  it("no notice is unconditional — each score that emits one also has a vector without it", () => {
    // A notice present on EVERY vector is not explaining these values; it is a
    // score-level caution in the wrong field, and it would train readers to
    // ignore the ones that do mean something.
    const emitters = new Set(emitted.map((e) => e.s.slug));
    for (const s of registry) {
      if (!emitters.has(s.slug)) continue;
      const clean = noticeVectors(s).some((vector) => {
        const outcome = s.compute(vector as never);
        return outcome.ok && outcome.result.values.every((v) => !v.notice);
      });
      expect(clean, `${s.slug}: every swept vector carries a notice — that is a caution`).toBe(
        true,
      );
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

/**
 * Structural gates on `derived`.
 *
 * The composition gate asserts an IDENTITY — components sum to the total —
 * across a per-input sweep. A derived output is not a summand, so it can never
 * enter that identity, and a copy of that gate would be wrong here in a way
 * that looks right: `sampleInputs` picks `options[0]`, which on PRISM is the
 * 4-hour window, and `false` for every boolean, so the base vector DOES emit a
 * probability. The copy would pass on the base vector and fail across the
 * sweep, once the window moves.
 *
 * So the behavioural gate below is ONE-DIRECTIONAL: if the value is emitted,
 * its declared sources must be emitted too. Conditional emission is expected
 * and is not a defect.
 */
describe("derived outputs are structurally sound wherever they are declared", () => {
  const declaredDerived = registry.flatMap((s) => (s.derived ? [{ s, d: s.derived }] : []));

  it("requires a composition, because `from` names component ids", () => {
    for (const { s } of declaredDerived) {
      expect(s.composition, `${s.slug}: derived without composition`).toBeDefined();
    }
  });

  it("names at least one source, and every source is a declared component", () => {
    for (const { s, d } of declaredDerived) {
      const componentIds = (s.composition?.components ?? []).map((c) => c.id);
      expect(d.from.length, `${s.slug}: derived.from is empty`).toBeGreaterThan(0);
      for (const src of d.from) {
        expect(componentIds, `${s.slug}: derived.from names "${src}"`).toContain(src);
      }
    }
  });

  it("is not itself a component or the total — a derived value is not a summand", () => {
    // Declaring it as a component would put it into the sum identity, where it
    // does not belong and would break every worked example. Declaring the total
    // as the derived id would hide the total behind its own consequence.
    for (const { s, d } of declaredDerived) {
      const componentIds = (s.composition?.components ?? []).map((c) => c.id);
      expect(componentIds, `${s.slug}/${d.id}`).not.toContain(d.id);
      expect(d.id, `${s.slug}: derived id equals the composition total`).not.toBe(
        s.composition?.total,
      );
      expect(d.from, `${s.slug}: derived.from contains its own id`).not.toContain(d.id);
    }
  });

  it("emits its declared sources whenever it emits the value itself", () => {
    // One-directional, for the reason above. This is what would catch a derived
    // output rendering a number whose stated working is not on the page.
    for (const { s, d } of declaredDerived) {
      for (const vector of sweepInputs(s)) {
        const r = s.compute(vector as never);
        if (!r.ok) continue;
        const ids = new Set(r.result.values.map((v) => v.id));
        if (!ids.has(d.id)) continue;
        for (const src of d.from) {
          expect(ids.has(src), `${s.slug}: emitted ${d.id} without ${src}`).toBe(true);
        }
      }
    }
  });

  it("is emitted by the score at least once across the sweep", () => {
    // Otherwise a typo in `id` declares a block that can never render, and
    // every assertion above passes vacuously.
    for (const { s, d } of declaredDerived) {
      const everEmitted = sweepInputs(s).some((vector) => {
        const r = s.compute(vector as never);
        return r.ok && r.result.values.some((v) => v.id === d.id);
      });
      expect(everEmitted, `${s.slug}: nothing ever emits "${d.id}"`).toBe(true);
    }
  });
});

/**
 * A spelling variant must genuinely be one.
 *
 * `sameUnitSpelling` removes a unit from the form's toggle while keeping it
 * accepted. That is only safe if the conversion really is the identity — used
 * on a REAL conversion it would hide a choice that changes the number, which is
 * the opposite of the safety problem it was added to fix. So the flag is not
 * taken on trust: it is checked against the arithmetic.
 */
describe("units marked as spelling variants convert identically", () => {
  it("round-trips every sameUnitSpelling conversion unchanged", () => {
    const probes = [0, 0.0003, 0.5, 1, 7.25, 100, 12345.678];
    let checked = 0;
    for (const s of registry) {
      for (const i of s.inputs) {
        if (i.type !== "numeric") continue;
        for (const a of i.unit.alternates ?? []) {
          if (!a.sameUnitSpelling) continue;
          checked += 1;
          for (const v of probes) {
            expect(a.toCanonical(v), `${s.slug}/${i.id}: ${a.unit} toCanonical(${v})`).toBe(v);
            expect(a.fromCanonical(v), `${s.slug}/${i.id}: ${a.unit} fromCanonical(${v})`).toBe(v);
          }
        }
      }
    }
    // Otherwise this passes vacuously the day someone removes the last one.
    expect(
      checked,
      "no sameUnitSpelling conversions found — is the flag still used?",
    ).toBeGreaterThan(0);
  });
});
