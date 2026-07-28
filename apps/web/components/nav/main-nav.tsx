"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { cn } from "@towardpcc/ui";
import { site } from "@/content/site";

export type MegaGroup = {
  category: string;
  label: string;
  items: { slug: string; name: string; meta: string }[];
};

const links = [
  { href: "/calculators", label: site.nav.calculators, mega: true },
  { href: "/knowledge", label: site.nav.knowledge, mega: false },
  { href: "/data", label: site.nav.data, mega: false },
  { href: "/services", label: site.nav.services, mega: false },
  { href: "/about", label: site.nav.about, mega: false },
  { href: "/contact", label: site.nav.contact, mega: false },
];

/**
 * Main navigation: a mega-menu for the calculator catalogue on pointer
 * devices, and an off-canvas drawer on small screens.
 *
 * The mega-menu opens on hover for fine pointers AND on click for everyone,
 * so it is reachable by keyboard and touch — the reference implementations
 * are hover-only, which strands both. Escape closes and restores focus.
 */
export function MainNav({ groups }: { groups: MegaGroup[] }) {
  const pathname = usePathname();
  // Derived open state: each surface remembers which path it was opened on, so
  // any route change closes it without an effect (the idiom the previous nav
  // used, and the reason no cascading render is needed here).
  const [megaAt, setMegaAt] = useState<string | null>(null);
  const [drawerAt, setDrawerAt] = useState<string | null>(null);
  const mega = megaAt === pathname;
  const drawer = drawerAt === pathname;
  const setMega = (v: boolean) => setMegaAt(v ? pathname : null);
  const setDrawer = (v: boolean) => setDrawerAt(v ? pathname : null);

  const triggerRef = useRef<HTMLButtonElement>(null);
  const wrapRef = useRef<HTMLLIElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Escape closes whichever surface is open; outside-click closes the mega.
  useEffect(() => {
    // Uses the raw state setters (stable across renders) rather than the
    // derived helpers, so the listeners are registered once per open state.
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (mega) {
        setMegaAt(null);
        triggerRef.current?.focus();
      }
      setDrawerAt(null);
    };
    const onClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setMegaAt(null);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("click", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("click", onClick);
    };
  }, [mega]);

  // The drawer owns the viewport while open.
  useEffect(() => {
    if (!drawer) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [drawer]);

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  const hoverOpen = () => {
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    clearTimeout(closeTimer.current);
    setMega(true);
  };
  const hoverClose = () => {
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    closeTimer.current = setTimeout(() => setMega(false), 150);
  };

  return (
    <>
      <nav aria-label={site.nav.mainAriaLabel} className="ms-auto hidden lg:block">
        <ul className="flex items-center gap-1">
          {links.map(({ href, label, mega: hasMega }) => {
            const active = isActive(href);
            if (!hasMega) {
              return (
                <li key={href}>
                  <Link
                    href={href}
                    aria-current={active ? "page" : undefined}
                    className={cn(navLink, active && navLinkActive)}
                  >
                    {label}
                  </Link>
                </li>
              );
            }
            return (
              <li
                key={href}
                ref={wrapRef}
                className="relative"
                onMouseEnter={hoverOpen}
                onMouseLeave={hoverClose}
              >
                <button
                  ref={triggerRef}
                  type="button"
                  aria-expanded={mega}
                  aria-controls="mega-calculators"
                  onClick={() => setMega(!mega)}
                  className={cn(navLink, active && navLinkActive)}
                >
                  {label}
                  <svg
                    viewBox="0 0 10 6"
                    fill="none"
                    aria-hidden="true"
                    className={cn("size-2 transition-transform duration-150", mega && "rotate-180")}
                  >
                    <path
                      d="M1 1l4 4 4-4"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                    />
                  </svg>
                </button>

                {mega && (
                  <div
                    id="mega-calculators"
                    className="absolute end-0 top-full z-50 mt-2 grid w-[min(860px,calc(100vw-3rem))] grid-cols-3 gap-x-6 rounded-lg border border-border bg-surface-raised p-6 shadow-2xl motion-safe:animate-[megaIn_180ms_var(--motion-ease)_both]"
                  >
                    <div className="col-span-3 mb-1 flex items-center justify-between gap-4 border-b border-border-subtle pb-3">
                      <p className="m-0 text-sm text-ink-muted">
                        <strong className="font-semibold text-ink-strong">
                          {groups.reduce((n, g) => n + g.items.length, 0)} calculators
                        </strong>{" "}
                        — {site.nav.calculatorsMenuIntro}
                      </p>
                      <Link
                        href="/calculators"
                        className="shrink-0 rounded-sm font-numeric text-[11px] tracking-[0.09em] text-accent uppercase focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                      >
                        {site.nav.browseAll} →
                      </Link>
                    </div>

                    {[0, 1, 2].map((col) => (
                      <div key={col}>
                        {groups
                          .filter((_, i) => i % 3 === col)
                          .map((g) => (
                            <div key={g.category}>
                              <p className="m-0 px-2 pt-3 pb-1 font-numeric text-[11px] font-semibold tracking-[0.11em] text-accent uppercase">
                                {g.label}
                              </p>
                              {g.items.map((it) => (
                                <Link
                                  key={it.slug}
                                  href={`/calculators/${it.slug}`}
                                  // Opening the menu must not prefetch 22 routes
                                  // at once — that is real bandwidth on hospital
                                  // wifi for pages the user probably won't open.
                                  prefetch={false}
                                  className="block rounded-md px-2 py-1.5 text-sm font-medium text-ink-strong transition-colors duration-150 hover:bg-accent-tint hover:text-accent-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                                >
                                  {it.name}
                                  <span className="block font-numeric text-[11px] font-normal text-ink-muted">
                                    {it.meta}
                                  </span>
                                </Link>
                              ))}
                            </div>
                          ))}
                      </div>
                    ))}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </nav>

      <Link
        href="/calculators"
        className="ms-auto hidden shrink-0 items-center justify-center rounded-full bg-accent px-5 py-2.5 text-sm font-bold text-ink-on-accent transition-colors duration-150 hover:bg-accent-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent lg:ms-6 lg:inline-flex"
      >
        {site.nav.headerCta}
      </Link>

      {/* Mobile trigger */}
      <button
        type="button"
        aria-expanded={drawer}
        aria-controls="nav-drawer"
        onClick={() => setDrawer(true)}
        className="ms-auto rounded-md border border-border-strong p-2.5 text-ink-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent lg:hidden"
      >
        <span className="sr-only">{site.nav.menuLabel}</span>
        <svg viewBox="0 0 18 14" fill="none" aria-hidden="true" className="size-4">
          <path d="M0 1h18M0 7h18M0 13h18" stroke="currentColor" strokeWidth="2" />
        </svg>
      </button>

      {/* Off-canvas drawer */}
      {drawer && (
        <div className="fixed inset-0 z-[100] lg:hidden">
          <button
            type="button"
            aria-label={site.nav.closeMenuLabel}
            onClick={() => setDrawer(false)}
            className="absolute inset-0 h-full w-full cursor-zoom-out bg-black/50"
          />
          <div
            id="nav-drawer"
            className="absolute inset-y-0 end-0 flex w-[min(20rem,85vw)] flex-col overflow-y-auto bg-surface-raised p-6 shadow-lg"
          >
            <div className="mb-6 flex items-center justify-between">
              <span className="font-display text-lg font-bold text-ink-strong">
                Toward<span className="text-accent">PCC</span>
              </span>
              <button
                type="button"
                onClick={() => setDrawer(false)}
                className="rounded-md border border-border-strong p-2 text-ink-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                <span className="sr-only">{site.nav.closeMenuLabel}</span>
                <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" className="size-4">
                  <path
                    d="M2 2l12 12M14 2L2 14"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </div>
            <ul className="flex flex-col gap-1">
              {links.map(({ href, label }) => (
                <li key={href}>
                  <Link
                    href={href}
                    aria-current={isActive(href) ? "page" : undefined}
                    className={cn(
                      "block rounded-md px-3 py-3 text-base font-semibold transition-colors duration-150",
                      "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
                      isActive(href)
                        ? "bg-accent-tint text-accent-deep"
                        : "text-ink-strong hover:bg-surface-sunken",
                    )}
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
            <Link
              href="/calculators"
              className="mt-6 inline-flex min-h-11 items-center justify-center rounded-full bg-accent px-5 text-sm font-bold text-ink-on-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              {site.nav.headerCta}
            </Link>
          </div>
        </div>
      )}
    </>
  );
}

const navLink =
  "inline-flex items-center gap-1.5 rounded-md px-3.5 py-2.5 text-[15px] font-semibold text-ink-strong transition-colors duration-150 hover:bg-accent-tint hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";
const navLinkActive = "text-accent";
