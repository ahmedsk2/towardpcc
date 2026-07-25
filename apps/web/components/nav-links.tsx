"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef, useState } from "react";
import { cn } from "@towardpcc/ui";
import { site } from "@/content/site";

const links = [
  { href: "/calculators", label: site.nav.calculators },
  { href: "/knowledge", label: site.nav.knowledge },
  { href: "/data", label: site.nav.data },
  { href: "/services", label: site.nav.services },
  { href: "/about", label: site.nav.about },
  { href: "/contact", label: site.nav.contact },
];

export function NavLinks() {
  const pathname = usePathname();
  // Derived open state: the menu remembers which path it was opened on, so
  // any route change (logo click, back/forward) closes it without effects.
  const [openAt, setOpenAt] = useState<string | null>(null);
  const open = openAt === pathname;
  const setOpen = (v: boolean) => setOpenAt(v ? pathname : null);
  const toggleRef = useRef<HTMLButtonElement>(null);

  const items = links.map(({ href, label }) => {
    const active = pathname === href || pathname.startsWith(`${href}/`);
    return (
      <li key={href}>
        <Link
          href={href}
          aria-current={active ? "page" : undefined}
          onClick={() => setOpen(false)}
          className={cn(
            "block rounded-sm px-3 py-2 text-[15px] font-medium transition-colors duration-150",
            "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
            // Active state pairs color with a non-color cue (underline)
            active
              ? "text-accent-deep underline decoration-accent decoration-2 underline-offset-8"
              : "text-ink-body hover:text-ink-strong",
          )}
        >
          {label}
        </Link>
      </li>
    );
  });

  return (
    <nav
      aria-label={site.nav.mainAriaLabel}
      onKeyDown={(e) => {
        if (e.key === "Escape" && open) {
          setOpen(false);
          toggleRef.current?.focus();
        }
      }}
    >
      <button
        ref={toggleRef}
        type="button"
        aria-expanded={open}
        aria-controls="site-nav"
        onClick={() => setOpen(!open)}
        className="rounded-sm px-3 py-2 text-[15px] font-medium text-ink-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent md:hidden"
      >
        {site.nav.menuLabel}
      </button>
      <ul
        id="site-nav"
        className={cn(
          "md:flex md:flex-row md:items-center md:gap-1",
          open
            ? "absolute inset-x-0 top-full flex flex-col gap-1 border-b border-surface-sunken bg-surface-raised p-3 shadow-sm md:static md:border-0 md:bg-transparent md:p-0 md:shadow-none"
            : "hidden md:flex",
        )}
      >
        {items}
      </ul>
    </nav>
  );
}
