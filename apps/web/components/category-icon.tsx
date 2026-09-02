import type { ScoreCategory } from "@towardpcc/scoring-engine";

/**
 * One line icon per score category, for the index chips and the mega-menu.
 *
 * WHY THESE AND NOT A LIBRARY. The categories are this site's own taxonomy, so
 * no icon set has a glyph for "sedation, analgesia and withdrawal"; and the
 * route JS budget is 170 KB with 13–23 KB of headroom, which an icon package
 * would spend on glyphs nobody renders. Nine hand-drawn paths cost nothing.
 *
 * DRAWN IN THE SITE'S OWN LANGUAGE. Stroke, not fill, on a 24-unit grid at
 * 1.75 width, matching the existing nav glyphs; `currentColor`, so the accent
 * arrives from the parent and the icon never carries a colour of its own. The
 * respiratory glyph is the two-lobe silhouette the hero mesh draws, so the
 * category reads as the same organ at a different scale. No emoji: the
 * reference site this was measured against uses them as category markers, and
 * they render as whatever the OS ships.
 *
 * `aria-hidden` always. Every icon sits beside its category's text label, and
 * a decorative glyph announced as an image is noise a screen reader user has
 * to skip past.
 */
const PATHS: Record<ScoreCategory, string> = {
  // A gauge: the arc and a needle at the upper third.
  "mortality-severity": "M4 16a8 8 0 0 1 16 0 M12 16l4-5",
  // Three organs in relation: overlapping rings.
  "organ-dysfunction":
    "M9 9a3.5 3.5 0 1 1 0 7a3.5 3.5 0 0 1 0-7z M15 9a3.5 3.5 0 1 1 0 7a3.5 3.5 0 0 1 0-7z M12 4.5a3.5 3.5 0 1 1 0 7",
  // A thermometer with the bulb filled by the stroke.
  sepsis: "M12 4v9.5 M10 4.5h4 M10 8h4 M12 13.5a3 3 0 1 0 0 6a3 3 0 0 0 0-6z",
  // Two lobes and a trachea: the hero's organ at glyph scale.
  respiratory:
    "M12 4v6 M12 10c-2 0-3 1.5-3 4v3.5a2.5 2.5 0 0 1-5 0V13c0-2 1.5-3 3-3 M12 10c2 0 3 1.5 3 4v3.5a2.5 2.5 0 0 0 5 0V13c0-2-1.5-3-3-3",
  // A crescent.
  "sedation-analgesia-withdrawal": "M19 14.5A8 8 0 0 1 9.5 5a8 8 0 1 0 9.5 9.5z",
  // A droplet.
  "fluids-resuscitation": "M12 3.5s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z",
  // A tube: the curve of an endotracheal tube with its cuff.
  "airway-equipment": "M6 4c0 6 2 9 6 9s6 3 6 8 M10.5 12a2.5 1.5 0 1 0 5 0a2.5 1.5 0 0 0-5 0",
  // A kidney.
  "renal-metabolic":
    "M9 5c-3 0-4.5 3-4.5 7s1.5 7 4.5 7c2 0 2.5-1.5 4-1.5s2.5 1.5 4 1.5c1.5 0 2-1.5 2-3.5 0-1.5-1-2-1-3.5s1-2 1-3.5C19 6.5 18.5 5 17 5c-1.5 0-2.5 1.5-4 1.5S11 5 9 5z",
  // A keypad: the calculator itself.
  general:
    "M5 5h14v14H5z M9 9h.01 M12 9h.01 M15 9h.01 M9 12h.01 M12 12h.01 M15 12h.01 M9 15h.01 M12 15h.01 M15 15h.01",
};

export function CategoryIcon({
  category,
  className,
}: {
  category: ScoreCategory;
  className?: string | undefined;
}) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d={PATHS[category]} />
    </svg>
  );
}
