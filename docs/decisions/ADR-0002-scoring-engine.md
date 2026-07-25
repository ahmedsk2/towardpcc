# ADR-0002: Scoring-engine architecture

- Status: accepted
- Date: 2026-07-25
- Deciders: founding engineer, from the code-architect blueprint against PRD §6.3

## Context

The engine is the crown jewel: pure TypeScript, zero runtime dependencies,
DOM-free (compiler-enforced), consumed as TS source by Next.js today and by
React Native later, 100% line+branch coverage, and PRD §6.3's absolute
testing rules (worked examples citing sources; boundary tests; implausible
inputs rejected, never computed; formula changes only via code+tests).

## Decisions

1. **Per-score modules + a static registry.** `scores/registry.ts` statically
   imports every score and serves `listScores()`/`getScore()`. Both the index
   and the calculator detail client resolve through this registry.

   **Amended P2:** the original plan called for per-slug dynamic imports
   (`import("@towardpcc/scoring-engine/scores/<slug>")`) on detail pages so
   each page's client bundle ships only its own score. As implemented, the
   client `CalculatorForm` uses `getScore(slug)` from the static registry, so
   every calculator page's client bundle currently includes all scores (~10
   small pure-TS modules — negligible today). The per-slug dynamic import is a
   bundle-size optimization deferred to P3 (Lighthouse/perf work); recorded
   here rather than left as silent drift.

2. **`defineScore()` factory owns validation and unit normalization.**
   Authors write only pure arithmetic (`calculate`) over canonical-unit
   values. Rejection-before-arithmetic is a property of the wrapper, not a
   per-author discipline. `compute` never throws:
   `ComputeResult = { ok: true, result } | { ok: false, errors: InputRejection[] }`.
3. **Typed inputs via literal ids.** Inputs are declared `as const`;
   `InputValues<TInputs>` maps required ids to mandatory keys and optional
   ids to omittable keys (`?:`, correct under `exactOptionalPropertyTypes`).
   No index signatures, so `noUncheckedIndexedAccess` never bites.
4. **Text as `{ key, en }` (`LocalizedText`)** — addressable for the future
   Arabic layer with zero runtime i18n dependency.
5. **Exactly two validator slots** as a tuple type
   (`readonly [ValidatorSlot, ValidatorSlot]`), `{ status: "pending" }` at
   launch — the honest badge is compile-enforced.
6. **Unit conversions are named, cited, individually tested functions**
   (round-trip property tests + reference values), never a generic factor
   table.
7. **Harness makes the §6.3 rules structural.** `describeScore()` provides
   `workedExample(source, inputs, expected)` (fails collection without a
   citation and a pmid/doi/locator), `boundaryTest`, `rejectsImplausible`,
   `interpretationBoundary`; the suite fails if a score has zero worked
   examples or unexercised rejection paths. Pure guard logic is exported
   for direct testing; vitest glue stays thin.
8. **CI guards:** `no-runtime-deps.test.ts` (dependencies must be empty),
   `no-dom.test.ts` + tsconfig `lib:[ES2022]`/`types:[]` + a scoped ESLint
   `no-restricted-globals` override.
9. **Multi-output instruments** (OI+OSI) are one definition with multiple
   `ScoreValue`s; P/F and S/F stay separate definitions (disjoint required
   inputs). Integer-point scores use `precision: 0`.
10. **Versioning:** each score carries its own semver + changelog;
    `ENGINE_VERSION` bumps only for shared-contract changes.

## Consequences

- Adding a score = research file (cited) → `scores/<slug>.ts` → registry
  line → `describeScore` suite → coverage green. A score without its test
  file cannot merge (harness + coverage make it structural).
- Rejection messages are English strings + machine `code`; localized
  messages later come from the `code` + input key without engine changes.
- The mobile app imports the same package unchanged; nothing in the engine
  may ever import from apps/web (enforced by package boundaries).
