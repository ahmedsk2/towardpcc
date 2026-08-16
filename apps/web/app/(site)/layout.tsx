import { SiteHeader } from "@/components/nav/site-header";
import { BackToTop } from "@/components/nav/back-to-top";
import { SiteFooter } from "@/components/site-footer";
import { ServiceWorker } from "@/components/pwa/service-worker";
import { InstallPrompt } from "@/components/pwa/install-prompt";
import { site } from "@/content/site";

/**
 * THE SITE CHROME: header, footer, skip link, and the two PWA helpers.
 *
 * It lives here rather than in the root layout so that ONE route can opt out.
 * `/` serves a bare pre-launch holding page with no navigation at all, and a
 * root layout that renders a header cannot be told to skip it — App Router
 * layouts cannot read the pathname, and reading it from a header would make
 * every page dynamic and cost the static build.
 *
 * A route group changes no URL. Every page under `(site)` is served at exactly
 * the path it had before.
 *
 * RESTORING THE HOME PAGE does not require undoing this. Move
 * `(site)/home/page.tsx` back to `(site)/page.tsx` and delete the root
 * `page.tsx`; the group can stay.
 */
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <a
        href="#content"
        className="sr-only rounded-sm bg-surface-raised px-4 py-2 font-medium text-accent-deep focus-visible:not-sr-only focus-visible:absolute focus-visible:top-2 focus-visible:left-2 focus-visible:z-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        {site.nav.skipToContent}
      </a>
      <ServiceWorker />
      <SiteHeader />
      <main id="content" tabIndex={-1} className="flex-1">
        {children}
      </main>
      <SiteFooter />
      <BackToTop />
      {/* Last in the body: fixed-position, phone-only, and renders nothing on
          the server or on an already-installed device. */}
      <InstallPrompt />
    </>
  );
}
