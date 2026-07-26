import Link from "next/link";
import { site } from "@/content/site";

const pillarLinks = [
  { href: "/calculators", label: site.nav.calculators },
  { href: "/knowledge", label: site.nav.knowledge },
  { href: "/data", label: site.nav.data },
  { href: "/services", label: site.nav.services },
];

const siteLinks = [
  { href: "/about", label: site.nav.about },
  { href: "/contact", label: site.nav.contact },
  { href: "/install", label: site.pwa.installTitle },
];

function FooterLink({ href, label }: { href: string; label: string }) {
  return (
    <li>
      <Link
        href={href}
        className="rounded-sm text-sm text-ink-on-dark/75 transition-colors duration-150 hover:text-ink-on-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-coral"
      >
        {label}
      </Link>
    </li>
  );
}

export function SiteFooter() {
  return (
    <footer className="bg-surface-hero text-ink-on-dark">
      <div className="mx-auto max-w-[1400px] px-6 py-14">
        <div className="grid gap-10 md:grid-cols-[1.5fr_repeat(3,1fr)]">
          <div className="max-w-sm">
            <div className="flex items-center gap-2.5">
              <span className="grid size-9 place-items-center rounded-[11px] bg-gradient-accent">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-hidden="true"
                  className="size-5 text-white"
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
              <p className="font-display text-xl font-bold tracking-tight">
                Toward<span className="text-coral">PCC</span>
              </p>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-ink-on-dark/70">{site.footer.vision}</p>
            <a
              href={`mailto:${site.utility.email}`}
              className="mt-4 inline-flex rounded-sm font-numeric text-xs tracking-[0.06em] text-coral transition-colors duration-150 hover:text-coral-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-coral"
            >
              {site.utility.email}
            </a>
          </div>
          <nav
            aria-label={site.footer.navAriaLabel}
            className="grid grid-cols-2 gap-8 sm:grid-cols-3 md:col-span-3"
          >
            <div>
              <h2 className="text-sm font-semibold">{site.footer.pillarsHeading}</h2>
              <ul className="mt-3 space-y-2">
                {pillarLinks.map((l) => (
                  <FooterLink key={l.href} {...l} />
                ))}
              </ul>
            </div>
            <div>
              <h2 className="text-sm font-semibold">{site.footer.siteHeading}</h2>
              <ul className="mt-3 space-y-2">
                {siteLinks.map((l) => (
                  <FooterLink key={l.href} {...l} />
                ))}
              </ul>
            </div>
            <div>
              <h2 className="text-sm font-semibold">{site.footer.legalHeading}</h2>
              <ul className="mt-3 space-y-2">
                {site.footer.legalLinks.map((l) => (
                  <FooterLink key={l.href} {...l} />
                ))}
              </ul>
            </div>
          </nav>
        </div>
        <div className="mt-12 flex flex-col gap-3 border-t border-ink-on-dark/15 pt-6 md:flex-row md:items-center md:justify-between">
          <p className="text-sm text-ink-on-dark/60">
            © {new Date().getFullYear()} {site.footer.orgName}
          </p>
          <p className="font-numeric text-xs tracking-[0.08em] text-ink-on-dark/60 uppercase">
            {site.footer.residency}
          </p>
        </div>
      </div>
    </footer>
  );
}
