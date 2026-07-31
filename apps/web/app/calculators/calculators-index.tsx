"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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

export function CalculatorsIndex({
  scores,
  inputCounts = {},
}: {
  scores: readonly ScoreSummary[];
  /** slug → number of inputs, read from each definition on the server. */
  inputCounts?: Record<string, number>;
}) {
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
  const shownCount = grouped.reduce((n, g) => n + g.items.length, 0);
  const isFiltered = Boolean(query.trim() || activeCategory || showFavoritesOnly);

  /** How many scores sit in each category, so a chip can say what it will give
   *  you before you press it rather than after. */
  const categoryCounts = useMemo(() => {
    const counts = {} as Record<ScoreCategory, number>;
    for (const s of scores) counts[s.category] = (counts[s.category] ?? 0) + 1;
    return counts;
  }, [scores]);

  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    /**
     * "/" jumps to search, the convention every catalogue this audience uses
     * already has. Ignored while typing — otherwise it steals the key from
     * anyone entering a slash into a field, which on a site full of ratio
     * scores ("P/F") is not hypothetical.
     */
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

  return (
    <div>
      <div className="mt-8 max-w-md">
        <label htmlFor="calc-search" className="sr-only">
          {c.searchLabel}
        </label>
        <div className="relative">
          <input
            ref={searchRef}
            id="calc-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={c.searchPlaceholder}
            className="h-11 w-full rounded-md border border-border-strong bg-surface-raised px-3.5 pe-12 text-ink-strong placeholder:text-ink-body/80 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent"
          />
          {/* Discoverability for the "/" shortcut. aria-hidden because a screen
              reader user is told about it in the label, not by a glyph — and
              hidden once there is text, where it would sit over the clear
              button on some browsers. */}
          {query ? null : (
            <kbd
              aria-hidden="true"
              className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 rounded border border-border px-1.5 py-0.5 font-numeric text-[11px] text-ink-muted"
            >
              /
            </kbd>
          )}
        </div>
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
            <span aria-hidden="true">★</span> {c.filterFavorites} ({favoriteCount})
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
            {/* The count sits inside the chip so it says what pressing it will
                give you, rather than leaving you to press and find out. */}
            <span aria-hidden="true" className="ms-1.5 tabular-nums opacity-60">
              {categoryCounts[cat]}
            </span>
          </FilterChip>
        ))}
      </div>

      {/* A tally, but only while something is filtering — on an unfiltered
          list "showing 22 of 22" is noise, and the page already says 22. */}
      {isFiltered ? (
        <p aria-live="polite" className="mt-6 font-numeric text-sm text-ink-muted">
          Showing <span className="tabular-nums text-ink-strong">{shownCount}</span> of{" "}
          <span className="tabular-nums">{scores.length}</span>
        </p>
      ) : null}

      {grouped.length === 0 ? (
        /* A designed empty state rather than a bare sentence: it names what was
           searched for, and gives the way out. A dead end with no control is
           how a catalogue makes someone think the tool is broken rather than
           that their query was too narrow. */
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
            onClick={() => {
              setQuery("");
              setActiveCategory(null);
              setShowFavoritesOnly(false);
              searchRef.current?.focus();
            }}
            className="mt-5 inline-flex min-h-11 items-center rounded-full border border-border-strong px-5 text-sm font-medium text-ink-strong transition-colors duration-150 hover:border-accent hover:text-accent-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            Clear filters
          </button>
        </div>
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
                      className="group flex flex-1 flex-col justify-between gap-3 rounded-lg border border-border bg-surface-raised px-5 py-4 transition-[border-color,translate,box-shadow] duration-200 hover:-translate-y-1 hover:border-accent/40 hover:shadow-[var(--shadow-accent)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                    >
                      <span className="font-display text-[15px] font-medium text-ink-strong">
                        {s.name}
                      </span>
                      {/* Data pairs: what the score needs, before you open it. */}
                      <span className="flex flex-wrap items-center gap-x-4 gap-y-1 font-numeric text-[11px] text-ink-muted">
                        <span>v{s.version}</span>
                        {inputCounts[s.slug] ? (
                          <span>
                            {inputCounts[s.slug]} input
                            {inputCounts[s.slug] === 1 ? "" : "s"}
                          </span>
                        ) : null}
                        <span className="text-accent opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                          Open →
                        </span>
                      </span>
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
                          : "border-border-strong bg-surface-raised text-ink-muted hover:text-ink-strong",
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
        "rounded-full border px-3.5 py-1.5 text-sm transition-colors duration-150",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
        // Selected state carries a non-color cue (checkmark + heavier weight) so
        // it never relies on color alone (WCAG 1.4.1); cf. the active nav link's
        // underline.
        active
          ? "border-accent/40 bg-accent-tint font-semibold text-accent-deep"
          : "border-border-strong bg-surface-raised font-medium text-ink-body hover:border-ink-muted/40 hover:text-ink-strong",
      )}
    >
      {active && <span aria-hidden="true">✓ </span>}
      {children}
    </button>
  );
}
