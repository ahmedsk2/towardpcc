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
        className="rounded-sm text-sm text-ink-on-dark/75 transition-colors duration-150 hover:text-ink-on-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-bright"
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
        <div className="flex flex-col justify-between gap-10 md:flex-row">
          <div className="max-w-xs">
            <p className="font-display text-lg font-bold tracking-tight">
              Toward<span className="text-accent-bright">PCC</span>
            </p>
            <p className="mt-2 text-sm text-ink-on-dark/75">{site.tagline}</p>
          </div>
          <nav aria-label={site.footer.navAriaLabel} className="flex gap-16">
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
