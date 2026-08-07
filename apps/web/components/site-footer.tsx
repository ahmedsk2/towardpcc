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
  { href: "/trust", label: site.nav.trust },
  { href: "/validation", label: site.nav.validation },
  { href: "/contact", label: site.nav.contact },
  { href: "/install", label: site.pwa.installTitle },
];

// A coral rule that wipes in under a link on hover, out through the other edge
// on leave — the footer/utility-bar counterpart to the nav trace. `w-fit` keeps
// the hit area on the text; `inline-flex` gives the absolute rule a context.
// `transition-[scale]` because scale-x-* compiles to the `scale` property.
const coralRule =
  "pointer-events-none absolute inset-x-0 -bottom-0.5 h-px origin-right scale-x-0 bg-coral transition-[scale] duration-150 ease-[var(--motion-ease)] group-hover:origin-left group-hover:scale-x-100 group-focus-visible:origin-left group-focus-visible:scale-x-100 motion-reduce:transition-none";

function FooterLink({ href, label }: { href: string; label: string }) {
  return (
    <li>
      <Link
        href={href}
        className="group relative inline-flex w-fit rounded-sm text-sm text-ink-on-dark/75 transition-colors duration-150 hover:text-ink-on-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-coral"
      >
        {label}
        <span aria-hidden="true" className={coralRule} />
      </Link>
    </li>
  );
}

export function SiteFooter() {
  return (
    <footer className="relative overflow-hidden bg-surface-hero text-ink-on-dark">
      {/* A single warm horizon along the top edge, so the footer reads as the
          bottom of a room rather than as the page running out. Same family and
          the same constraint as the counter band: decorative, dark-ground only,
          never a boundary or an icon. */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-coral-soft/45 to-transparent"
      />
      <div className="relative mx-auto max-w-[1400px] px-6 py-14">
        <div className="grid gap-10 md:grid-cols-[1.5fr_repeat(3,1fr)]">
          <div className="max-w-sm">
            <div className="flex items-center gap-2.5">
              <span className="grid size-9 place-items-center rounded-[11px] bg-gradient-accent">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-hidden="true"
                  className="size-5 text-ink-on-accent"
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
            {/* `flex w-fit`, not `inline-flex`. Both links were inline-level, so
                they shared a line box and ran together as
                "info@towardpicu.comFounder ORCID profile" — the margin-top on the
                second one cannot separate two boxes that are on the same line.
                `w-fit` keeps each hit area to its own text rather than the
                column width. */}
            <a
              href={`mailto:${site.utility.email}`}
              className="mt-4 flex w-fit rounded-sm font-numeric text-xs tracking-[0.06em] text-coral transition-colors duration-150 hover:text-coral-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-coral"
            >
              {site.utility.email}
            </a>
            {/* Scholarly identity, not a social link. The footer deliberately
                carries no social icons — none of those accounts exist — but an
                ORCID is a verifiable public record, which is the kind of link
                an institution checking whether this is real actually follows. */}
            <a
              href={site.utility.orcid}
              rel="me noopener"
              className="mt-2 flex w-fit items-center gap-1.5 rounded-sm font-numeric text-xs tracking-[0.06em] text-ink-on-dark/70 transition-colors duration-150 hover:text-coral focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-coral"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true" className="size-3.5 shrink-0">
                <circle
                  cx="12"
                  cy="12"
                  r="10"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                />
                <path
                  d="M9 8.5v7M9 6.6v.1M12.6 8.5h2.1a3.5 3.5 0 0 1 0 7h-2.1v-7Z"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              {site.utility.orcidLabel}
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
        {/* The two load-bearing claims, restated where every page ends. Both
            are checkable rather than asserted — the first by a zero-network
            test that runs on every release, the second by where the database
            actually is — which is why they earn the last thing a reader sees. */}
        <ul className="mt-12 flex list-none flex-wrap gap-2.5 border-t border-ink-on-dark/15 pt-6">
          {[site.footer.privacyBadge, site.footer.residency].map((claim) => (
            <li
              key={claim}
              className="inline-flex items-center gap-2 rounded-full border border-ink-on-dark/20 bg-white/5 px-3.5 py-1.5 font-numeric text-[11.5px] tracking-[0.03em] text-ink-on-dark/80"
            >
              <svg
                viewBox="0 0 16 16"
                fill="none"
                aria-hidden="true"
                className="size-3.5 shrink-0 text-coral"
              >
                <path
                  d="M8 1.5 3 3.5v4c0 3 2.1 5.6 5 6.9 2.9-1.3 5-3.9 5-6.9v-4L8 1.5Z"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinejoin="round"
                />
                <path
                  d="m5.9 7.9 1.5 1.5 3-3.2"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              {claim}
            </li>
          ))}
        </ul>

        <p className="mt-6 text-sm text-ink-on-dark/60">
          © {new Date().getFullYear()} {site.footer.orgName}
        </p>
      </div>
    </footer>
  );
}
