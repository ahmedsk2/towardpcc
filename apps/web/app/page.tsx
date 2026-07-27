import Link from "next/link";
import { cn } from "@towardpcc/ui";
import { Reveal } from "@/components/reveal";
import { HeroScene } from "@/components/home/hero-scene";
import { Counter } from "@/components/home/counter";
import { EvidenceCarousel } from "@/components/home/evidence-carousel";
import { ImageSlot } from "@/components/image-slot";
import { site } from "@/content/site";

const h = site.home;

// The four pillars, each carrying its real state and its real figures.
const pillars = [
  {
    href: "/calculators",
    title: site.pillars.calculators.title,
    body: "Twenty-two Tier-A PICU scores. Every computation runs in your browser — proven by an automated zero-network test on every release.",
    chip: "Live now",
    chipTone: "live" as const,
    media: "from-accent-deep via-accent to-coral",
    stats: [
      { label: "Scores", value: "22" },
      { label: "Citations", value: "89" },
      { label: "Coverage", value: "100%" },
    ],
    cta: "Open the calculators",
  },
  {
    href: "/knowledge",
    title: site.pillars.knowledge.title,
    body: "The PedsCC Library — your unit's own protocols and guidelines, searchable down to the exact page. Piloting with PICU physicians across the Gulf.",
    chip: "In production · piloting",
    chipTone: "pilot" as const,
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
    chip: "Pilot underway",
    chipTone: "pilot" as const,
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
    body: "Research aid, biostatistics, and AI-assisted research guidance for fellows — free of charge, queued honestly, with no SLA we can't keep.",
    chip: "Free · capacity-based",
    chipTone: "neutral" as const,
    media: "from-success-text to-success-text/60",
    stats: [
      { label: "Cost", value: "Free" },
      { label: "Offerings", value: "3" },
    ],
    cta: "Request support",
  },
];

const featureTone: Record<string, string> = {
  crimson: "bg-gradient-accent",
  coral: "bg-linear-135 from-coral to-coral-soft",
  plum: "bg-linear-135 from-surface-hero-raised to-accent-deep",
  moss: "bg-linear-135 from-success-text to-success-text/70",
};

const ctaBase =
  "inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-6 text-[15px] font-bold transition-colors duration-150 " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-coral active:translate-y-px";

export default function HomePage() {
  return (
    <>
      {/* ── HERO: the one bold moment ───────────────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-hero text-ink-on-dark">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(600px_400px_at_12%_18%,rgba(255,122,107,0.3),transparent_70%),radial-gradient(700px_500px_at_88%_78%,rgba(234,58,87,0.34),transparent_70%)]"
        />
        <div className="relative z-10 mx-auto grid max-w-[1280px] items-center gap-12 px-6 pt-20 pb-28 lg:grid-cols-[1.02fr_0.98fr]">
          <div>
            <p className="mb-6 inline-flex items-center gap-2.5 rounded-full border border-white/25 bg-white/15 px-4 py-2 text-[13px] font-semibold">
              <span
                aria-hidden="true"
                className="size-2 rounded-full bg-success-bg motion-safe:animate-[ping_2.4s_ease-in-out_infinite]"
              />
              {h.badge}
            </p>
            <h1 className="max-w-[15ch] font-display text-4xl leading-[1.03] font-bold tracking-tight text-white md:text-6xl">
              {h.heading}
            </h1>
            <p className="mt-6 max-w-[46ch] text-lg leading-relaxed text-ink-on-dark/90">
              {h.promise}
            </p>
            <div className="mt-9 flex flex-wrap gap-3.5">
              <Link
                href="/calculators"
                className={cn(ctaBase, "bg-surface-raised text-accent hover:bg-accent-tint")}
              >
                {h.ctaPrimary}
              </Link>
              <Link
                href="/knowledge"
                className={cn(
                  ctaBase,
                  "border-2 border-white/50 text-white hover:border-white hover:bg-white/10",
                )}
              >
                {h.ctaSecondary}
              </Link>
            </div>

            <dl className="mt-10 flex flex-wrap gap-x-8 gap-y-4 border-t border-white/20 pt-6">
              {h.heroTrust.map((t) => (
                <div key={t.label}>
                  <dt className="sr-only">{t.label}</dt>
                  <dd className="m-0">
                    <span className="block font-numeric text-2xl font-semibold text-white tabular-nums">
                      {t.value}
                    </span>
                    <span className="text-[13px] text-ink-on-dark/70">{t.label}</span>
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="relative">
            <div className="rounded-3xl border border-white/20 bg-white/10 p-5 shadow-[0_40px_80px_-30px_rgba(0,0,0,0.7)] backdrop-blur-md">
              <HeroScene />
            </div>
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

      {/* ── FEATURE STRIP (overlaps the hero) ───────────────────────── */}
      <div className="relative z-20 mx-auto -mt-16 max-w-[1280px] px-6">
        <ul className="grid list-none gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {h.features.map((f) => (
            <li key={f.title}>
              <Reveal>
                <div className="h-full rounded-lg border border-border bg-surface-raised p-7 shadow-[0_20px_46px_-26px_rgba(61,21,38,0.4)] transition-transform duration-200 hover:-translate-y-2">
                  <span
                    aria-hidden="true"
                    className={cn(
                      "mb-4 grid size-13 place-items-center rounded-2xl",
                      featureTone[f.tone],
                    )}
                  >
                    <FeatureIcon tone={f.tone} />
                  </span>
                  <h2 className="font-display text-lg font-semibold text-ink-strong">{f.title}</h2>
                  <p className="mt-2 text-sm leading-relaxed text-ink-muted">{f.body}</p>
                </div>
              </Reveal>
            </li>
          ))}
        </ul>
      </div>

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
                  <Counter value={22} />
                </span>
                <span className="text-[13px] text-ink-muted">calculators, live today</span>
              </p>
            </div>
          </Reveal>
          <Reveal>
            <div>
              <p className="mb-4 inline-flex rounded-full bg-accent-tint px-4 py-1.5 font-numeric text-[12px] font-semibold tracking-[0.14em] text-accent uppercase">
                {h.missionHeading}
              </p>
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
                className={cn(
                  ctaBase,
                  "mt-8 bg-accent text-ink-on-accent hover:bg-accent-deep focus-visible:outline-accent",
                )}
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
        className="relative overflow-hidden bg-gradient-hero text-white"
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(700px_400px_at_20%_0%,rgba(255,122,107,0.28),transparent_70%),radial-gradient(600px_400px_at_80%_100%,rgba(234,58,87,0.3),transparent_70%)]"
        />
        <div className="relative z-10 mx-auto max-w-[1280px] px-6 py-20">
          <h2 id="counters-heading" className="sr-only">
            {h.countersHeading}
          </h2>
          <dl className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {h.counters.map((c) => (
              <div key={c.label} className="text-center">
                <dd className="m-0 font-numeric text-4xl font-semibold text-white tabular-nums md:text-5xl">
                  <Counter value={c.value} suffix={c.suffix} prefix={c.prefix} />
                </dd>
                <dt className="mt-3 text-sm text-ink-on-dark/80">{c.label}</dt>
              </div>
            ))}
          </dl>

          {/* Second row: the team behind it, rather than the codebase. */}
          <dl className="mt-14 grid gap-8 border-t border-white/20 pt-14 sm:grid-cols-2 lg:grid-cols-4">
            {h.teamCounters.map((c) => (
              <div key={c.label} className="text-center">
                <dd className="m-0 font-numeric text-3xl font-semibold text-coral tabular-nums md:text-4xl">
                  <Counter value={c.value} suffix={c.suffix} prefix={c.prefix} />
                </dd>
                <dt className="mt-3 text-sm text-ink-on-dark/80">{c.label}</dt>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* ── PILLARS ─────────────────────────────────────────────────── */}
      <section aria-labelledby="pillars-heading" className="bg-gradient-soft">
        <div className="mx-auto max-w-[1280px] px-6 py-24">
          <div className="mx-auto mb-14 max-w-[62ch] text-center">
            <p className="mb-4 inline-flex rounded-full bg-accent-tint px-4 py-1.5 font-numeric text-[12px] font-semibold tracking-[0.14em] text-accent uppercase">
              Four pillars
            </p>
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
            {pillars.map((p) => (
              <li key={p.href}>
                <Reveal className="h-full">
                  <Link
                    href={p.href}
                    className="group flex h-full flex-col overflow-hidden rounded-lg border border-border bg-surface-raised shadow-[0_18px_44px_-28px_rgba(61,21,38,0.4)] transition-[transform,box-shadow] duration-200 hover:-translate-y-2 hover:shadow-[0_34px_66px_-28px_rgba(207,31,61,0.45)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                  >
                    <span
                      aria-hidden="true"
                      className={cn("relative grid h-44 place-items-center bg-linear-140", p.media)}
                    >
                      <span
                        className={cn(
                          "absolute top-4 left-4 rounded-full bg-surface-raised px-3 py-1.5 font-numeric text-[10.5px] font-semibold tracking-[0.09em] uppercase",
                          p.chipTone === "live" ? "text-success-text" : "text-accent-deep",
                        )}
                      >
                        {p.chip}
                      </span>
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
                          className="size-3.5 transition-transform duration-200 group-hover:translate-x-1"
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
      <section aria-labelledby="evidence-heading" className="bg-surface-raised">
        <div className="mx-auto max-w-[1280px] px-6 py-24">
          <div className="mx-auto mb-12 max-w-[62ch] text-center">
            <p className="mb-4 inline-flex rounded-full bg-accent-tint px-4 py-1.5 font-numeric text-[12px] font-semibold tracking-[0.14em] text-accent uppercase">
              {h.evidence.eyebrow}
            </p>
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

      {/* ── FOUNDER ─────────────────────────────────────────────────── */}
      <section aria-labelledby="founder-heading" className="bg-gradient-soft">
        <div className="mx-auto grid max-w-[1280px] items-center gap-12 px-6 py-24 md:grid-cols-[280px_1fr]">
          <Reveal>
            {/* Deliberately not a portrait — the founder chose not to publish
                one. The brand waveform carries the section instead, which is
                also the motif the About page explains. */}
            <ImageSlot
              label="TowardPCC"
              hint="the breathing waveform"
              src="/images/brand-waveform.jpg"
              alt=""
              aspect="aspect-[3/2]"
              className="max-w-[300px]"
            />
          </Reveal>
          <Reveal>
            <div>
              <p className="mb-4 inline-flex rounded-full bg-accent-tint px-4 py-1.5 font-numeric text-[12px] font-semibold tracking-[0.14em] text-accent uppercase">
                {h.founder.eyebrow}
              </p>
              <h2
                id="founder-heading"
                className="font-display text-3xl font-bold tracking-tight text-ink-strong"
              >
                {h.founder.name}
              </h2>
              <p className="mt-1 font-numeric text-sm text-accent">{h.founder.role}</p>
              <p className="mt-4 max-w-[58ch] text-[17px] leading-relaxed text-ink-body">
                {h.founder.body}
              </p>
              <ul className="mt-6 flex list-none flex-wrap gap-2.5">
                {h.founder.credentials.map((c) => (
                  <li
                    key={c}
                    className="rounded-full border border-peach bg-accent-tint px-3.5 py-1.5 font-numeric text-[11.5px] text-accent-deep"
                  >
                    {c}
                  </li>
                ))}
              </ul>
              <p className="mt-5 max-w-[62ch] text-sm text-ink-muted">{h.founder.publications}</p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── CTA BAND ────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-accent text-white">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(600px_300px_at_50%_0%,rgba(255,255,255,0.22),transparent_70%)]"
        />
        <div className="relative z-10 mx-auto max-w-[1280px] px-6 py-20 text-center">
          <h2 className="mx-auto max-w-[20ch] font-display text-3xl font-bold tracking-tight text-white md:text-4xl">
            {h.ctaBand.heading}
          </h2>
          <p className="mx-auto mt-4 max-w-[52ch] text-lg text-white/90">{h.ctaBand.body}</p>
          <Link
            href="/calculators"
            className={cn(ctaBase, "mt-8 bg-surface-raised text-accent hover:bg-accent-tint")}
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

function FeatureIcon({ tone }: { tone: string }) {
  const paths: Record<string, React.ReactNode> = {
    crimson: (
      <>
        <path d="M5 3h14v18H5z" stroke="currentColor" strokeWidth="2" />
        <path
          d="M8 8h8M8 12h3M8 16h3"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </>
    ),
    coral: (
      <path
        d="M12 3l7 4v6c0 4-3 6.5-7 8-4-1.5-7-4-7-8V7l7-4z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    ),
    plum: (
      <path
        d="M3 12h4l2-7 4 14 3-9 2 2h3"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    ),
    moss: (
      <>
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
        <path d="M12 7v5l3 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </>
    ),
  };
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="size-6 text-white">
      {paths[tone]}
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
      className="size-14 text-white/95 transition-transform duration-300 group-hover:scale-110"
    >
      {paths[href]}
    </svg>
  );
}
