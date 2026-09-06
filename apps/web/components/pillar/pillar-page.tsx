import { Accordion, type AccordionItem } from "@towardpcc/ui";
import { Breadcrumbs } from "@/components/nav/breadcrumbs";
import { ImageSlot } from "@/components/image-slot";
import { Reveal } from "@/components/reveal";

/**
 * `prefix` exists because "<5 working days" is a materially different claim
 * from "5 working days" — one is a typical observed turnaround, the other reads
 * as a commitment the PRD explicitly refuses to make. A figure that silently
 * drops its qualifier is worse than no figure.
 */
export type PillarStat = { value: number; label: string; suffix?: string; prefix?: string };
export type PillarCapability = { title: string; body: string };

/**
 * The shared layout for the three pillar pages. Before the redesign each of
 * these was a heading, two paragraphs and a form; this gives them the same
 * shape as the home page — gradient hero, real figures, capabilities, an
 * optional topic list, an FAQ, and the request form last.
 */
export function PillarPage({
  crumb,
  badge,
  heading,
  lede,
  stats,
  capabilitiesHeading,
  capabilities,
  topicsHeading,
  topics,
  faq,
  imageLabel,
  imageHint,
  imageSrc,
  imageAlt,
  imageAspect = "aspect-[3/2]",
  imageFit,
  imageFrame,
  children,
}: {
  crumb: string;
  badge: string;
  heading: string;
  lede: string;
  // Readonly throughout: site content is declared `as const`.
  stats: readonly PillarStat[];
  capabilitiesHeading: string;
  capabilities: readonly PillarCapability[];
  topicsHeading?: string;
  topics?: readonly string[];
  faq: readonly AccordionItem[];
  imageLabel: string;
  imageHint: string;
  imageSrc?: string | undefined;
  imageAlt?: string | undefined;
  /**
   * Each pillar shows a different asset at a different native ratio, so the
   * ratio cannot live in this shared template. Passing one class for all three
   * is what produced the earlier crop: a 1.176 dashboard and a 1.381 screenshot
   * were both forced through a container sized for neither.
   */
  imageAspect?: string | undefined;
  imageFit?: "cover" | "contain" | undefined;
  imageFrame?: boolean | undefined;
  children: React.ReactNode;
}) {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-hero text-ink-on-dark">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(600px_400px_at_20%_20%,rgba(255,122,107,0.28),transparent_70%),radial-gradient(600px_400px_at_85%_80%,rgba(234,58,87,0.3),transparent_70%)]"
        />
        <div className="relative z-10 mx-auto max-w-[1280px] px-6 pt-8 pb-24">
          <div className="[&_a]:text-ink-on-dark/70 [&_[aria-current]]:text-ink-on-dark">
            <Breadcrumbs trail={[{ label: crumb }]} />
          </div>
          <p className="mt-8 mb-5 font-numeric text-eyebrow tracking-[0.14em] text-coral uppercase">
            {badge}
          </p>
          {/* display-2, deliberately a step below the home hero: an inner page
              is a destination, not the argument. */}
          <h1 className="max-w-[18ch] font-display text-display-2 leading-[1.05] font-bold tracking-tight text-balance text-ink-on-dark">
            {heading}
          </h1>
          {/* text-pretty stops the lede orphaning a single word onto the last
              line; the measure drops from 58ch (~70 chars in Inter, a touch
              wide) to a calmer 52ch. */}
          <p className="mt-6 max-w-[52ch] text-[19px] leading-relaxed text-pretty text-ink-on-dark/90">
            {lede}
          </p>
        </div>
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

      {/* Stats — overlapping the hero, as on the home page */}
      <div className="relative z-20 mx-auto -mt-16 max-w-[1280px] px-6">
        <dl className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((s, i) => (
            // Sequenced at 70ms and given the site's card hover. This band is
            // the first thing below the hero on all four pillar pages and it
            // arrived as four static slabs, all at once.
            <Reveal key={s.label} delay={Math.min(i, 6) * 45} from="up">
              <div className="h-full rounded-lg border border-border bg-surface-raised p-7 shadow-xl transition-[translate,box-shadow,border-color] duration-200 ease-[var(--motion-ease)] hover:border-border-strong hover:shadow-[var(--shadow-accent)] motion-safe:hover:-translate-y-1">
                {/* Final value at first paint — deliberately NOT <Counter>.
                  This band sits above the fold (top ~636px at 1280x900), so a
                  count-up fired at load and the server-rendered 0 was on screen
                  while the copy beside it said otherwise: "0 Pilot unit" under
                  "Pilot underway · one Gulf unit", "1 Areas of support" beside
                  "Three kinds of help." The values in site.ts were always
                  right; the animation was reading them out loud from zero.
                  Count-up is now home-band only (docs/design/motion.md). */}
                <dd className="m-0 font-numeric text-3xl font-semibold text-accent tabular-nums">
                  {s.prefix ?? ""}
                  {s.value}
                  {s.suffix ?? ""}
                </dd>
                <dt className="mt-2 text-sm text-ink-muted">{s.label}</dt>
              </div>
            </Reveal>
          ))}
        </dl>
      </div>

      {/* Capabilities */}
      <section aria-labelledby="capabilities" className="mx-auto max-w-[1280px] px-6 py-24">
        <div className="grid items-center gap-14 lg:grid-cols-2">
          <Reveal>
            <div>
              <h2
                id="capabilities"
                className="font-display text-3xl font-bold tracking-tight text-balance text-ink-strong md:text-4xl"
              >
                {capabilitiesHeading}
              </h2>
              {/* Rows gain a hover plate — a negative-margin highlight so it
                  reads as lighting up the existing row rather than a box that
                  was always there. This is the main content block on three of
                  the four pillar pages and it had no interactivity at all.
                  The check tile scales a touch to answer the hover. */}
              <ul className="mt-8 flex list-none flex-col gap-2">
                {capabilities.map((c) => (
                  <li
                    key={c.title}
                    className="group -mx-3 flex gap-4 rounded-lg border border-transparent p-3 transition-colors duration-150 ease-[var(--motion-ease)] hover:border-border-subtle hover:bg-surface-sunken/50"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      aria-hidden="true"
                      className="mt-0.5 size-6 shrink-0 text-accent transition-[scale] duration-150 ease-[var(--motion-ease)] motion-safe:group-hover:scale-110 motion-reduce:transition-none"
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
                    <span>
                      <strong className="block font-display text-[17px] font-semibold text-ink-strong">
                        {c.title}
                      </strong>
                      <span className="mt-1 block text-[15px] leading-relaxed text-ink-muted">
                        {c.body}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
          <Reveal>
            <ImageSlot
              label={imageLabel}
              hint={imageHint}
              src={imageSrc}
              alt={imageAlt}
              aspect={imageAspect}
              fit={imageFit}
              frame={imageFrame}
            />
          </Reveal>
        </div>
      </section>

      {/* Topics (knowledge only) */}
      {topics && topicsHeading ? (
        <section aria-labelledby="topics" className="bg-gradient-soft">
          <div className="mx-auto max-w-[1280px] px-6 py-20 text-center">
            <h2
              id="topics"
              className="font-display text-3xl font-bold tracking-tight text-ink-strong"
            >
              {topicsHeading}
            </h2>
            <ul className="mt-8 flex list-none flex-wrap justify-center gap-3">
              {topics.map((t) => (
                <li
                  key={t}
                  className="rounded-full border border-border-strong bg-surface-raised px-5 py-2.5 font-numeric text-[13px] text-ink-body"
                >
                  {t}
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      {/* FAQ */}
      <section aria-labelledby="faq" className="bg-surface-raised">
        <div className="mx-auto max-w-[820px] px-6 py-24">
          <h2
            id="faq"
            className="mb-10 text-center font-display text-3xl font-bold tracking-tight text-ink-strong"
          >
            Questions
          </h2>
          <Accordion items={faq} />
        </div>
      </section>

      {/* Request form */}
      <section className="bg-gradient-soft">
        <div className="mx-auto max-w-[760px] px-6 py-24">{children}</div>
      </section>
    </>
  );
}
