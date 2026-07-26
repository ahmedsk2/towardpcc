import Link from "next/link";
import { getScore, listScores } from "@towardpcc/scoring-engine";
import type { ScoreCategory } from "@towardpcc/scoring-engine";
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
        const count = getScore(s.slug)?.inputs.length ?? 0;
        return {
          slug: s.slug,
          name: s.name,
          meta: `${count} input${count === 1 ? "" : "s"}`,
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
          aria-label={site.nav.homeAriaLabel}
          className="flex shrink-0 items-center gap-2.5 rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          <span className="grid size-9 place-items-center rounded-[11px] bg-gradient-accent shadow-[0_6px_16px_-6px_rgba(207,31,61,0.6)]">
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="size-5 text-white">
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
