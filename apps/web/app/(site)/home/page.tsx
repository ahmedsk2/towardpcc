/*
 * THE REAL HOME PAGE, PARKED WHILE THE HOLDING PAGE IS UP.
 *
 * Moved here unchanged on 2026-08-11 at the founder's instruction: `/` serves
 * `components/coming-soon` until they ask for this one back. Nothing in this
 * file was edited beyond the `robots` block below, so restoring it is a move,
 * not a rewrite.
 *
 * TO RESTORE: `git mv apps/web/app/home/page.tsx apps/web/app/page.tsx`, drop
 * the `metadata` export added below, delete `apps/web/components/coming-soon`
 * and the `comingSoon` block in `content/site.ts`, and point the e2e specs
 * listed in `coming-soon.spec.ts` back at `/`.
 */

// Parked, so it must not compete with `/` in search while the holding page is
// the front door. Delete this when the page returns to `/`.
export const metadata = { robots: { index: false, follow: false } };

import Link from "next/link";
import { listScores } from "@towardpcc/scoring-engine";
import { buttonArrowClasses, buttonClasses, cn } from "@towardpcc/ui";
import { Reveal } from "@/components/reveal";
import { Eyebrow } from "@/components/eyebrow";
import { CardiopulmonaryScene } from "@/components/home/cardiopulmonary-scene";
import { Counter } from "@/components/home/counter";
import { EvidenceCarousel } from "@/components/home/evidence-carousel";
import { ImageSlot } from "@/components/image-slot";
import { site } from "@/content/site";
import { withCounts } from "@/lib/published-counts";

const h = site.home;

// The four pillars, each carrying its real state and its real figures. State
// now lives in the meta row below the body (`status?`), not a chip on the
// media plate: "Piloting" for knowledge and data, omitted where a pillar is
// simply live.
const pillars: Array<{
  href: string;
  title: string;
  body: string;
  status?: string;
  media: string;
  stats: { label: string; value: string }[];
  cta: string;
}> = [
  {
    href: "/calculators",
    title: site.pillars.calculators.title,
    body: "Twenty-five Tier-A PICU scores. Every computation runs in your browser, proven by an automated zero-network test on every release.",
    media: "from-accent-deep via-accent to-coral",
    stats: [
      { label: "Scores", value: "25" },
      // Typed, not derived: importing the engine for one number cost 45 KB of
      // route JS. figures.test.ts pins BOTH of these against the registry — it
      // did not until 2026-07-31, and these three figures sat at 22/22/87
      // against a real 23/23/91 for exactly as long as that gap existed.
      { label: "Citations", value: "151" },
      { label: "Coverage", value: "100%" },
    ],
    cta: "Open the calculators",
  },
  {
    href: "/knowledge",
    title: site.pillars.knowledge.title,
    body: "The PedsCC Library: your unit's own protocols and guidelines, searchable down to the exact page. Piloting with PICU physicians across the Gulf.",
    status: "Piloting",
    media: "from-surface-hero-raised via-accent-deep to-accent",
    stats: [
      { label: "Documents", value: "2,425" },
      { label: "Pages", value: "64,388" },
      { label: "Topics", value: "11" },
    ],
    cta: "Explore the library",
  },
  {
    href: "/data",
    title: site.pillars.data.title,
    body: "A PICU registry, currently piloting in one unit in the Gulf region, built on the same validated engine as the public calculators.",
    status: "Piloting",
    media: "from-accent-deep via-accent to-coral-soft",
    stats: [
      { label: "Pilot units", value: "1" },
      { label: "Public patient data", value: "None" },
    ],
    cta: "Register interest",
  },
  {
    href: "/services",
    title: site.pillars.services.title,
    body: "Research aid, biostatistics, and AI-assisted research guidance for fellows. Free of charge, queued honestly, with no SLA we can't keep.",
    media: "from-success-text to-success-text/60",
    stats: [
      { label: "Cost", value: "Free" },
      { label: "Offerings", value: "3" },
    ],
    cta: "Request support",
  },
];

export default function HomePage() {
  return (
    <>
      {/* ── HERO: the one bold moment ───────────────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-hero text-ink-on-dark">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(600px_400px_at_12%_18%,rgba(255,122,107,0.3),transparent_70%),radial-gradient(700px_500px_at_88%_78%,rgba(234,58,87,0.34),transparent_70%)]"
        />
        <div className="relative z-10 mx-auto grid max-w-[1280px] items-center gap-12 px-6 pt-20 pb-20 lg:grid-cols-[1.02fr_0.98fr]">
          <div>
            {/* The page's thesis, so it gets the one display step nothing else
                uses. Fluid rather than a 3rem→4rem jump at a single breakpoint,
                which left every width in between with whichever size fit worst. */}
            <h1
              className="max-w-[15ch] font-display text-display-1 leading-[1.03] font-bold tracking-[-0.02em] text-ink-on-dark motion-safe:animate-[heroRise_var(--motion-duration-reveal)_var(--motion-ease)_both]"
              style={{ animationDelay: "120ms" }}
            >
              {h.heading}
            </h1>
            <p
              className="mt-6 max-w-[46ch] text-lg leading-relaxed text-ink-on-dark/90 motion-safe:animate-[heroRise_var(--motion-duration-reveal)_var(--motion-ease)_both]"
              style={{ animationDelay: "220ms" }}
            >
              {h.promise}
            </p>
            <div
              className="mt-9 flex flex-wrap gap-3.5 motion-safe:animate-[heroRise_var(--motion-duration-reveal)_var(--motion-ease)_both]"
              style={{ animationDelay: "320ms" }}
            >
              <Link
                href="/calculators"
                className={buttonClasses({ variant: "on-dark", size: "lg" })}
              >
                {h.ctaPrimary}
                <svg
                  viewBox="0 0 16 16"
                  fill="none"
                  aria-hidden="true"
                  className={buttonArrowClasses}
                >
                  <path
                    d="M2 8h11M9 4l4 4-4 4"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </Link>
              <Link
                href="/knowledge"
                className={buttonClasses({ variant: "ghost-dark", size: "lg" })}
              >
                {h.ctaSecondary}
              </Link>
            </div>
            <p
              className="mt-8 text-[14px] text-ink-on-dark/75 motion-safe:animate-[heroRise_var(--motion-duration-reveal)_var(--motion-ease)_both]"
              style={{ animationDelay: "420ms" }}
            >
              {withCounts(h.heroLine)}
            </p>
          </div>

          <div className="relative">
            {/* A DARK ground, not the frosted white panel the organ stack sat
                on. The figure is a luminous wire mesh in the crimson family,
                and on a mid-crimson card it was the same value as its own
                background: legible, but muddy, with none of the depth the
                brightness gradient is carrying. Deep ground is what lets one
                hue read as near and far. */}
            {/* NO CARD. The figure sits on the hero gradient directly — no
                border, no panel, no shadow. Every other element on this page
                sits on the ground it is drawn on, and a boxed figure read as
                pasted in.
                The cost is contrast: depth here is carried entirely by
                brightness, and the ground moved from near-black to
                mid-crimson. Paid for by lifting the mesh rather than by
                putting the box back. */}
            <CardiopulmonaryScene />
          </div>
        </div>

        {/* dark → light transition */}
        <svg
          viewBox="0 0 1440 110"
          preserveAspectRatio="none"
          aria-hidden="true"
          className="relative z-10 block h-16 w-full md:h-24"
        >
          <path
            d="M0,58 C130,96 220,16 360,44 C500,72 580,14 720,46 C860,78 940,20 1080,48 C1200,72 1320,84 1440,64 L1440,110 L0,110 Z"
            fill="var(--color-surface-page)"
          />
        </svg>
      </section>

      {/* ── MISSION ─────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-[1280px] px-6 py-24">
        <div className="grid items-center gap-14 lg:grid-cols-2">
          <Reveal>
            <div className="relative">
              <ImageSlot
                label="Mission photograph"
                hint="care-nurse-smiling.jpg"
                src="/images/care-nurse-smiling.jpg"
                alt="A nurse laughing with a child in a hospital bed, who is holding a teddy bear."
                aspect="aspect-[3/2]"
              />
              {/* Overlapping second frame — the quieter half of the same story.
                  Hidden on small screens, where it would only crowd the stat. */}
              <div className="absolute -right-6 -bottom-10 hidden w-40 sm:block lg:w-48">
                <ImageSlot
                  label="Rest"
                  hint="care-resting.jpg"
                  src="/images/care-resting.jpg"
                  alt="A child asleep in a hospital bed, holding a soft toy."
                  aspect="aspect-[9/16]"
                  className="rounded-[20px] ring-4 ring-surface-page"
                />
              </div>
              <p className="absolute -bottom-6 -left-6 z-20 rounded-[20px] bg-surface-raised px-6 py-5 shadow-[0_26px_54px_-22px_rgba(0,0,0,0.4)]">
                <span className="block font-numeric text-3xl leading-none font-semibold text-accent tabular-nums">
                  {/* DERIVED. This was a hardcoded 22 sitting under the line
                      "Every figure here is something you can go and count.
                      Nothing on this page is an estimate." — while the same
                      screen printed 23 four times over and the pillar body
                      spelled out "Twenty-three". The figures guard passed
                      because its regexes anchor on the `{ label, value }` shape
                      and the spelled-out phrase, and a bare Counter literal
                      matches neither. A number that can drift is a number that
                      will. */}
                  <Counter value={listScores({ status: "published" }).length} />
                </span>
                <span className="text-[13px] text-ink-muted">calculators, live today</span>
              </p>
            </div>
          </Reveal>
          <Reveal>
            <div>
              <Eyebrow>{h.missionHeading}</Eyebrow>
              <h2 className="font-display text-3xl font-bold tracking-tight text-ink-strong md:text-4xl">
                {site.footer.vision}
              </h2>
              <p className="mt-5 max-w-[54ch] text-[17px] leading-relaxed text-ink-body">
                {h.mission}
              </p>
              <ul className="mt-7 flex list-none flex-col gap-3.5">
                {h.trust.points.map((point) => (
                  <li key={point} className="flex gap-3.5 text-[15px] leading-relaxed">
                    <CheckIcon />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
              <Link
                href="/about"
                className={buttonClasses({ variant: "primary", className: "mt-8" })}
              >
                Read our story
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── COUNTERS ────────────────────────────────────────────────── */}
      <section
        aria-labelledby="counters-heading"
        // A deep SOLID ground, not the hero's gradient. This band used
        // bg-gradient-hero plus two coral radials — the same construction as
        // the hero, so on scroll the page appeared to return to where it
        // started. Solid reads as a different room.
        className="relative overflow-hidden bg-surface-hero text-ink-on-dark"
      >
        {/* Depth, from the warm secondary rather than from more crimson.
            `coral-soft` and `peach` are contrast-cleared for the night bands
            (coral is 7.11:1 there) and had five consumers across the whole app,
            so a solid slab of surface-hero was the flattest surface on the site.
            Two very low-alpha washes, no radial repeat of the hero's own
            construction — this band is deliberately a different room.
            DECORATIVE ONLY, and light grounds never see these: coral is 2.55:1
            on white and fails the 3:1 non-text threshold, which tokens.test.ts
            pins. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(900px_320px_at_50%_0%,color-mix(in_oklab,var(--color-coral-soft),transparent_92%),transparent_70%)]"
        />
        {/* Same curve as the hero divider, mirrored: one wave on the site, not
            three. Fills with surface-page because that is the ground above. */}
        <svg
          viewBox="0 0 1440 110"
          preserveAspectRatio="none"
          aria-hidden="true"
          className="relative z-10 block h-12 w-full rotate-180 md:h-20"
        >
          <path
            d="M0,58 C130,96 220,16 360,44 C500,72 580,14 720,46 C860,78 940,20 1080,48 C1200,72 1320,84 1440,64 L1440,110 L0,110 Z"
            fill="var(--color-surface-page)"
          />
        </svg>
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(900px_420px_at_50%_-5%,rgba(255,122,107,0.2),transparent_70%)]"
        />
        {/* One band, four figures.
            This was two <dl>s stacked in a single section under an sr-only
            heading — eight animated numbers reading as one unlabelled slab, on
            a page that already showed fourteen figures before the pillar cards
            expressing only nine distinct facts ("22" appeared five times, "89"
            three). The three that carry the argument were drowning in the ones
            that did not.
            What stayed is what a reader can go and count: scores, citations,
            indexed pages, coverage. The team figures were not dropped — they
            moved to where they inform a decision rather than a scroll: years to
            the founder section, studies supported and reply time to /services,
            where someone is deciding whether to ask. */}
        <div className="relative z-10 mx-auto max-w-[1280px] px-6 py-20">
          <h2
            id="counters-heading"
            className="text-center font-display text-2xl font-medium text-ink-on-dark md:text-3xl"
          >
            {h.countersHeading}
          </h2>
          <p className="mx-auto mt-3 max-w-[52ch] text-center text-ink-on-dark/75">
            {h.countersLede}
          </p>
          {/* A shared hairline the four figures hang from, instead of four
              free-floating blocks. The vertical rules reset on every row's
              first cell, which a bare `first:` cannot do once the grid wraps
              to two columns. */}
          <dl className="mt-12 grid grid-cols-2 gap-y-10 border-t border-white/15 lg:grid-cols-4">
            {h.counters.map((c, i) => (
              <Reveal
                key={c.label}
                delay={Math.min(i, 6) * 45}
                // No vertical rules. They were meant to divide the columns, but
                // a grid that wraps from four to two needs the rule cleared on
                // each ROW's first cell, and `first:` only knows about the
                // first cell overall — measured, every cell kept its border at
                // every width. The shared top hairline is the idea anyway: four
                // figures hanging from one line. The rules were decoration that
                // could only ever be right at one breakpoint.
                className="px-2 pt-8 text-center sm:px-4 lg:px-6"
              >
                <div>
                  <dd className="m-0 font-numeric text-4xl font-semibold text-ink-on-dark tabular-nums md:text-5xl">
                    <Counter value={c.value} suffix={c.suffix} prefix={c.prefix} />
                  </dd>
                  <dt className="mt-3 text-sm text-ink-on-dark/80">{c.label}</dt>
                </div>
              </Reveal>
            ))}
          </dl>
        </div>
        {/* Fills with surface-sunken, not surface-page: --gradient-soft below
            starts at #fff2ee, and a surface-page fill leaves a visible seam. */}
        <svg
          viewBox="0 0 1440 110"
          preserveAspectRatio="none"
          aria-hidden="true"
          className="relative z-10 block h-12 w-full md:h-20"
        >
          <path
            d="M0,58 C130,96 220,16 360,44 C500,72 580,14 720,46 C860,78 940,20 1080,48 C1200,72 1320,84 1440,64 L1440,110 L0,110 Z"
            fill="var(--color-surface-sunken)"
          />
        </svg>
      </section>

      {/* ── PILLARS ─────────────────────────────────────────────────── */}
      <section aria-labelledby="pillars-heading" className="bg-gradient-soft">
        <div className="mx-auto max-w-[1280px] px-6 py-24">
          <div className="mx-auto mb-14 max-w-[62ch] text-center">
            <Eyebrow>Four pillars</Eyebrow>
            <h2
              id="pillars-heading"
              className="font-display text-3xl font-bold tracking-tight text-ink-strong md:text-4xl"
            >
              {h.pillarsHeading}
            </h2>
            <p className="mt-4 text-lg text-ink-muted">
              We say plainly what is live, what is piloting, and what is planned.
            </p>
          </div>

          <ul className="grid list-none gap-6 md:grid-cols-2">
            {pillars.map((p, i) => (
              <li key={p.href}>
                <Reveal className="group/reveal h-full" delay={Math.min(i, 6) * 45}>
                  <Link
                    href={p.href}
                    className="group relative flex h-full flex-col overflow-hidden rounded-lg border border-border bg-surface-raised shadow-xl transition-[translate,box-shadow] duration-200 hover:-translate-y-2 hover:shadow-[var(--shadow-accent)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                  >
                    {/* Named group so the rule keys off the Reveal wrapper
                        rather than the card's own hover group — the two are
                        nested here and an unnamed `group` would bind to the
                        nearer one. */}
                    <span
                      aria-hidden="true"
                      data-rule
                      className="absolute inset-x-0 top-0 z-10 h-0.5 origin-left scale-x-0 bg-gradient-accent transition-[scale] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-data-[shown]/reveal:scale-x-100 motion-reduce:scale-x-100 motion-reduce:transition-none"
                    />
                    <span
                      aria-hidden="true"
                      /* Deliberately NOT `media-zoom`, which was tried here and
                         measured worse. The clipped-frame idiom moves a
                         PICTURE inside a still frame; this plate is a linear
                         gradient, and a gradient scaled 4% shows no motion at
                         all. What did move was everything riding on top of it:
                         the status chip that used to sit here drifted, and
                         `PillarIcon` — which already carries its own
                         `group-hover:scale-110` over 300ms — compounded to
                         ~1.144 across two mismatched durations. The icon is
                         this plate's media and already has the gesture; the
                         chip is gone (2026-09-06 — its state now lives in the
                         meta row as `p.status`), which resolves the drift
                         rather than merely explaining it. */
                      className={cn("relative grid h-44 place-items-center bg-linear-140", p.media)}
                    >
                      <PillarIcon href={p.href} />
                    </span>
                    <span className="flex flex-1 flex-col p-7">
                      <span className="font-display text-xl font-bold text-ink-strong">
                        {p.title}
                      </span>
                      <span className="mt-3 text-[15px] leading-relaxed text-ink-muted">
                        {p.body}
                      </span>
                      <span className="mt-5 flex flex-wrap gap-x-6 gap-y-2 border-t border-dashed border-border-subtle pt-4">
                        {p.status ? (
                          <span className="font-numeric text-[11px] text-ink-muted">
                            Status
                            <span className="block text-[15px] text-ink-body">{p.status}</span>
                          </span>
                        ) : null}
                        {p.stats.map((s) => (
                          <span key={s.label} className="font-numeric text-[11px] text-ink-muted">
                            {s.label}
                            <span className="block text-[15px] text-accent tabular-nums">
                              {s.value}
                            </span>
                          </span>
                        ))}
                      </span>
                      <span className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-accent">
                        {p.cta}
                        <svg
                          viewBox="0 0 16 16"
                          fill="none"
                          aria-hidden="true"
                          className="size-3.5 transition-[translate] duration-200 group-hover:translate-x-1"
                        >
                          <path
                            d="M2 8h11M9 4l4 4-4 4"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </span>
                    </span>
                  </Link>
                </Reveal>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── EVIDENCE ────────────────────────────────────────────────── */}
      {/* Blush ground, white cards — the inverse of what it was. The section
          sat on surface-raised (#ffffff) while its cards sat on surface-page
          (#fffaf7): a 1.01:1 difference, so the cards did not read as cards.
          The light run down the page is now surface-page -> gradient-soft ->
          surface-sunken, three grounds a reader can actually tell apart. */}
      <section aria-labelledby="evidence-heading" className="bg-surface-sunken">
        <div className="mx-auto max-w-[1280px] px-6 py-24">
          <div className="mx-auto mb-12 max-w-[62ch] text-center">
            <Eyebrow>{h.evidence.eyebrow}</Eyebrow>
            <h2
              id="evidence-heading"
              className="font-display text-3xl font-bold tracking-tight text-ink-strong md:text-4xl"
            >
              {h.evidence.heading}
            </h2>
            <p className="mt-4 text-lg text-ink-muted">{h.evidence.lede}</p>
          </div>
          <EvidenceCarousel />
        </div>
      </section>

      {/* ── CTA BAND ────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-accent text-ink-on-accent">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(600px_300px_at_50%_0%,rgba(255,255,255,0.22),transparent_70%)]"
        />
        <div className="relative z-10 mx-auto max-w-[1280px] px-6 py-20 text-center">
          <h2 className="mx-auto max-w-[20ch] font-display text-3xl font-bold tracking-tight text-ink-on-accent md:text-4xl">
            {h.ctaBand.heading}
          </h2>
          <p className="mx-auto mt-4 max-w-[52ch] text-lg text-ink-on-accent/90">
            {h.ctaBand.body}
          </p>
          <Link
            href="/calculators"
            className={buttonClasses({ variant: "on-dark", size: "lg", className: "mt-8" })}
          >
            {h.ctaBand.cta}
          </Link>
        </div>
      </section>
    </>
  );
}

function CheckIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className="mt-0.5 size-5.5 shrink-0 text-accent"
    >
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
      <path
        d="M8 12l3 3 5-6"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PillarIcon({ href }: { href: string }) {
  const paths: Record<string, React.ReactNode> = {
    "/calculators": (
      <>
        <path d="M5 2h14v20H5z" stroke="currentColor" strokeWidth="1.6" />
        <path
          d="M8 6h8M8 10h2M12 10h2M8 14h2M12 14h2M8 18h6"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      </>
    ),
    "/knowledge": (
      <path
        d="M4 4h7a2 2 0 012 2v14H6a2 2 0 01-2-2V4zM20 4h-7v16h5a2 2 0 002-2V4z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    ),
    "/data": (
      <path
        d="M4 20V10M10 20V4M16 20v-8M22 20H2"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    ),
    "/services": (
      <>
        <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.8" />
        <path
          d="M4 21c0-4 3.6-6 8-6s8 2 8 6"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </>
    ),
  };
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className="size-14 text-ink-on-accent/95 transition-[scale] duration-300 group-hover:scale-110"
    >
      {paths[href]}
    </svg>
  );
}
