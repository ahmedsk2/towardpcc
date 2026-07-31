import Link from "next/link";
import { site } from "@/content/site";

export type Crumb = { href?: string; label: string };

/**
 * Breadcrumb trail. Semantic `nav > ol` with `aria-current="page"` on the leaf
 * — the one pattern worth taking verbatim from the reference sites. Server
 * component: no JavaScript ships for it.
 */
export function Breadcrumbs({ trail }: { trail: Crumb[] }) {
  return (
    <nav aria-label={site.nav.breadcrumbAriaLabel} data-print="hide">
      <ol className="flex flex-wrap items-center gap-2 font-numeric text-[11px] tracking-[0.06em] text-ink-muted uppercase">
        <li>
          <Link
            href="/"
            className="rounded-sm transition-colors duration-150 hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            {site.nav.breadcrumbHome}
          </Link>
        </li>
        {trail.map((crumb, i) => {
          const last = i === trail.length - 1;
          return (
            <li key={crumb.label} className="flex items-center gap-2">
              {/* `text-edge` was here and was dead: --color-edge does not exist,
                  so the class emitted nothing and the slash simply inherited
                  ink-muted from the list. Naming the token it was already
                  rendering as costs no visual change and removes a class that
                  looked deliberate while doing nothing — the same shape of
                  defect as the border-token bug tokens.css:49 records. */}
              <span aria-hidden="true" className="text-ink-muted">
                /
              </span>
              {last || !crumb.href ? (
                <span aria-current={last ? "page" : undefined} className="text-ink-strong">
                  {crumb.label}
                </span>
              ) : (
                <Link
                  href={crumb.href}
                  className="rounded-sm transition-colors duration-150 hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                >
                  {crumb.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
