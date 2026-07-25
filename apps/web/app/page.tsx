import Link from "next/link";
import { StatusChip, cn } from "@towardpcc/ui";
import { Reveal } from "@/components/reveal";
import { HeroScene } from "@/components/home/hero-scene";
import { WaveformEdge } from "@/components/home/waveform-edge";
import { site } from "@/content/site";

const h = site.home;

// The four-pillar bento (ADR-design-direction wireframe): Calculators wide,
// Knowledge, Data, Services wide — a 3-col × 2-row grid on desktop. Status
// chips carry real state; crimson stays reserved for the hero CTA, so "Live"
// is moss (success), not accent.
const bento = [
  {
    href: "/calculators",
    title: site.pillars.calculators.title,
    description: site.pillars.calculators.description,
    status: "Live",
    tone: "success" as const,
    span: "lg:col-span-2",
  },
  {
    href: "/knowledge",
    title: site.pillars.knowledge.title,
    description: site.pillars.knowledge.description,
    status: "In pilot",
    tone: "neutral" as const,
    span: "lg:col-span-1",
  },
  {
    href: "/data",
    title: site.pillars.data.title,
    description: site.pillars.data.description,
    status: "In design",
    tone: "neutral" as const,
    span: "lg:col-span-1",
  },
  {
    href: "/services",
    title: site.pillars.services.title,
    description: site.pillars.services.description,
    status: "Free & open",
    tone: "neutral" as const,
    span: "lg:col-span-2",
  },
];

const ctaBase =
  "inline-flex min-h-11 items-center justify-center rounded-md px-5 text-[15px] font-semibold transition-colors duration-150 " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-bright active:translate-y-px";

export default function HomePage() {
  return (
    <>
      {/* HERO — the one night band. Split: promise left, breathing waveform right. */}
      <section className="relative overflow-hidden bg-surface-hero text-ink-on-dark">
        <div className="mx-auto grid max-w-[1400px] items-center gap-10 px-6 pt-16 pb-20 md:pt-24 md:pb-28 lg:grid-cols-[1.05fr_0.95fr] lg:gap-6">
          <div className="max-w-xl">
            <h1 className="font-display text-4xl leading-[1.05] font-bold tracking-tight text-ink-on-dark md:text-6xl">
              {h.heading}
            </h1>
            <p className="mt-6 max-w-[46ch] text-lg leading-relaxed text-ink-on-dark/85">
              {h.promise}
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link
                href="/calculators"
                className={cn(ctaBase, "bg-accent text-ink-on-accent hover:bg-accent-deep")}
              >
                {h.ctaPrimary}
              </Link>
              <Link
                href="/services"
                className={cn(
                  ctaBase,
                  "border border-ink-on-dark/40 text-ink-on-dark hover:border-ink-on-dark/60 hover:bg-white/5",
                )}
              >
                {h.ctaSecondary}
              </Link>
            </div>
          </div>

          <div className="relative -mx-2 md:mx-0">
            <HeroScene />
          </div>
        </div>

        {/* The dark → light transition, drawn as the waveform itself. */}
        <WaveformEdge className="block h-10 w-full md:h-16" />
      </section>

      <div className="mx-auto max-w-[1400px] px-6">
        {/* FOUR-PILLAR BENTO */}
        <section aria-labelledby="pillars-heading" className="py-16 md:py-24">
          <h2 id="pillars-heading" className="sr-only">
            {h.pillarsHeading}
          </h2>
          <div className="grid gap-4 lg:grid-cols-3">
            {bento.map((p) => (
              <Reveal key={p.href} className={p.span}>
                <Link
                  href={p.href}
                  className="group flex h-full flex-col rounded-lg border border-surface-sunken bg-surface-raised p-6 transition-colors duration-150 hover:border-ink-muted/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent md:p-7"
                >
                  <StatusChip tone={p.tone}>{p.status}</StatusChip>
                  <h3 className="mt-4 font-display text-xl font-medium text-ink-strong">
                    {p.title}
                  </h3>
                  <p className="mt-2 max-w-[52ch] text-[15px] leading-relaxed text-ink-muted">
                    {p.description}
                  </p>
                  <span
                    aria-hidden="true"
                    className="mt-4 font-numeric text-xs tracking-[0.08em] text-ink-muted uppercase transition-colors group-hover:text-accent-deep"
                  >
                    Open →
                  </span>
                </Link>
              </Reveal>
            ))}
          </div>
        </section>
      </div>

      {/* TRUST STRIP — full-width band, not a bento cell (PRD §6.1) */}
      <section
        aria-labelledby="trust-heading"
        className="border-y border-surface-sunken bg-surface-sunken/40"
      >
        <div className="mx-auto max-w-[1400px] px-6 py-12 md:py-16">
          <h2 id="trust-heading" className="font-display text-2xl font-medium text-ink-strong">
            {h.trust.heading}
          </h2>
          <ul className="mt-6 grid gap-4 md:grid-cols-3">
            {h.trust.points.map((point) => (
              <li key={point} className="flex gap-3 text-[15px] leading-relaxed text-ink-body">
                <span
                  aria-hidden="true"
                  className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent"
                />
                {point}
              </li>
            ))}
          </ul>
          <Link
            href={h.trust.href}
            className="mt-6 inline-flex items-center gap-1 font-medium text-accent-deep hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            {h.trust.link} <span aria-hidden="true">→</span>
          </Link>
        </div>
      </section>

      <div className="mx-auto max-w-[1400px] px-6">
        {/* MISSION EXCERPT */}
        <section aria-labelledby="mission-heading" className="py-16 md:py-24">
          <h2
            id="mission-heading"
            className="font-numeric text-xs tracking-[0.12em] text-ink-muted uppercase"
          >
            {h.missionHeading}
          </h2>
          <p className="mt-4 max-w-[60ch] font-display text-2xl leading-snug text-ink-strong md:text-3xl">
            {h.mission}
          </p>
        </section>

        {/* HONEST ROADMAP */}
        <section aria-labelledby="roadmap-heading" className="pb-20 md:pb-28">
          <h2
            id="roadmap-heading"
            className="font-numeric text-xs tracking-[0.12em] text-ink-muted uppercase"
          >
            {h.roadmap.heading}
          </h2>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {h.roadmap.columns.map((col) => (
              <div
                key={col.state}
                className="rounded-lg border border-surface-sunken bg-surface-raised p-6"
              >
                <p className="font-numeric text-[11px] tracking-[0.1em] text-ink-muted uppercase">
                  {col.state}
                </p>
                <ul className="mt-3 flex flex-col gap-2">
                  {col.items.map((item) => (
                    <li key={item} className="text-[15px] leading-relaxed text-ink-body">
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
