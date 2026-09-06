"use client";

import { CategoryIcon } from "@/components/category-icon";
import { PageHero } from "@/components/page-hero";
import { Reveal } from "@/components/reveal";
import { matchScores } from "@/lib/calculator-search";
import { shortName } from "@/content/score-description";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { ScoreCategory, ScoreSummary } from "@towardpcc/scoring-engine";
import { buttonClasses, cn } from "@towardpcc/ui";
import { site } from "@/content/site";
import { useFavorites } from "@/components/calculator/use-favorites";

const c = site.calculators;

// Preserve the PRD §6.4 category order.
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
 * The catalogue, in the shape of a toolkit (2026-09-06).
 *
 * A card says what the score is FOR before you open it: the category glyph,
 * the short name, the tagline, the input count, and a visible Open. The
 * favourite star sits inside the card. A `<button>` may not nest inside an
 * `<a>`, so the card is a `<li>` and the title link is stretched over it
 * with a pseudo-element; the star sits above that layer.
 *
 * The hero is rendered here rather than in the page because the search box
 * lives inside it and its state lives here. Tab, filter and search state is
 * component state, never the URL.
 */
export function CalculatorsIndex({
  scores,
  inputCounts = {},
}: {
  scores: readonly ScoreSummary[];
  /** Rendered label per slug, e.g. `17 inputs` or `22–26 inputs`. */
  inputCounts?: Record<string, string>;
}) {
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<ScoreCategory | null>(null);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const { favorites, toggle, ready } = useFavorites();

  const presentCategories = useMemo(
    () => CATEGORY_ORDER.filter((cat) => scores.some((s) => s.category === cat)),
    [scores],
  );

  const grouped = useMemo(() => {
    let matched = matchScores(scores, query, c.categoryLabels);
    if (activeCategory) matched = matched.filter((s) => s.category === activeCategory);
    if (showFavoritesOnly) matched = matched.filter((s) => favorites.includes(s.slug));
    return CATEGORY_ORDER.map((cat) => ({
      category: cat,
      items: matched.filter((s) => s.category === cat).sort((a, b) => a.name.localeCompare(b.name)),
    })).filter((g) => g.items.length > 0);
  }, [scores, query, activeCategory, showFavoritesOnly, favorites]);

  const favoriteCount = favorites.length;
  const shownCount = grouped.reduce((n, g) => n + g.items.length, 0);
  const isFiltered = Boolean(query.trim() || activeCategory || showFavoritesOnly);

  const categoryCounts = useMemo(() => {
    const counts = {} as Record<ScoreCategory, number>;
    for (const s of scores) counts[s.category] = (counts[s.category] ?? 0) + 1;
    return counts;
  }, [scores]);

  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // "/" jumps to search. Ignored while typing — on a site full of ratio
    // scores ("P/F") stealing the slash is not hypothetical.
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key !== "/" || ev.metaKey || ev.ctrlKey || ev.altKey) return;
      const el = document.activeElement;
      const tag = el?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (el instanceof HTMLElement && el.isContentEditable) return;
      ev.preventDefault();
      searchRef.current?.focus();
      searchRef.current?.select();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const clearAll = () => {
    setQuery("");
    setActiveCategory(null);
    setShowFavoritesOnly(false);
    searchRef.current?.focus();
  };

  let cardIndex = 0;

  return (
    <>
      <PageHero crumb={site.nav.calculators} title={c.indexHeading} lede={c.indexLede}>
        <label htmlFor="calc-search" className="sr-only">
          {c.searchLabel}
        </label>
        <div className="relative">
          <svg
            viewBox="0 0 20 20"
            fill="none"
            aria-hidden="true"
            className="pointer-events-none absolute start-5 top-1/2 size-5 -translate-y-1/2 text-ink-muted"
          >
            <circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="1.8" />
            <path
              d="M13.5 13.5 17 17"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </svg>
          <input
            ref={searchRef}
            id="calc-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={c.searchPlaceholder}
            className="h-14 w-full rounded-pill border border-border-strong bg-surface-raised ps-13 pe-5 text-[16px] text-ink-strong shadow-lg placeholder:text-ink-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-coral"
          />
        </div>
      </PageHero>

      <div className="mx-auto max-w-[1280px] px-6 pb-24">
        <div className="mt-8 flex flex-wrap gap-2" role="group" aria-label={c.filterGroupLabel}>
          <FilterChip active={activeCategory === null && !showFavoritesOnly} onClick={clearAll}>
            {c.filterAll}
          </FilterChip>
          {ready && favoriteCount > 0 && (
            <FilterChip
              active={showFavoritesOnly}
              onClick={() => {
                setShowFavoritesOnly((v) => !v);
                setActiveCategory(null);
              }}
            >
              <StarIcon filled className="size-3.5" /> {c.filterFavorites}
              <span aria-hidden="true" className="ms-1.5 tabular-nums opacity-70">
                {favoriteCount}
              </span>
            </FilterChip>
          )}
          {presentCategories.map((cat) => (
            <FilterChip
              key={cat}
              icon={<CategoryIcon category={cat} className="size-4 shrink-0" />}
              active={activeCategory === cat && !showFavoritesOnly}
              onClick={() => {
                setActiveCategory((cur) => (cur === cat ? null : cat));
                setShowFavoritesOnly(false);
              }}
            >
              {c.categoryLabels[cat]}
              <span aria-hidden="true" className="ms-1.5 tabular-nums opacity-70">
                {categoryCounts[cat]}
              </span>
            </FilterChip>
          ))}
        </div>

        {/* Always mounted, content toggled, so the count is announced on every
            change; visually silent on an unfiltered list. */}
        <p aria-live="polite" className="mt-6 min-h-5 font-numeric text-sm text-ink-muted">
          {isFiltered ? (
            <>
              Showing <span className="tabular-nums text-ink-strong">{shownCount}</span> of{" "}
              <span className="tabular-nums">{scores.length}</span>
            </>
          ) : null}
        </p>

        {grouped.length === 0 ? (
          <div className="mt-10 rounded-lg border border-border bg-surface-raised p-10 text-center shadow-sm">
            <p className="font-display text-lg font-medium text-ink-strong">
              {showFavoritesOnly ? c.noFavorites : c.noResults}
            </p>
            {query.trim() && !showFavoritesOnly ? (
              <p className="mt-2 text-sm text-ink-muted">
                Nothing matches “<span className="text-ink-strong">{query.trim()}</span>”
                {activeCategory ? ` in ${c.categoryLabels[activeCategory].toLowerCase()}` : ""}.
              </p>
            ) : null}
            <button
              type="button"
              onClick={clearAll}
              className={buttonClasses({ variant: "secondary", className: "mt-5" })}
            >
              Clear filters
            </button>
          </div>
        ) : (
          <div className="mt-10 flex flex-col gap-12">
            {grouped.map((group) => (
              <section key={group.category} aria-labelledby={`cat-${group.category}`}>
                <h2
                  id={`cat-${group.category}`}
                  className="flex items-center gap-2.5 font-display text-lg font-semibold text-ink-strong"
                >
                  <CategoryIcon category={group.category} className="size-5 text-accent" />
                  {c.categoryLabels[group.category]}
                </h2>
                <ul className="mt-4 grid list-none gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {group.items.map((s) => {
                    const i = cardIndex++;
                    const fav = favorites.includes(s.slug);
                    return (
                      <li key={s.slug} className="min-w-0">
                        <Reveal className="h-full" delay={Math.min(i % 6, 6) * 45}>
                          <article className="group relative flex h-full flex-col gap-3 overflow-hidden rounded-lg border border-border bg-surface-raised p-5 transition-[translate,box-shadow,border-color] duration-[var(--motion-duration-enter)] ease-[var(--motion-ease)] hover:border-border-strong hover:shadow-xl focus-within:border-border-strong focus-within:shadow-xl motion-safe:hover:-translate-y-1 motion-reduce:transition-none">
                            {/* The crimson rule that draws in along the top edge on
                                hover: `transition-[scale]`, because scale-x-* compiles
                                to the `scale` property. */}
                            <span
                              aria-hidden="true"
                              className="pointer-events-none absolute inset-x-0 top-0 h-0.5 origin-left scale-x-0 bg-gradient-accent transition-[scale] duration-[var(--motion-duration-panel)] ease-[var(--motion-ease)] group-hover:scale-x-100 group-focus-within:scale-x-100 motion-reduce:transition-none"
                            />
                            <div className="flex items-center justify-between gap-3">
                              <span className="grid size-9 place-items-center rounded-md bg-accent-tint text-accent-deep">
                                <CategoryIcon category={s.category} className="size-5" />
                              </span>
                              {/* Above the stretched link (z-10) so it is its own
                                  target. aria-pressed carries the state. */}
                              <button
                                type="button"
                                onClick={() => toggle(s.slug)}
                                aria-pressed={fav}
                                aria-label={
                                  fav
                                    ? `${c.removeFavorite} ${s.name}`
                                    : `${c.addFavorite} ${s.name}`
                                }
                                className={cn(
                                  "relative z-10 grid size-11 place-items-center rounded-pill transition-[color,background-color] duration-150",
                                  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
                                  fav
                                    ? "bg-accent-tint text-accent"
                                    : "text-ink-muted hover:bg-accent-tint hover:text-accent",
                                )}
                              >
                                <StarIcon filled={fav} className="size-[18px]" />
                              </button>
                            </div>
                            <h3 className="font-display text-[17px] leading-tight font-bold text-ink-strong">
                              {/* The stretched link: `after:absolute after:inset-0`
                                  makes the whole card the target while the anchor
                                  keeps its text as the accessible name. */}
                              <Link
                                href={`/calculators/${s.slug}`}
                                className="rounded-sm after:absolute after:inset-0 after:content-[''] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                              >
                                {shortName(s.name)}
                                {shortName(s.name) !== s.name ? (
                                  <span className="sr-only"> — {s.name}</span>
                                ) : null}
                              </Link>
                            </h3>
                            <p className="text-[13.5px] leading-relaxed text-ink-muted">
                              {s.tagline.en}
                            </p>
                            <div className="mt-auto flex items-center justify-between pt-1">
                              <span className="font-numeric text-[11.5px] text-ink-muted">
                                {inputCounts[s.slug] ?? ""}
                              </span>
                              <span
                                aria-hidden="true"
                                className="inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-accent"
                              >
                                Open
                                <svg
                                  viewBox="0 0 16 16"
                                  fill="none"
                                  className="size-3.5 transition-[translate] duration-150 ease-[var(--motion-ease)] group-hover:translate-x-0.5 group-focus-within:translate-x-0.5 motion-reduce:transition-none"
                                >
                                  <path
                                    d="M2 8h11M9 4l4 4-4 4"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  />
                                </svg>
                              </span>
                            </div>
                          </article>
                        </Reveal>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </div>
        )}

        <p className="mt-12 text-[13px] text-ink-muted">{c.favoritesNote}</p>
      </div>
    </>
  );
}

function FilterChip({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "inline-flex min-h-9 items-center gap-1.5 rounded-pill border px-3.5 text-sm transition-[color,background-color,border-color,scale] duration-150 ease-[var(--motion-ease)] motion-reduce:transition-none",
        "motion-safe:active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
        // Selected: solid crimson, white text, heavier weight. The luminance
        // inversion plus the weight is the non-colour cue (WCAG 1.4.1). This
        // is the catalogue's one allow-listed exception to the button-idiom
        // guard (content/button-idiom.test.ts): a toggle chip, not a button,
        // so it does not take the button family's classes.
        active
          ? "border-accent bg-accent font-semibold text-ink-on-accent"
          : "border-border-strong bg-surface-raised font-medium text-ink-body hover:border-accent hover:text-accent-deep",
      )}
    >
      {icon}
      {children}
    </button>
  );
}

function StarIcon({ filled, className }: { filled: boolean; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      aria-hidden="true"
      className={className}
    >
      <path
        d="M12 3.5l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17.5 6.6 20.4l1-6.1-4.4-4.3 6.1-.9z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}
