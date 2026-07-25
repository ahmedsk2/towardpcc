import Link from "next/link";
import { site } from "@/content/site";
import { NavLinks } from "./nav-links";

export function SiteHeader() {
  return (
    <header className="relative border-b border-surface-sunken bg-surface-raised">
      <div className="mx-auto flex h-[68px] max-w-[1400px] items-center justify-between px-6">
        <Link
          href="/"
          aria-label={site.nav.homeAriaLabel}
          className="rounded-sm font-display text-xl font-bold tracking-tight text-ink-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          Toward<span className="text-accent">PCC</span>
        </Link>
        <NavLinks />
      </div>
    </header>
  );
}
