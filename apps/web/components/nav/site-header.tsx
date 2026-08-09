import Link from "next/link";
import { getScore, listScores } from "@towardpcc/scoring-engine";
import type { ScoreCategory } from "@towardpcc/scoring-engine";
import { inputCountLabel } from "@/lib/input-count";
import { site } from "@/content/site";
import { MainNav, type MegaGroup } from "./main-nav";
import { StickyShell } from "./sticky-shell";
import { UtilityBar } from "./utility-bar";

// Preserve the PRD §6.4 category order in the mega-menu.
const CATEGORY_ORDER: ScoreCategory[] = [
  "mortality-severity",
  "organ-dysfunction",
  "sepsis",
  "respiratory",
  "sedation-analgesia-withdrawal",
  "fluids-resuscitation",
  "airway-equipment",
  "renal-metabolic",
  "general",
];

/**
 * Builds the mega-menu from the live registry, so the menu can never drift
 * from the scores that actually ship. Input counts come from each definition
 * rather than being transcribed.
 */
function buildGroups(): MegaGroup[] {
  const scores = listScores();
  return CATEGORY_ORDER.map((category) => ({
    category,
    label: site.calculators.categoryLabels[category],
    items: scores
      .filter((s) => s.category === category)
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((s) => {
        const def = getScore(s.slug);
        return {
          slug: s.slug,
          name: s.name,
          meta: def ? inputCountLabel(def) : "",
        };
      }),
  })).filter((g) => g.items.length > 0);
}

export function SiteHeader() {
  return (
    <>
      <UtilityBar />
      <StickyShell>
        <Link
          href="/"
          // The logo sits in the sticky header on every route, so Next's
          // default viewport prefetch pulled home's RSC payload — measured at
          // 68 KB — on every page view, including on home itself where the same
          // flight data is already inlined in the document. It is the largest
          // non-critical request on all nine measured routes. Home is one tap
          // from anywhere and cheap to fetch on demand; main-nav.tsx already
          // opts out the same way.
          prefetch={false}
          aria-label={site.nav.homeAriaLabel}
          className="flex shrink-0 items-center gap-2.5 rounded-sm transition-[filter] duration-150 ease-[var(--motion-ease)] hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent motion-reduce:transition-none"
        >
          {/* Hover brightens the mark rather than moving it: a logo that
              shifts makes the whole header feel loose.
              On the ANCHOR, as a plain `hover:` — a `group-hover/brand:`
              variant on the child never applied, while `size-9` on the same
              element did, so Tailwind was loaded and the named-group variant
              specifically was not resolving. A hover that silently does
              nothing is worse than no hover, and plain `hover:` is the form
              every working hover on this site already uses. */}
          <span className="grid size-9 place-items-center rounded-[11px] bg-gradient-accent shadow-[0_6px_16px_-6px_rgba(207,31,61,0.6)]">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
              className="size-5 text-ink-on-accent"
            >
              <path
                d="M2 13h4l2-6 4 12 3-9 2 3h5"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <span className="font-display text-xl font-bold tracking-tight text-ink-strong">
            Toward<span className="text-accent">PCC</span>
          </span>
        </Link>
        <MainNav groups={buildGroups()} />
      </StickyShell>
    </>
  );
}
