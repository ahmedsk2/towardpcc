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

/** The inputs worth carrying. Nothing clinical — the patient's size, only. */
const CARRIED_IDS = new Set(["age", "age_months", "weight", "weight_kg"]);

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

  /** Remember what this calculator was given, for the next one. */
  const remember = useCallback((values: readonly CarriedValue[]) => {
    if (values.length === 0) return;
    try {
      const merged = new Map(read().map((v) => [v.id, v]));
      for (const v of values) merged.set(v.id, v);
      sessionStorage.setItem(KEY, JSON.stringify([...merged.values()]));
    } catch {
      // Private mode, quota, disabled storage — carrying is a convenience and
      // failing to carry is not an error worth surfacing.
    }
  }, []);

  const dismiss = useCallback(() => {
    setOffered([]);
    try {
      sessionStorage.removeItem(KEY);
    } catch {
      /* see above */
    }
  }, []);

  return { offered, remember, dismiss };
}
