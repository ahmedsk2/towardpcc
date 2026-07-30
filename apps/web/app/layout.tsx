import type { Metadata } from "next";
import "@fontsource-variable/inter";
import "@fontsource-variable/space-grotesk";
import "@fontsource/ibm-plex-mono/400.css";
import "@fontsource/ibm-plex-mono/500.css";
import "./globals.css";
import { SiteHeader } from "@/components/nav/site-header";
import { BackToTop } from "@/components/nav/back-to-top";
import { SiteFooter } from "@/components/site-footer";
import { ServiceWorker } from "@/components/pwa/service-worker";
import { InstallPrompt } from "@/components/pwa/install-prompt";
import { site } from "@/content/site";
import { SITE_URL } from "@/lib/site-url";
import { graph, organizationSchema, webSiteSchema } from "@/lib/structured-data";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: site.metaTitle,
    template: `%s · ${site.name}`,
  },
  description: site.description,
  // Self-referencing canonical on every page, resolved against metadataBase.
  // The site previously emitted none at all while serving 200 on both the apex
  // and www, which is the same content on two origins with nothing telling a
  // crawler which one counts.
  alternates: { canonical: "./" },
  appleWebApp: { capable: true, title: site.name, statusBarStyle: "default" },
  // Social share card: the signature respiratory waveform — rolling and
  // continuous, never the flat line that reads as death in a PICU.
  openGraph: {
    type: "website",
    siteName: site.name,
    title: site.metaTitle,
    description: site.description,
    images: [
      {
        url: "/images/og-waveform.jpg",
        width: 1200,
        height: 630,
        alt: "TowardPCC: a glowing respiratory waveform on a deep oxblood field.",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: site.metaTitle,
    description: site.description,
    images: ["/images/og-waveform.jpg"],
  },
};

// Mirrors --color-surface-hero (packages/ui/src/tokens.css). A CSS variable
// cannot be used here — the browser reads this before any stylesheet loads.
export const viewport = {
  themeColor: "#260e1a",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="flex min-h-dvh flex-col">
        {/* Site-wide identity for search engines. Inline JSON-LD has no `src`,
            so it costs nothing against the route JS budget — the gate counts
            script tags that load a file. Per-page nodes (calculators) emit
            their own graph. */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: graph([organizationSchema(), webSiteSchema()]) }}
        />
        {/* Without JS, Reveal's SSR opacity:0 must not hide content. */}
        <noscript>
          {/* Without JS neither data-shown nor the reveal transition ever
              fires, so both the card and its top rule must resolve to their
              final state rather than staying invisible. */}
          {/* `scale`, not `transform`: Tailwind v4 compiles scale-x-* to the
              modern `scale` property, so a transform override here would be
              silently ignored and the rule would stay at zero width forever. */}
          <style>{`[data-reveal]{opacity:1 !important;transform:none !important}[data-rule]{scale:1 1 !important}`}</style>
        </noscript>
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
        {/* Last in the body: it is fixed-position, phone-only, and renders
            nothing at all on the server or on any device that is already
            installed, so it costs nothing where it does not apply. */}
        <InstallPrompt />
      </body>
    </html>
  );
}
