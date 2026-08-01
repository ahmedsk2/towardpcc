"use client";

import { useCallback, useEffect, useState } from "react";
import type { ScoreInput } from "@towardpcc/scoring-engine";

const KEY = "towardpcc:carried";

/**
 * Age and weight, carried from the last calculator — as an OFFER, never a
 * pre-fill.
 *
 * A clinician computing pSOFA and then PELOD-2 on the same child retypes age
 * three times. Worth fixing. But this is the one feature on the page that could
 * put a number into a form that nobody typed, and on a tool where a wrong
 * weight changes a dose that is the failure a registry cannot have — so the
 * value is never written into a field by this hook. It is shown, named, and
 * applied only when the clinician clicks it.
 *
 * That is a deliberate divergence from the plan this came from, which proposed
 * pre-filling with a visible cue. A cue can be missed; a click cannot.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHAT IT DELIBERATELY DOES NOT DO: infer that two inputs mean the same thing.
 *
 * Age is `age` in years on PRISM and ETT size, and `age_months` in months on
 * pSOFA, Phoenix and PELOD-2. Weight is `weight`, `weight_kg`. Carrying between
 * those needs a hand-maintained table of which ids are semantically equal and
 * which units convert — and a wrong row in that table is a silent, plausible,
 * wrong number. So the match is EXACT: same input id, same canonical unit.
 * That covers the severity-score sequence (pSOFA → Phoenix → PELOD-2 all share
 * `age_months`) and the body-surface pair, and it cannot be wrong.
 *
 * The right fix for the rest is a `quantity` field on the input type so the
 * engine's own unit conversion can do the work — a schema change, not a lookup
 * table, and not one to make at the end of a batch.
 *
 * SESSION storage, not local: a shift, not a device. It is gone when the
 * browser session ends, and it never leaves this device — same invariant as
 * everything else on the page.
 */
export interface CarriedValue {
  readonly id: string;
  readonly raw: string;
  readonly unit: string;
  readonly label: string;
}

function read(): CarriedValue[] {
  try {
    const parsed: unknown = JSON.parse(sessionStorage.getItem(KEY) ?? "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (v): v is CarriedValue =>
        typeof v === "object" &&
        v !== null &&
        typeof (v as CarriedValue).id === "string" &&
        typeof (v as CarriedValue).raw === "string" &&
        typeof (v as CarriedValue).unit === "string" &&
        typeof (v as CarriedValue).label === "string",
    );
  } catch {
    return [];
  }
}

/**
 * The inputs worth carrying. Nothing clinical — the patient's size, only.
 *
 * EXPORTED, because it was applied on the READ side alone and the writer sent
 * every numeric field it had. A session that touched pSOFA, anion gap, QTc and
 * burn resuscitation accumulated nineteen labelled physiologic values —
 * creatinine, bilirubin, platelets, lactate — as a readable snapshot of one
 * child, persisting for the life of the tab, while /legal/data-protection says
 * calculators collect "Nothing" and calls its table "the honest, complete
 * picture". An allow-list that only guards the read is not an allow-list.
 */
export const CARRIED_IDS: ReadonlySet<string> = new Set([
  "age",
  "age_months",
  "weight",
  "weight_kg",
]);

export function useCarriedValues(inputs: readonly ScoreInput[]) {
  const [offered, setOffered] = useState<readonly CarriedValue[]>([]);

  // Post-mount, like useFavorites: reading storage in the initializer would
  // diverge from the server render and mismatch hydration.
  useEffect(() => {
    const wanted = new Map(
      inputs
        .filter((i) => i.type === "numeric" && CARRIED_IDS.has(i.id))
        .map((i) => [i.id, i.type === "numeric" ? i.unit.canonical : ""]),
    );
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOffered(read().filter((v) => wanted.get(v.id) === v.unit));
  }, [inputs]);

  /**
   * Remember what this calculator was given, for the next one.
   *
   * Filters by CARRIED_IDS here as well as on the read. Belt and braces on
   * purpose: this is the only line that decides what touches the disk, and the
   * caller passing the wrong list is exactly what happened.
   */
  const remember = useCallback((values: readonly CarriedValue[]) => {
    const carryable = values.filter((v) => CARRIED_IDS.has(v.id));
    if (carryable.length === 0) return;
    try {
      const merged = new Map(read().map((v) => [v.id, v]));
      for (const v of carryable) merged.set(v.id, v);
      sessionStorage.setItem(KEY, JSON.stringify([...merged.values()]));
    } catch {
      // Private mode, quota, disabled storage — carrying is a convenience and
      // failing to carry is not an error worth surfacing.
    }
  }, []);

  /**
   * Take one offer, leaving the others alone.
   *
   * `applyCarried` used to call `dismiss`, which cleared the whole store — so a
   * clinician offered both an age and a weight could only ever use one, and the
   * other was deleted from storage as well as from the page, for the rest of
   * the session.
   */
  const consume = useCallback((id: string) => {
    setOffered((prev) => prev.filter((v) => v.id !== id));
  }, []);

  /** The explicit "no thanks": clears the page AND the store. */
  const dismiss = useCallback(() => {
    setOffered([]);
    try {
      sessionStorage.removeItem(KEY);
    } catch {
      /* see above */
    }
  }, []);

  return { offered, remember, consume, dismiss };
}
