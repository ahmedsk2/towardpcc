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
import { site } from "@/content/site";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://towardpcc.com"),
  title: {
    default: site.metaTitle,
    template: `%s · ${site.name}`,
  },
  description: site.description,
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
        alt: "TowardPCC — a glowing respiratory waveform on a deep oxblood field.",
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
        {/* Without JS, Reveal's SSR opacity:0 must not hide content. */}
        <noscript>
          <style>{`[data-reveal]{opacity:1 !important;transform:none !important}`}</style>
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
      </body>
    </html>
  );
}
