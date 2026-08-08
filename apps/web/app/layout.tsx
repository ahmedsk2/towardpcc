import { FRAGMENT_LIFT_SCRIPT } from "@/lib/fragment-lift";
import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { SiteHeader } from "@/components/nav/site-header";
import { BackToTop } from "@/components/nav/back-to-top";
import { SiteFooter } from "@/components/site-footer";
import { ServiceWorker } from "@/components/pwa/service-worker";
import { InstallPrompt } from "@/components/pwa/install-prompt";
import { site } from "@/content/site";
import { SITE_URL } from "@/lib/site-url";
import { graph, organizationSchema, webSiteSchema } from "@/lib/structured-data";

/**
 * Self-hosted type, loaded through next/font rather than @fontsource's plain
 * stylesheets (SIL OFL either way — see ADR-design-direction and ./fonts/;
 * the woff2 files there are the same ones @fontsource shipped).
 *
 * Two things do the work, and BOTH are needed.
 *
 * 1. next/font emits a companion @font-face for the system fallback with
 *    size-adjust / ascent-override / descent-override derived from the real
 *    font's metrics, so the fallback occupies roughly the same space.
 *    @fontsource ships no such fallback, which is why swapping Inter in was
 *    measured shifting PRISM's 6651px form by CLS 0.405 locally (0.206 on
 *    production) — four times the PRD §10 budget. The shift scales with how
 *    much content the reflow moves, so the longest calculator was worst hit.
 *
 * 2. `display: "optional"`, not "swap". The metric match is close but not
 *    exact, and "swap" leaves the outcome to a race: whether the font beats
 *    first paint varies per page and per run. Measured with "swap", the
 *    residual mismatch still cost CLS 0.151 on anion-gap and 0.122 on phoenix
 *    (reproduced 3/3 each), and tuning the mono fallback only moved the
 *    problem between pages — 0.000 on PRISM traded for those two.
 *    "optional" removes the race outright: the browser either has the font
 *    within its short block period or keeps the fallback for that page view
 *    and never swaps. Measured CLS 0.000 on all of home, /calculators,
 *    anion-gap, prism, phoenix and trust, with no LCP cost.
 *
 * The trade is deliberate: on a cold first visit over a slow link a reader may
 * get the metric-matched fallback rather than Inter for that page view, and
 * the real face from the next navigation on. A clinician typing values into a
 * form should never have it move under their finger; that outranks first-paint
 * brand fidelity here. Revisit only WITH numbers.
 *
 * Variables (not family names) because next/font generates a hashed family;
 * packages/ui/src/tokens.css consumes these and keeps the generic fallbacks.
 */
const fontBody = localFont({
  src: "./fonts/inter-latin-wght-normal.woff2",
  weight: "100 900",
  style: "normal",
  display: "optional",
  variable: "--font-inter",
});

const fontDisplay = localFont({
  src: "./fonts/space-grotesk-latin-wght-normal.woff2",
  weight: "300 700",
  style: "normal",
  display: "optional",
  variable: "--font-space-grotesk",
});

const fontNumeric = localFont({
  src: [
    { path: "./fonts/ibm-plex-mono-latin-400-normal.woff2", weight: "400", style: "normal" },
    { path: "./fonts/ibm-plex-mono-latin-500-normal.woff2", weight: "500", style: "normal" },
  ],
  display: "optional",
  variable: "--font-plex-mono",
  // Keep the default (Arial-derived) adjustment even though Arial is not
  // monospaced: with it off, PRISM measured CLS 0.201 against 0.000 with it on.
  // What matters is the vertical metric match, not the advance width, and the
  // numeric face lands in enough of PRISM's 25 rows to move the form by itself.
  // Under `display: "optional"` this now only governs how close the fallback
  // sits when the font does not arrive in time — but that is still the case
  // worth getting right, since it is the one a first-time reader sees.
});

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
    <html
      lang="en"
      className={`${fontBody.variable} ${fontDisplay.variable} ${fontNumeric.variable}`}
    >
      <body className="flex min-h-dvh flex-col">
        {/* FIRST, BEFORE ANYTHING ELSE: take the fragment out of the URL.

            A shared or reloaded calculator link carries every entered value in
            its fragment. That was chosen because browsers never transmit a
            fragment — true of the BROWSER, and false in effect, because a
            script running in the document can read `location.href` and send it
            itself. Cloudflare's JS Detections does exactly that: it builds
            `{"lhr": document.location.href, …}`, JSON-stringifies it and POSTs
            it to /cdn-cgi/challenge-platform/…/jsd/oneshot/… . Confirmed
            2026-08-05 by deobfuscating the script and capturing the plaintext
            payload — the fragment's values arrived verbatim.

            So the fragment stays as the SHARING format and stops being live
            page state. This runs during parse, and the only listener that
            script registers is DOMContentLoaded, so the URL is already clean
            before it ever reads it. `calculator-form.tsx` hydrates from
            `__TPCC_FRAGMENT__` instead of `location.hash`, and deliberately has
            no fallback to the live hash: if this ever fails to run, the form
            starts empty, which is visible. A fallback would silently restore
            the leak, and a silent false pass is how this survived in the first
            place.

            THE `indexOf("=")` TEST IS LOAD-BEARING, in both directions. Field
            state always contains `id=value`; an in-page anchor never does. Without
            it, activating the skip-to-content link below (`href="#content"`) would
            stash `#content`, decode it to no known field, and wipe a form the
            clinician had filled — and stripping it from the URL would also stop
            the browser jumping to the target, breaking the accessibility
            affordance it exists for. Anchors are left entirely alone.

            It also runs on `hashchange`, which is not decoration. Pasting a
            shared link into a tab already sitting on that same calculator
            changes only the fragment, so the browser performs a same-document
            navigation and no script re-runs — without this the link would
            appear to do nothing. That path leaves the values in the URL for as
            long as this handler takes to strip them, which is one synchronous
            turn; the load-time case, which is the one an injected script is
            actually bound to, has no such window at all. */}
        <script
          dangerouslySetInnerHTML={{
            // Sourced from lib/fragment-lift.ts so proxy.ts can name its CSP
            // hash against the SAME string — see that file for why the pair
            // must not drift.
            __html: FRAGMENT_LIFT_SCRIPT,
          }}
        />
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
