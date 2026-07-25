"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { ScoreCategory, ScoreSummary } from "@towardpcc/scoring-engine";
import { StatusChip } from "@towardpcc/ui";
import { site } from "@/content/site";

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

  const grouped = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matched = q ? scores.filter((s) => s.name.toLowerCase().includes(q)) : scores;
    return CATEGORY_ORDER.map((cat) => ({
      category: cat,
      items: matched
        .filter((s) => s.category === cat)
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name)),
    })).filter((g) => g.items.length > 0);
  }, [scores, query]);

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

      {grouped.length === 0 ? (
        <p className="mt-10 text-ink-muted">{c.noResults}</p>
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
                  <li key={s.slug}>
                    <Link
                      href={`/calculators/${s.slug}`}
                      className="group flex items-center justify-between gap-3 rounded-lg border border-surface-sunken bg-surface-raised px-5 py-4 transition-colors duration-150 hover:border-ink-muted/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                    >
                      <span className="font-display text-[15px] font-medium text-ink-strong">
                        {s.name}
                      </span>
                      <span className="font-numeric text-xs text-ink-muted">v{s.version}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      <p className="mt-12">
        <StatusChip tone="accent">{scores.length} live</StatusChip>
      </p>
    </div>
  );
}
