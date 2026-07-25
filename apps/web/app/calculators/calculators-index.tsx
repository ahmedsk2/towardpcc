"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { ScoreCategory, ScoreSummary } from "@towardpcc/scoring-engine";
import { StatusChip, cn } from "@towardpcc/ui";
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

export function CalculatorsIndex({ scores }: { scores: readonly ScoreSummary[] }) {
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<ScoreCategory | null>(null);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const { favorites, toggle, ready } = useFavorites();

  // Categories actually present, in the canonical order.
  const presentCategories = useMemo(
    () => CATEGORY_ORDER.filter((cat) => scores.some((s) => s.category === cat)),
    [scores],
  );

  const grouped = useMemo(() => {
    const q = query.trim().toLowerCase();
    let matched = q ? scores.filter((s) => s.name.toLowerCase().includes(q)) : scores.slice();
    if (activeCategory) matched = matched.filter((s) => s.category === activeCategory);
    if (showFavoritesOnly) matched = matched.filter((s) => favorites.includes(s.slug));
    return CATEGORY_ORDER.map((cat) => ({
      category: cat,
      items: matched.filter((s) => s.category === cat).sort((a, b) => a.name.localeCompare(b.name)),
    })).filter((g) => g.items.length > 0);
  }, [scores, query, activeCategory, showFavoritesOnly, favorites]);

  const favoriteCount = favorites.length;

  return (
    <div>
      <div className="mt-8 max-w-md">
        <label htmlFor="calc-search" className="sr-only">
          {c.searchLabel}
        </label>
        <input
          id="calc-search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={c.searchPlaceholder}
          className="h-11 w-full rounded-md border border-edge bg-surface-raised px-3.5 text-ink-strong placeholder:text-ink-body/80 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent"
        />
      </div>

      {/* Category filter + favorites toggle */}
      <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label={c.filterGroupLabel}>
        <FilterChip
          active={activeCategory === null && !showFavoritesOnly}
          onClick={() => {
            setActiveCategory(null);
            setShowFavoritesOnly(false);
          }}
        >
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
            ★ {c.filterFavorites} ({favoriteCount})
          </FilterChip>
        )}
        {presentCategories.map((cat) => (
          <FilterChip
            key={cat}
            active={activeCategory === cat && !showFavoritesOnly}
            onClick={() => {
              setActiveCategory((cur) => (cur === cat ? null : cat));
              setShowFavoritesOnly(false);
            }}
          >
            {c.categoryLabels[cat]}
          </FilterChip>
        ))}
      </div>

      {grouped.length === 0 ? (
        <p className="mt-10 text-ink-muted">{showFavoritesOnly ? c.noFavorites : c.noResults}</p>
      ) : (
        <div className="mt-10 flex flex-col gap-10">
          {grouped.map((group) => (
            <section key={group.category} aria-labelledby={`cat-${group.category}`}>
              <h2
                id={`cat-${group.category}`}
                className="font-numeric text-[11px] tracking-[0.1em] text-ink-muted uppercase"
              >
                {c.categoryLabels[group.category]}
              </h2>
              <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                {group.items.map((s) => (
                  <li key={s.slug} className="flex items-stretch gap-2">
                    <Link
                      href={`/calculators/${s.slug}`}
                      className="group flex flex-1 items-center justify-between gap-3 rounded-lg border border-surface-sunken bg-surface-raised px-5 py-4 transition-colors duration-150 hover:border-ink-muted/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                    >
                      <span className="font-display text-[15px] font-medium text-ink-strong">
                        {s.name}
                      </span>
                      <span className="font-numeric text-xs text-ink-muted">v{s.version}</span>
                    </Link>
                    <button
                      type="button"
                      onClick={() => toggle(s.slug)}
                      aria-pressed={favorites.includes(s.slug)}
                      aria-label={
                        favorites.includes(s.slug)
                          ? `${c.removeFavorite} ${s.name}`
                          : `${c.addFavorite} ${s.name}`
                      }
                      className={cn(
                        "flex w-11 shrink-0 items-center justify-center rounded-lg border text-lg transition-colors duration-150",
                        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
                        favorites.includes(s.slug)
                          ? "border-accent/40 bg-accent-tint text-accent-deep"
                          : "border-surface-sunken bg-surface-raised text-ink-muted hover:text-ink-strong",
                      )}
                    >
                      <span aria-hidden="true">{favorites.includes(s.slug) ? "★" : "☆"}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      <div className="mt-12 flex flex-col gap-2">
        <StatusChip tone="accent">{scores.length} live</StatusChip>
        <p className="text-[13px] text-ink-muted">{c.favoritesNote}</p>
      </div>
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors duration-150",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
        active
          ? "border-accent/40 bg-accent-tint text-accent-deep"
          : "border-surface-sunken bg-surface-raised text-ink-body hover:border-ink-muted/40 hover:text-ink-strong",
      )}
    >
      {children}
    </button>
  );
}
