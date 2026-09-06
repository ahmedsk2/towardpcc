import Link from "next/link";
import { site } from "@/content/site";
import { HOME_HREF } from "@/lib/home-href";

export type Crumb = { href?: string; label: string };

/**
 * Breadcrumb trail. Semantic `nav > ol` with `aria-current="page"` on the leaf
 * — the one pattern worth taking verbatim from the reference sites. Server
 * component: no JavaScript ships for it.
 */
export function Breadcrumbs({ trail }: { trail: Crumb[] }) {
  return (
    <nav aria-label={site.nav.breadcrumbAriaLabel} data-print="hide">
      <ol className="flex flex-wrap items-center gap-2 font-numeric text-[12px] text-ink-muted">
        <li>
          <Link
            href={HOME_HREF}
            // Breadcrumbs render on every inner page, so the default viewport
            // prefetch pulled home's RSC payload — measured at 76 KB — on each
            // one. Home is the largest flight payload on the site because the
            // hero mesh geometry is inlined in it, and it is one tap away from
            // anywhere, so paying for it up front on every page is the wrong
            // trade. site-header.tsx and main-nav.tsx opt out the same way.
            prefetch={false}
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
