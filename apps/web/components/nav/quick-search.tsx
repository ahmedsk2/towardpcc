"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { ScoreCategory, ScoreSummary } from "@towardpcc/scoring-engine";
import { cn } from "@towardpcc/ui";
import { site } from "@/content/site";
import { matchScores } from "@/lib/calculator-search";

const MAX_RESULTS = 8;

/**
 * Search from any page, in the header.
 *
 * The index page has a search box and a "/" shortcut, and the mega-menu lists
 * every calculator by category. What neither gives a clinician who is already
 * ON a calculator is a way to reach a different one without leaving for the
 * index first. A child who is also oliguric should be one keystroke and a
 * name away, not a navigation. This is that. It shares the index's predicate,
 * so the two can never disagree about what a query finds.
 *
 * "/" IS OWNED BY WHICHEVER SEARCH IS ON THE PAGE. The index binds "/" to its
 * own, larger box and advertises it with a <kbd>; this component checks for
 * that box before binding, so the two never fight over the key and the index
 * hint stays true. Everywhere else, this one answers.
 *
 * A native combobox: the input owns focus and the arrow keys, the list is a
 * listbox with aria-activedescendant, and every option is a real link so the
 * mouse path needs no JavaScript at all. prefetch is off on each option, as in
 * the mega-menu: eight visible links must not pull eight route payloads on
 * every keystroke.
 *
 * FROM 1280px UP, NOT 1024. Measured 2026-09-03: at 1024 the header row —
 * brand 159, this box 224, nav 564, CTA 172, plus gaps — overflowed its
 * 1009px container by 227px with the menu CLOSED, and no width of box saves
 * it there (the box plus its gap is 252px). At 1280 the same row leaves
 * about 29px spare, so the box is 192px wide there and grows only at 2xl.
 * Below xl the mega-menu still lists every calculator and the index has its
 * own search. On a phone the drawer carries the full list.
 */
export function QuickSearch({
  scores,
  categoryLabels,
}: {
  scores: readonly ScoreSummary[];
  categoryLabels: Readonly<Record<ScoreCategory, string>>;
}) {
  const router = useRouter();
  const c = site.nav;
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  const results = useMemo(
    () => (query.trim() ? matchScores(scores, query, categoryLabels).slice(0, MAX_RESULTS) : []),
    [scores, query, categoryLabels],
  );

  // "/" focuses this box on every page that does not have the index's own.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "/" || e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      if (document.getElementById("calc-search")) return;
      e.preventDefault();
      inputRef.current?.focus();
      inputRef.current?.select();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  // A click outside closes the list; Escape is handled on the input.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const go = (slug: string) => {
    setOpen(false);
    setQuery("");
    router.push(`/calculators/${slug}`);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown" && results.length) {
      e.preventDefault();
      setOpen(true);
      setActive((i) => (i + 1) % results.length);
    } else if (e.key === "ArrowUp" && results.length) {
      e.preventDefault();
      setActive((i) => (i - 1 + results.length) % results.length);
    } else if (e.key === "Enter" && open && results[active]) {
      e.preventDefault();
      go(results[active].slug);
    } else if (e.key === "Escape") {
      if (open) setOpen(false);
      else {
        setQuery("");
        inputRef.current?.blur();
      }
    }
  };

  const showList = open && query.trim().length > 0;
  const activeId = showList && results[active] ? `${listId}-${results[active].slug}` : undefined;

  return (
    <div ref={rootRef} className="relative hidden xl:block">
      <label htmlFor={`${listId}-input`} className="sr-only">
        {c.quickSearchLabel}
      </label>
      <input
        ref={inputRef}
        id={`${listId}-input`}
        type="search"
        role="combobox"
        aria-expanded={showList && results.length > 0}
        aria-controls={listId}
        aria-autocomplete="list"
        {...(activeId ? { "aria-activedescendant": activeId } : {})}
        autoComplete="off"
        value={query}
        placeholder={c.quickSearchPlaceholder}
        onChange={(e) => {
          setQuery(e.target.value);
          setActive(0);
          setOpen(true);
        }}
        onFocus={() => {
          if (query.trim()) setOpen(true);
        }}
        onKeyDown={onKeyDown}
        className="h-9 w-48 rounded-full border 2xl:w-56 border-border-strong bg-surface-raised ps-9 pe-3 text-sm text-ink-strong transition-[border-color,box-shadow] duration-150 ease-[var(--motion-ease)] placeholder:text-ink-muted hover:border-ink-muted/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent motion-reduce:transition-none"
      />
      {/* A magnifier in the site's own stroke; aria-hidden because the label
          already says what the box is. */}
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-ink-muted"
      >
        <circle cx="11" cy="11" r="6" />
        <path d="M20 20l-4.2-4.2" />
      </svg>
      {query.trim() ? null : (
        <kbd
          aria-hidden="true"
          className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 rounded border border-border px-1.5 py-0.5 font-numeric text-[10px] text-ink-muted"
        >
          /
        </kbd>
      )}

      <ul
        id={listId}
        role="listbox"
        aria-label={c.quickSearchLabel}
        hidden={!showList}
        className="absolute end-0 top-full z-50 mt-2 w-80 overflow-hidden rounded-lg border border-border bg-surface-raised p-1.5 shadow-[var(--shadow-lg)]"
      >
        {results.length === 0 ? (
          <li role="option" aria-selected={false} className="px-3 py-2.5 text-sm text-ink-muted">
            {c.quickSearchNoResults}
          </li>
        ) : (
          results.map((s, i) => (
            <li
              key={s.slug}
              id={`${listId}-${s.slug}`}
              role="option"
              aria-selected={i === active}
              onMouseEnter={() => setActive(i)}
            >
              <Link
                href={`/calculators/${s.slug}`}
                prefetch={false}
                tabIndex={-1}
                onClick={() => go(s.slug)}
                className={cn(
                  "flex items-baseline justify-between gap-3 rounded-md px-3 py-2 text-sm transition-[background-color,color] duration-150 ease-[var(--motion-ease)] motion-reduce:transition-none",
                  i === active ? "bg-accent-tint text-accent-deep" : "text-ink-body",
                )}
              >
                <span className="font-medium">{s.name}</span>
                <span className="shrink-0 font-numeric text-[11px] tracking-[0.06em] text-ink-muted uppercase">
                  {categoryLabels[s.category]}
                </span>
              </Link>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
