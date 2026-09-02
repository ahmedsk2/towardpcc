import type { ScoreCategory, ScoreSummary } from "@towardpcc/scoring-engine";

/**
 * Terms a clinician types that are NOT in a calculator's name.
 *
 * The index search matched on name alone, so "PARDS" found nothing although
 * four calculators band by PALICC-2, and "adrenaline" found nothing although
 * the VIS input is labelled "Epinephrine (adrenaline)". These are the words
 * people actually reach for: the condition, the drug, the eponym, the
 * abbreviation, the guideline.
 *
 * EVERY ENTRY IS A CLINICAL CLAIM about what a calculator is for, so each one
 * is checkable against the calculator's own notes. PARDS maps to the four
 * oxygenation indices because PALICC-2 grades PARDS by exactly those. It does
 * NOT map to PIM3, which is a mortality model. Keep it that way.
 *
 * Lower case, matched by prefix or (for three characters or more) substring
 * on the ALIAS, never on the query alone, so "oi" cannot light up every
 * calculator whose alias happens to contain those two letters.
 */
const ALIASES: Partial<Record<string, readonly string[]>> = {
  "oxygenation-index": [
    "oi",
    "pards",
    "ards",
    "hypoxaemia",
    "hypoxemia",
    "mean airway pressure",
    "ventilated",
  ],
  "oxygen-saturation-index": [
    "osi",
    "pards",
    "ards",
    "spo2",
    "saturation",
    "hypoxaemia",
    "hypoxemia",
  ],
  "pf-ratio": ["p/f", "pf", "pao2/fio2", "pards", "ards", "berlin", "hypoxaemia", "hypoxemia"],
  "sf-ratio": ["s/f", "sf", "spo2/fio2", "pards", "ards", "non-invasive", "niv"],
  vis: [
    "vasoactive",
    "inotrope",
    "inotropic",
    "vasopressor",
    "adrenaline",
    "epinephrine",
    "noradrenaline",
    "norepinephrine",
    "dopamine",
    "dobutamine",
    "milrinone",
    "vasopressin",
    "shock",
  ],
  "burn-resuscitation": ["parkland", "brooke", "burn", "tbsa", "lund", "browder", "resuscitation"],
  "kdigo-aki": [
    "aki",
    "kidney injury",
    "renal",
    "creatinine",
    "schwartz",
    "oliguria",
    "urine output",
    "rrt",
    "dialysis",
  ],
  "pediatric-gcs": ["gcs", "glasgow", "coma", "consciousness", "neuro"],
  "four-score": ["coma", "brainstem", "intubated", "consciousness", "neuro"],
  "ett-size": ["ett", "tube", "intubation", "airway", "cole", "cuffed", "uncuffed"],
  "holliday-segar": ["maintenance", "4-2-1", "100-50-20", "iv fluid", "fluids", "hourly rate"],
  "serum-osmolality": [
    "osmolar gap",
    "osmolal gap",
    "osmolality",
    "toxic alcohol",
    "methanol",
    "ethylene glycol",
    "ethanol",
    "ingestion",
  ],
  qtc: ["qt", "long qt", "bazett", "fridericia", "ecg", "ekg", "arrhythmia"],
  "bsa-mosteller": ["bsa", "body surface", "mosteller", "chemotherapy", "dosing"],
  "ideal-body-weight": ["ibw", "ideal weight", "tidal volume", "lung protective"],
  phoenix: ["sepsis", "septic shock", "infection"],
  psofa: ["sofa", "organ failure", "organ dysfunction"],
  pelod2: ["pelod", "organ dysfunction", "organ failure"],
  pim3: ["pim", "mortality", "picanet", "anzpic", "benchmark"],
  prism: ["mortality", "severity", "benchmark"],
  "anion-gap": ["anion", "acidosis", "albumin", "figge", "metabolic"],
  "corrected-calcium": ["calcium", "hypocalcaemia", "hypocalcemia", "albumin"],
  "corrected-sodium": [
    "sodium",
    "hyperglycaemia",
    "hyperglycemia",
    "dka",
    "hyponatraemia",
    "hyponatremia",
    "ketoacidosis",
  ],
  "fluid-balance": ["fluid overload", "fluid balance", "crrt", "cumulative", "percent"],
  "apls-weight": ["apls", "weight estimate", "estimated weight", "broselow", "age-based"],
};

function aliasHit(alias: string, q: string): boolean {
  return alias.startsWith(q) || (q.length >= 3 && alias.includes(q));
}

/**
 * The one search predicate, for the index and the header alike.
 *
 * Name matches come first, then alias and category matches, each group in
 * name order. Typing a calculator's own name puts it at the top; typing a
 * condition lists everything that applies to it beneath.
 */
export function matchScores<T extends ScoreSummary>(
  scores: readonly T[],
  query: string,
  categoryLabels: Readonly<Record<ScoreCategory, string>>,
): T[] {
  const q = query.trim().toLowerCase();
  if (!q) return [...scores];
  const byName = (a: T, b: T) => a.name.localeCompare(b.name);
  const direct = scores.filter((s) => s.name.toLowerCase().includes(q) || s.slug.includes(q));
  const seen = new Set(direct.map((s) => s.slug));
  const indirect = scores.filter(
    (s) =>
      !seen.has(s.slug) &&
      ((ALIASES[s.slug] ?? []).some((a) => aliasHit(a, q)) ||
        categoryLabels[s.category].toLowerCase().includes(q)),
  );
  return [...direct.sort(byName), ...indirect.sort(byName)];
}

/** For the test that checks every alias key is a calculator that exists. */
export const SEARCH_ALIAS_SLUGS: readonly string[] = Object.keys(ALIASES);
