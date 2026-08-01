# Composite Score Composition Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show a clinician which components make up a composite score's total, and how much of the form they have filled in.

**Architecture:** A new optional `composition` block on `ScoreDefinition` names the total's value id and each component's id plus its instrument minimum and maximum. Three scores already emit their components and need only the declaration; two compute their parts and discard them, so their `calculate()` must emit new values first. The calculator result panel renders the components as `4 of 24` with a proportion bar, and a registry-wide structural test makes a mis-declared composition fail the build.

**Tech Stack:** pnpm monorepo; TypeScript strict with `exactOptionalPropertyTypes`; vitest with a 100% lines/branches/functions/statements gate on `packages/scoring-engine`; Playwright e2e; Next.js 16 App Router; Tailwind v4.

**Spec:** `docs/superpowers/specs/2026-08-01-composite-score-composition-design.md`

---

## Context an engineer needs before starting

**Run everything from the repo root** unless a command says otherwise. `pnpm test` runs every package; `cd packages/scoring-engine && npx vitest run src/scores/foo.test.ts` runs one file.

**The coverage gate is absolute.** `packages/scoring-engine/vitest.config.ts` sets all four thresholds to 100. Any line you add must be executed by a test or `pnpm test` fails. This is deliberate — do not lower it.

**`exactOptionalPropertyTypes` is on.** An optional property that may hold `undefined` must be declared `min?: number | undefined`, not `min?: number`. Getting this wrong produces a confusing assignability error.

**Score value ids are not consistent between scores.** pSOFA's total is `total`, Phoenix's is `phoenix_total`, PELOD-2's is `pelod2`, PRISM's is `prism_total`, pGCS's is `pgcs_total`. Never assume a naming convention; read the score.

**Never change a computed number in this plan.** Every task here adds metadata or emits values that were already being calculated internally. If a total changes, you have introduced a bug — the worked examples will catch it.

---

## File Structure

| File                                                       | Responsibility                                                                                    |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `packages/scoring-engine/src/types.ts`                     | Add `Composition` interface and the optional field on `ScoreDefinition`.                          |
| `packages/scoring-engine/src/scores/registry-gate.test.ts` | Registry-wide structural assertions for every declared composition.                               |
| `packages/scoring-engine/src/scores/psofa.ts`              | Declare composition (components already emitted).                                                 |
| `packages/scoring-engine/src/scores/phoenix.ts`            | Declare composition (components already emitted).                                                 |
| `packages/scoring-engine/src/scores/prism.ts`              | Declare composition (components already emitted).                                                 |
| `packages/scoring-engine/src/scores/pediatric-gcs.ts`      | Emit eye/verbal/motor, then declare composition.                                                  |
| `packages/scoring-engine/src/scores/pelod2.ts`             | Group the ten terms into five organ sums, emit them, declare composition.                         |
| `docs/research/scores/pelod2.md`                           | New: the transcribed Leteurtre 2013 Table 6, matching the convention of the other 21 scores.      |
| `apps/web/components/calculator/composition-panel.tsx`     | New: renders the component rows. Kept out of `calculator-form.tsx`, which is already ~1200 lines. |
| `apps/web/components/calculator/calculator-form.tsx`       | Render `<CompositionPanel>` and the completion counter.                                           |
| `apps/web/e2e/composition.spec.ts`                         | New: e2e for rendering, `aria-hidden`, and 320px.                                                 |

---

## Task 1: The `Composition` type

**Files:**

- Modify: `packages/scoring-engine/src/types.ts`

- [ ] **Step 1: Add the interface**

Add immediately above `export interface ScoreDefinition` in `packages/scoring-engine/src/types.ts`:

```ts
/**
 * How a composite total decomposes into named parts.
 *
 * The maxima live HERE, on the definition, rather than on the emitted
 * `ScoreValue` — a pSOFA respiratory subscore is 0–4 because the instrument
 * says so, not because of anything the patient's numbers did. Declaring it once
 * keeps `calculate()` free of repeated constants and gives `registry-gate` a
 * fixed thing to check every worked example against.
 *
 * `min` exists for the paediatric GCS, whose components are 1–4, 1–5 and 1–6
 * and never 0. A proportion bar drawn from zero would render a motor score of 1
 * as a sixth of its range when it is in fact the floor.
 */
export interface CompositionComponent {
  /** Must match a `ScoreValue.id` the score emits. */
  readonly id: string;
  /** Instrument maximum for this component. */
  readonly max: number;
  /** Instrument minimum. Defaults to 0 when absent. */
  readonly min?: number | undefined;
}

export interface Composition {
  /** Must match the `ScoreValue.id` carrying the total. */
  readonly total: string;
  readonly components: readonly CompositionComponent[];
}
```

- [ ] **Step 2: Add the optional field to `ScoreDefinition`**

In the same file, inside `export interface ScoreDefinition`, immediately after the `readonly notes: LocalizedText;` line, add:

```ts
  /**
   * Present only on scores whose total is the sum of named parts. Absent means
   * "not a composite" — the result panel then renders exactly as it does today.
   */
  readonly composition?: Composition;
```

- [ ] **Step 3: Verify it compiles**

Run: `pnpm typecheck`
Expected: all packages `Done`, no errors. Nothing declares a composition yet, so nothing else changes.

- [ ] **Step 4: Commit**

```bash
git add packages/scoring-engine/src/types.ts
git commit -m "feat(engine): add an optional Composition block to ScoreDefinition"
```

---

## Task 2: The structural gate

Write this **before** declaring any composition, so the first declaration is checked from the moment it exists.

**Files:**

- Modify: `packages/scoring-engine/src/scores/registry-gate.test.ts`

- [ ] **Step 1: Write the failing test**

Append inside the existing `describe("registry §6.3 gate", () => {` block in `packages/scoring-engine/src/scores/registry-gate.test.ts`, just before its closing `});`:

```ts
/**
 * A composition that names an id the score does not emit is invisible without
 * this: the panel renders one fewer row and nothing fails. These assertions
 * are the entire reason the maxima are declared rather than computed.
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

it("composition components declare a sane range", () => {
  for (const s of registry) {
    if (!s.composition) continue;
    for (const c of s.composition.components) {
      const min = c.min ?? 0;
      expect(c.max, `${s.slug}/${c.id}: max must exceed min`).toBeGreaterThan(min);
    }
  }
});
```

- [ ] **Step 2: Add the `sampleInputs` helper**

The gate needs a valid input vector per score. Add this above the `describe` block in the same file:

```ts
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
```

- [ ] **Step 3: Run it — it must pass trivially**

Run: `cd packages/scoring-engine && npx vitest run src/scores/registry-gate.test.ts`
Expected: PASS. No score declares a composition yet, so both loops are empty. This confirms the helper compiles and `compute` is callable before any real declaration depends on it.

- [ ] **Step 4: Commit**

```bash
git add packages/scoring-engine/src/scores/registry-gate.test.ts
git commit -m "test(engine): gate every declared composition against emitted ids"
```

---

## Task 3: Declare composition on pSOFA

**Files:**

- Modify: `packages/scoring-engine/src/scores/psofa.ts`
- Test: `packages/scoring-engine/src/scores/psofa.test.ts`

- [ ] **Step 1: Add the declaration**

In `packages/scoring-engine/src/scores/psofa.ts`, add this property to the score object, immediately before the `calculate:` property:

```ts
  composition: {
    total: "total",
    components: [
      { id: "respiratory", max: 4 },
      { id: "coagulation", max: 4 },
      { id: "hepatic", max: 4 },
      { id: "cardiovascular", max: 4 },
      { id: "neurologic", max: 4 },
      { id: "renal", max: 4 },
    ],
  },
```

Note the total id is `total`, not `psofa_total`. Confirm by reading the `point("total", ...)` call in the same file.

- [ ] **Step 2: Add the sum assertion to the score's suite**

Append inside the `describeScore(psofa, (ctx) => {` block in `packages/scoring-engine/src/scores/psofa.test.ts`, before its closing `});`:

```ts
/**
 * The composition must hold for EVERY input vector, not one. A declaration
 * can be right for a normal patient and wrong for a maximal one, which is
 * exactly the case a single spot-check misses.
 */
it("total equals the sum of its declared components, across the band sweep", () => {
  const vectors = [
    normal,
    { ...normal, pao2: { value: 250, unit: "mmHg" } },
    { ...normal, platelets: { value: 15, unit: "10^3/µL" } },
    { ...normal, bilirubin: { value: 13, unit: "mg/dL" } },
    { ...normal, gcs: { value: 5, unit: "" } },
    { ...normal, creatinine: { value: 3.0, unit: "mg/dL" } },
    { ...normal, age_months: { value: 0.5, unit: "months" }, map: { value: 20, unit: "mmHg" } },
  ];
  for (const v of vectors) {
    const outcome = psofa.compute(v as never);
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) continue;
    const get = (id: string) => outcome.result.values.find((x) => x.id === id)!.value;
    const sum = psofa.composition!.components.reduce((n, c) => n + get(c.id), 0);
    expect(sum, `components must sum to the total`).toBe(get(psofa.composition!.total));
    for (const c of psofa.composition!.components) {
      expect(get(c.id), `${c.id} above declared max`).toBeLessThanOrEqual(c.max);
      expect(get(c.id), `${c.id} below declared min`).toBeGreaterThanOrEqual(c.min ?? 0);
    }
  }
});
```

This file already imports `describe`/`expect`/`it` from vitest and defines `normal`; add `it` and `expect` to the import if the linter reports them missing.

- [ ] **Step 3: Run both suites**

Run: `cd packages/scoring-engine && npx vitest run src/scores/psofa.test.ts src/scores/registry-gate.test.ts`
Expected: PASS. If the sum assertion fails, the declaration is wrong — do not "fix" it by changing `calculate()`.

- [ ] **Step 4: Commit**

```bash
git add packages/scoring-engine/src/scores/psofa.ts packages/scoring-engine/src/scores/psofa.test.ts
git commit -m "feat(engine): declare pSOFA's six-organ composition"
```

---

## Task 4: Declare composition on Phoenix

**Files:**

- Modify: `packages/scoring-engine/src/scores/phoenix.ts`
- Test: `packages/scoring-engine/src/scores/phoenix.test.ts`

- [ ] **Step 1: Read the maxima off the primary table**

Open `docs/research/scores/phoenix.md` and find the transcribed JAMA 2024 Table 2. Record the maximum for each of `respiratory`, `cardiovascular`, `coagulation` and `neurologic`. Do **not** infer them from `phoenix.ts` — the non-respiratory components are computed rather than assigned, so reading the code would launder an assumption. The published Phoenix total maximum is the sum of the four; use that as your check, exactly as PELOD-2's organ maxima are checked against 33 in Task 6.

- [ ] **Step 2: Add the declaration**

In `packages/scoring-engine/src/scores/phoenix.ts`, immediately before the `calculate:` property, using the four maxima from Step 1:

```ts
  composition: {
    total: "phoenix_total",
    components: [
      { id: "respiratory", max: 3 },
      { id: "cardiovascular", max: MAX_CARDIOVASCULAR },
      { id: "coagulation", max: MAX_COAGULATION },
      { id: "neurologic", max: MAX_NEUROLOGIC },
    ],
  },
```

Replace `MAX_CARDIOVASCULAR`, `MAX_COAGULATION` and `MAX_NEUROLOGIC` with the integers from Step 1. `respiratory` is 3, already confirmed from the implementation's assigned values.

- [ ] **Step 3: Add the sum assertion**

Append inside the `describeScore(phoenix, (ctx) => {` block in `packages/scoring-engine/src/scores/phoenix.test.ts`, before its closing `});`:

```ts
it("total equals the sum of its declared components, across the tiers", () => {
  const vectors = [
    { age_months: { value: 72, unit: "months" }, suspected_infection: { value: true } },
    { ...ventilatedOnPureOxygen, spo2: { value: 97, unit: "%" } },
    {
      age_months: { value: 36, unit: "months" },
      suspected_infection: { value: true },
      n_vasoactives: { value: 2, unit: "" },
      platelets: { value: 40, unit: "10^3/µL" },
      gcs_total: { value: 8, unit: "" },
    },
  ];
  for (const v of vectors) {
    const outcome = phoenix.compute(v as never);
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) continue;
    const get = (id: string) => outcome.result.values.find((x) => x.id === id)!.value;
    const sum = phoenix.composition!.components.reduce((n, c) => n + get(c.id), 0);
    expect(sum).toBe(get(phoenix.composition!.total));
    for (const c of phoenix.composition!.components) {
      expect(get(c.id), `${c.id} above declared max`).toBeLessThanOrEqual(c.max);
    }
  }
});
```

`ventilatedOnPureOxygen` is already defined near the end of that file by the SpO₂ 97/98 cliff cases; reuse it rather than redeclaring.

- [ ] **Step 4: Run**

Run: `cd packages/scoring-engine && npx vitest run src/scores/phoenix.test.ts src/scores/registry-gate.test.ts`
Expected: PASS. A failure on the max assertion means a maximum from Step 1 is wrong — re-read the table, do not widen the constant to make it green.

- [ ] **Step 5: Commit**

```bash
git add packages/scoring-engine/src/scores/phoenix.ts packages/scoring-engine/src/scores/phoenix.test.ts
git commit -m "feat(engine): declare Phoenix's four-component composition"
```

---

## Task 5: Declare composition on PRISM

**Files:**

- Modify: `packages/scoring-engine/src/scores/prism.ts`
- Test: `packages/scoring-engine/src/scores/prism.test.ts`

- [ ] **Step 1: Add the declaration**

In `packages/scoring-engine/src/scores/prism.ts`, immediately before the `calculate:` property:

```ts
  composition: {
    total: "prism_total",
    components: [
      { id: "neurologic_subscore", max: 16 },
      { id: "non_neurologic_subscore", max: 58 },
    ],
  },
```

These two maxima are stated in the score's own `notes`: "a neurologic subscore (pupillary reflexes 0-11 plus mental status 0-5, maximum 16) and a non-neurologic subscore (the remaining fifteen variables, maximum 58)". 16 + 58 = 74, the published PRISM III maximum.

- [ ] **Step 2: Add the sum assertion**

Append inside the `describe("PRISM threshold rows", () => {` block in `packages/scoring-engine/src/scores/prism.test.ts`, before its closing `});`. It already defines the `at()` helper and `mo()`/`yrs()`:

```ts
it("the two subscores sum to the total at several severities", () => {
  const cases = [
    normal,
    { ...normal, sbp_min: { value: 30, unit: "mmHg" } },
    { ...normal, pupils: { value: "both_fixed" } },
    { ...normal, mental_status_gcs: { value: 3, unit: "" }, pupils: { value: "both_fixed" } },
  ];
  for (const c of cases) {
    const outcome = prism.compute(c as never);
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) continue;
    const get = (id: string) => outcome.result.values.find((x) => x.id === id)!.value;
    expect(get("neurologic_subscore") + get("non_neurologic_subscore")).toBe(get("prism_total"));
    expect(get("neurologic_subscore")).toBeLessThanOrEqual(16);
    expect(get("non_neurologic_subscore")).toBeLessThanOrEqual(58);
  }
});
```

- [ ] **Step 3: Run**

Run: `cd packages/scoring-engine && npx vitest run src/scores/prism.test.ts src/scores/registry-gate.test.ts`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add packages/scoring-engine/src/scores/prism.ts packages/scoring-engine/src/scores/prism.test.ts
git commit -m "feat(engine): declare PRISM's neurologic/non-neurologic composition"
```

---

## Task 6: Transcribe PELOD-2 Table 6 into a research note

PELOD-2 and PRISM are the only two built scores with no `docs/research/scores/*.md`. The next task changes PELOD-2's output, and doing that without a transcribed table means working from variable names, which are not a citation.

**Files:**

- Create: `docs/research/scores/pelod2.md`

- [ ] **Step 1: Write the note**

Create `docs/research/scores/pelod2.md`. Follow the structure of `docs/research/scores/psofa.md` — read it first. The note must contain the five organ systems, their constituent variables, every point value, and the age bands for MAP and creatinine, all transcribed from:

> Leteurtre S, Duhamel A, Salleron J, et al. PELOD-2: an update of the PEdiatric
> Logistic Organ Dysfunction score. Crit Care Med. 2013;41(7):1761-1773. Table 6.
> PMID 23685639.

The five organ systems and their variables, which you are transcribing point values **for** (this grouping is the published structure, and it is what the next task implements):

| Organ system   | Variables                                        |
| -------------- | ------------------------------------------------ |
| Neurologic     | Glasgow Coma Scale; pupillary reaction           |
| Cardiovascular | lactataemia; mean arterial pressure (age-banded) |
| Renal          | creatinine (age-banded)                          |
| Respiratory    | PaO₂/FiO₂; PaCO₂; invasive ventilation           |
| Haematologic   | white cell count; platelets                      |

- [ ] **Step 2: Record each organ's maximum and check the sum**

At the end of the note, add a short "Organ maxima" section listing the maximum attainable points per organ. Derived from the point values in Table 6, these are:

| Organ          | Max |
| -------------- | --- |
| Neurologic     | 9   |
| Cardiovascular | 10  |
| Renal          | 2   |
| Respiratory    | 8   |
| Haematologic   | 4   |

**They must sum to 33**, the published PELOD-2 maximum total. If your transcription gives a different sum, the transcription is wrong — fix it before continuing, and record what you corrected. This check is the whole reason to write the maxima down.

- [ ] **Step 3: Commit**

```bash
git add docs/research/scores/pelod2.md
git commit -m "docs(research): transcribe PELOD-2 Table 6, the last score without a note"
```

---

## Task 7: Emit PELOD-2's organ subscores

**Files:**

- Modify: `packages/scoring-engine/src/scores/pelod2.ts:318-354`
- Test: `packages/scoring-engine/src/scores/pelod2.test.ts`

- [ ] **Step 1: Write the failing test**

Append inside the `describeScore(pelod2, (ctx) => {` block in `packages/scoring-engine/src/scores/pelod2.test.ts`, before its closing `});`:

```ts
it("emits five organ subscores that sum to the total", () => {
  const outcome = pelod2.compute(base as never);
  expect(outcome.ok).toBe(true);
  if (!outcome.ok) return;
  const get = (id: string) => outcome.result.values.find((x) => x.id === id)?.value;
  const organs = ["neurologic", "cardiovascular", "renal", "respiratory", "haematologic"];
  for (const o of organs) expect(get(o), `${o} must be emitted`).toBeDefined();
  const sum = organs.reduce((n, o) => n + (get(o) ?? 0), 0);
  expect(sum).toBe(get("pelod2"));
});
```

`base` is the valid input vector already defined at the top of that file. If it is named differently, use whatever the existing `workedExample` calls pass.

- [ ] **Step 2: Run it to confirm it fails**

Run: `cd packages/scoring-engine && npx vitest run src/scores/pelod2.test.ts`
Expected: FAIL — `neurologic must be emitted` / `expected undefined to be defined`. The subscores do not exist yet.

- [ ] **Step 3: Group the ten terms into five organ sums**

Replace the body of `calculate:` at `packages/scoring-engine/src/scores/pelod2.ts:318-354` with:

```ts
  calculate: (values) => {
    const band = ageBandFor(values.age_months.value);

    // Grouped by the five organ systems of Leteurtre 2013 Table 6, rather than
    // summed as ten loose terms. The arithmetic is identical — `points` below
    // is the same number it always was — but the parts are now nameable, which
    // is what the result panel shows.
    const neurologic = gcsPoints(values.gcs.value) + (values.pupils.value === "both_fixed" ? 5 : 0);
    const cardiovascular = lactatePoints(values.lactate.value) + mapPoints(values.map.value, band);
    const renal = creatininePoints(values.creatinine.value, band);
    const respiratory =
      pfPoints(values.pao2_fio2.value) +
      paco2Points(values.paco2.value) +
      (values.invasive_vent.value ? 3 : 0);
    const haematologic = wbcPoints(values.wbc.value) + plateletPoints(values.platelets.value);

    const points = neurologic + cardiovascular + renal + respiratory + haematologic;

    const logit = -6.61 + 0.47 * points;
    const mortalityPercent = (1 / (1 + Math.exp(-logit))) * 100;

    const organ = (id: string, key: string, label: string, value: number) => ({
      id,
      label: defineText(key, label),
      value,
      unit: "",
      precision: 0,
    });

    return [
      {
        id: "pelod2",
        label: defineText("pelod2.total", "PELOD-2 total"),
        value: points,
        unit: "",
        precision: 0,
      },
      organ("neurologic", "pelod2.neurologic", "Neurologic subscore", neurologic),
      organ("cardiovascular", "pelod2.cardiovascular", "Cardiovascular subscore", cardiovascular),
      organ("renal", "pelod2.renal", "Renal subscore", renal),
      organ("respiratory", "pelod2.respiratory", "Respiratory subscore", respiratory),
      organ("haematologic", "pelod2.haematologic", "Haematologic subscore", haematologic),
      {
        id: "mortality_probability",
        label: defineText(
          "pelod2.mortality",
          "Predicted in-hospital mortality (population estimate)",
        ),
        value: mortalityPercent,
        unit: "%",
        precision: 2,
      },
    ];
  },
```

- [ ] **Step 4: Run the test to confirm it passes**

Run: `cd packages/scoring-engine && npx vitest run src/scores/pelod2.test.ts`
Expected: PASS, **including every pre-existing worked example**. The total must not move. If a worked example now fails, you have changed the arithmetic — revert and re-group more carefully.

- [ ] **Step 5: Commit**

```bash
git add packages/scoring-engine/src/scores/pelod2.ts packages/scoring-engine/src/scores/pelod2.test.ts
git commit -m "feat(engine): emit PELOD-2's five organ subscores instead of discarding them"
```

---

## Task 8: Declare composition on PELOD-2

**Files:**

- Modify: `packages/scoring-engine/src/scores/pelod2.ts`

- [ ] **Step 1: Add the declaration**

In `packages/scoring-engine/src/scores/pelod2.ts`, immediately before the `calculate:` property, using the maxima verified in Task 6 Step 2:

```ts
  composition: {
    total: "pelod2",
    components: [
      { id: "neurologic", max: 9 },
      { id: "cardiovascular", max: 10 },
      { id: "renal", max: 2 },
      { id: "respiratory", max: 8 },
      { id: "haematologic", max: 4 },
    ],
  },
```

- [ ] **Step 2: Run the gate**

Run: `cd packages/scoring-engine && npx vitest run src/scores/pelod2.test.ts src/scores/registry-gate.test.ts`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add packages/scoring-engine/src/scores/pelod2.ts
git commit -m "feat(engine): declare PELOD-2's five-organ composition"
```

---

## Task 9: Emit pGCS components and declare its composition

**Files:**

- Modify: `packages/scoring-engine/src/scores/pediatric-gcs.ts:246-259`
- Test: `packages/scoring-engine/src/scores/pediatric-gcs.test.ts`

- [ ] **Step 1: Write the failing test**

Append inside the `describeScore` block in `packages/scoring-engine/src/scores/pediatric-gcs.test.ts`, before its closing `});`:

```ts
it("emits eye, verbal and motor components that sum to the total, never below 1", () => {
  const outcome = pediatricGcs.compute(base as never);
  expect(outcome.ok).toBe(true);
  if (!outcome.ok) return;
  const get = (id: string) => outcome.result.values.find((x) => x.id === id)?.value;
  for (const id of ["eye", "verbal", "motor"]) {
    expect(get(id), `${id} must be emitted`).toBeDefined();
    expect(get(id)!, `${id} floor is 1, not 0`).toBeGreaterThanOrEqual(1);
  }
  expect(get("eye")! + get("verbal")! + get("motor")!).toBe(get("pgcs_total"));
});
```

Use whatever the file's existing worked examples pass as `base`; if there is no such constant, inline `{ gcs_eye: { value: "4" }, gcs_verbal: { value: "5" }, gcs_motor: { value: "6" } }` and adjust the option value types to match the score's `inputs` declaration.

- [ ] **Step 2: Run it to confirm it fails**

Run: `cd packages/scoring-engine && npx vitest run src/scores/pediatric-gcs.test.ts`
Expected: FAIL — `eye must be emitted`.

- [ ] **Step 3: Emit the components and declare the composition**

Replace `calculate:` at `packages/scoring-engine/src/scores/pediatric-gcs.ts:246-259` with:

```ts
  composition: {
    // min is 1, not 0: a GCS component has no zero. A bar drawn from zero would
    // show a motor score of 1 as a sixth of its range when it is the floor.
    total: "pgcs_total",
    components: [
      { id: "eye", max: 4, min: 1 },
      { id: "verbal", max: 5, min: 1 },
      { id: "motor", max: 6, min: 1 },
    ],
  },
  calculate: (values) => {
    const eye = Number(values.gcs_eye.value);
    const verbal = Number(values.gcs_verbal.value);
    const motor = Number(values.gcs_motor.value);
    const part = (id: string, key: string, label: string, value: number) => ({
      id,
      label: defineText(key, label),
      value,
      unit: "",
      precision: 0,
    });
    return [
      {
        id: "pgcs_total",
        label: defineText("pgcs.output", "Total pGCS"),
        value: eye + verbal + motor,
        unit: "",
        precision: 0,
      },
      part("eye", "pgcs.eye", "Eye opening", eye),
      part("verbal", "pgcs.verbal", "Verbal response", verbal),
      part("motor", "pgcs.motor", "Motor response", motor),
    ];
  },
```

- [ ] **Step 4: Run and commit**

Run: `cd packages/scoring-engine && npx vitest run src/scores/pediatric-gcs.test.ts src/scores/registry-gate.test.ts`
Expected: PASS.

```bash
git add packages/scoring-engine/src/scores/pediatric-gcs.ts packages/scoring-engine/src/scores/pediatric-gcs.test.ts
git commit -m "feat(engine): emit pGCS eye/verbal/motor components with a floor of 1"
```

- [ ] **Step 5: Run the whole engine suite with coverage**

Run: `pnpm test`
Expected: all packages pass; `packages/scoring-engine` reports **100%** on statements, branches, functions and lines. If coverage dropped, a new line is unexercised — add a case rather than lowering the gate.

---

## Task 10: The composition panel component

**Files:**

- Create: `apps/web/components/calculator/composition-panel.tsx`

- [ ] **Step 1: Write the component**

Create `apps/web/components/calculator/composition-panel.tsx`:

```tsx
import type { Composition, ScoreValue } from "@towardpcc/scoring-engine";
import { cn } from "@towardpcc/ui";

/**
 * What makes up a composite total.
 *
 * A clinician reading pSOFA 15 learns the magnitude and nothing about the
 * shape — fifteen from three organs at maximum is a different patient from
 * fifteen spread across six. The engine already knew which; this renders it.
 *
 * NO SEVERITY COLOUR RAMP, deliberately. The reference site this came from
 * ramps each row green through red; ADR-design-direction states crimson never
 * means error, and a per-row ramp would teach exactly that association on the
 * most-read surface here. Proportion is carried by bar LENGTH in one accent
 * tone instead.
 *
 * The bars are aria-hidden and the `4 of 24` text is the accessible content —
 * the same decision the evidence chips make, for the same reason: nothing in a
 * graphic may be the sole carrier of a value.
 */
export function CompositionPanel({
  composition,
  values,
}: {
  composition: Composition;
  values: readonly ScoreValue[];
}) {
  const rows = composition.components
    .map((c) => {
      const v = values.find((x) => x.id === c.id);
      if (!v) return null;
      const min = c.min ?? 0;
      // Clamped: a value outside its declared range is a bug caught by
      // registry-gate, but it must never render a bar wider than its track.
      const fill = Math.max(0, Math.min(1, (v.value - min) / (c.max - min)));
      return { id: c.id, label: v.label.en, value: v.value, max: c.max, fill };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null);

  if (rows.length === 0) return null;

  return (
    <div className="mt-5 border-t border-border-subtle pt-4">
      <p className="m-0 font-numeric text-eyebrow tracking-[0.1em] text-ink-muted uppercase">
        What makes up this total
      </p>
      <dl className="mt-3 m-0 flex flex-col gap-2.5">
        {rows.map((r) => (
          <div key={r.id} className="grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-1">
            <dt className="text-[13px] text-ink-body">{r.label}</dt>
            <dd className="numeric m-0 font-numeric text-[13px] text-ink-strong tabular-nums">
              {r.value} of {r.max}
            </dd>
            <span
              aria-hidden="true"
              className="col-span-2 h-1.5 overflow-hidden rounded-pill bg-border-subtle"
            >
              <span
                className={cn("chip-meter block h-full origin-left rounded-pill bg-accent")}
                style={{ "--fill": r.fill } as React.CSSProperties}
              />
            </span>
          </div>
        ))}
      </dl>
    </div>
  );
}
```

- [ ] **Step 2: Export `Composition` and `ScoreValue` from the engine's public entry**

Check `packages/scoring-engine/src/index.ts` exports both types. If `Composition` is not exported, add it to the existing `export type { ... } from "./types";` list.

- [ ] **Step 3: Verify it compiles**

Run: `pnpm typecheck`
Expected: `Done` for all packages. The component is not yet rendered anywhere, which is fine.

- [ ] **Step 4: Commit**

```bash
git add apps/web/components/calculator/composition-panel.tsx packages/scoring-engine/src/index.ts
git commit -m "feat(web): add the composition panel, no severity colour ramp"
```

---

## Task 11: Render the panel and the completion counter

**Files:**

- Modify: `apps/web/components/calculator/calculator-form.tsx`

- [ ] **Step 1: Measure route JS before the change**

Run:

```bash
cd apps/web && pnpm build > /dev/null 2>&1 && pnpm budget:check
```

Record the `/calculators/[slug]` figure. You will quote both numbers in the commit message, because the last spec asserted "unchanged" and was wrong by 0.2 KB.

- [ ] **Step 2: Render the panel**

In `apps/web/components/calculator/calculator-form.tsx`, add the import at the top with the other `@/components/calculator` imports:

```tsx
import { CompositionPanel } from "@/components/calculator/composition-panel";
```

Then in `ResultPanel`, immediately after the closing `</div>` of the `{ok.result.values.map(...)}` wrapper (the `<div className="mt-4 flex flex-col gap-4">` block that ends around line 1044), add:

```tsx
{
  definition.composition ? (
    <CompositionPanel composition={definition.composition} values={ok.result.values} />
  ) : null;
}
```

`definition` is already in scope in `ResultPanel`.

- [ ] **Step 3: Hide component rows from the flat value list**

The components would otherwise render twice — once in the existing list, once in the panel. In the same file, change the values map at line 1049 from `ok.result.values.map(` to:

```tsx
            {ok.result.values
              .filter(
                (v) =>
                  !definition.composition?.components.some((c) => c.id === v.id),
              )
              .map((v) => {
```

Leave the closing of that map unchanged.

- [ ] **Step 4: Add the completion counter**

Find where `blocking` is computed in `CalculatorForm`. Immediately above the existing blocking-list render (the `{c.resultBlockedHeading}` paragraph), add:

```tsx
{
  definition.composition ? (
    <p className="font-numeric text-[13px] text-ink-muted">
      {definition.inputs.length - blocking.length} of {definition.inputs.length} entered
    </p>
  ) : null;
}
```

The counter is scoped to composite scores, matching the spec: on a three-input formula it would carry no information.

- [ ] **Step 5: Verify in the browser**

Run the dev server via the preview tool (never `pnpm dev` in a shell), open `/calculators/psofa`, and fill every input. Confirm: six component rows appear under "What makes up this total"; each reads `n of 4`; the bars fill proportionally; the six organ rows no longer appear twice; the counter reads `9 of 9 entered` when complete.

- [ ] **Step 6: Re-measure route JS and commit**

```bash
cd apps/web && pnpm build > /dev/null 2>&1 && pnpm budget:check
```

```bash
git add apps/web/components/calculator/calculator-form.tsx
git commit -m "feat(web): show composite components and completion in the result panel"
```

Include both budget figures in the commit body.

---

## Task 12: End-to-end coverage

**Files:**

- Create: `apps/web/e2e/composition.spec.ts`

- [ ] **Step 1: Write the spec**

Create `apps/web/e2e/composition.spec.ts`:

```ts
import { expect, test } from "@playwright/test";

/**
 * The composition panel is a redundant visual encoding of numbers that are
 * also present as text, so the bars must be hidden from assistive technology
 * while the figures stay readable — the same contract the evidence chips hold.
 */
test.describe("composite score composition", () => {
  test("pSOFA shows its six organ components once each", async ({ page }) => {
    await page.goto("/calculators/psofa");
    await page.locator("#field-age_months").fill("36");
    await page.locator("#field-platelets").fill("200");
    await page.locator("#field-bilirubin").fill("0.5");
    await page.locator("#field-gcs").fill("15");
    await page.locator("#field-creatinine").fill("0.5");

    const panel = page.getByText("What makes up this total").locator("..");
    await expect(panel).toBeVisible();
    // Six organs, each rendered exactly once — a component appearing twice
    // means the flat-list filter in ResultPanel regressed.
    await expect(panel.getByText(/ of 4$/)).toHaveCount(6);
  });

  test("the proportion bars are hidden from assistive technology", async ({ page }) => {
    await page.goto("/calculators/psofa");
    const panel = page.getByText("What makes up this total").locator("..");
    const exposed = await panel
      .locator("span.chip-meter")
      .evaluateAll(
        (els) => els.filter((e) => e.parentElement?.getAttribute("aria-hidden") !== "true").length,
      );
    expect(exposed, "a proportion bar is being announced").toBe(0);
  });

  test("no horizontal scroll at 320px", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 800 });
    await page.goto("/calculators/psofa");
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });
});
```

If the field ids differ, read them off the rendered page — inputs are `#field-<inputId>`.

- [ ] **Step 2: Run**

Run: `cd apps/web && npx playwright test composition --reporter=line`
Expected: 3 passed.

- [ ] **Step 3: Run the full gate**

Run from the repo root:

```bash
pnpm typecheck && pnpm lint && pnpm test
```

Then:

```bash
cd apps/web && pnpm build > /dev/null 2>&1 && pnpm budget:check && npx playwright test --reporter=dot
```

Expected: typecheck and lint `Done`; engine coverage 100% on all four axes; every route inside the 170 KB budget; the full e2e suite green.

- [ ] **Step 4: Commit**

```bash
git add apps/web/e2e/composition.spec.ts
git commit -m "test(web): e2e for the composition panel, aria-hidden bars and 320px"
```

---

## Self-review notes

Checked against the spec:

- `Composition` type with `total`, `components`, `max`, optional `min` — Task 1.
- Five scores in two tiers — Tasks 3, 4, 5 (tier 1) and 7, 8, 9 (tier 2).
- PELOD-2 research note from Leteurtre Table 6 — Task 6, with the sum-to-33 check.
- Per-item display with `n of max`, `.chip-meter` bars, `aria-hidden`, no colour ramp — Tasks 10 and 11.
- Completion indicator on composite scores only — Task 11 Step 4.
- Structural registry-wide id assertion — Task 2.
- Maxima never exceeded, min never breached — Tasks 3, 4, 5, 9.
- Σ components === total per worked example — Tasks 3, 4, 5, 7, 9.
- e2e rendering, aria-hidden, 320px — Task 12.
- Route JS measured before and after — Task 11 Steps 1 and 6.

One known gap carried deliberately: Phoenix's three non-respiratory maxima are read from the research note in Task 4 Step 1 rather than stated here, because they are computed rather than assigned in the implementation and putting a guessed integer in this plan would be exactly the laundering the spec rejects. The published-total check in that step is what makes it safe.
