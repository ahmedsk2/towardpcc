import Link from "next/link";
import { CardiopulmonaryScene } from "@/components/home/cardiopulmonary-scene";
import { site } from "@/content/site";
import { withCounts } from "@/lib/published-counts";

const c = site.comingSoon;

/**
 * The pre-launch holding page.
 *
 * THE THESIS IS THE STATE, NOT THE PROMISE. A coming-soon page normally sells
 * an absence. This one cannot: the audience is PICU clinicians and the whole
 * argument of the site is that every claim it makes is checkable. So the hero
 * says what exists, the band below says what is still missing, and both numbers
 * are derived rather than typed.
 *
 * NO EMAIL CAPTURE. A signup field would be the first thing on this site to
 * collect a value from a visitor, and Invariant 2 makes that a decision rather
 * than a detail. It links to the address the rest of the site already publishes.
 *
 * The figure is the homepage's `CardiopulmonaryScene`, not a second drawing of
 * the same organs: its anatomy carries its own test suite, and a decorative
 * copy would be the one heart on this site nobody had checked.
 */
export function ComingSoon() {
  return (
    <>
      <section className="relative overflow-hidden bg-gradient-hero text-ink-on-dark">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(600px_400px_at_12%_18%,rgba(255,122,107,0.3),transparent_70%),radial-gradient(700px_500px_at_88%_78%,rgba(234,58,87,0.34),transparent_70%)]"
        />
        <div className="relative z-10 mx-auto grid max-w-[1280px] items-center gap-12 px-6 pt-20 pb-24 lg:grid-cols-[1.02fr_0.98fr]">
          <div>
            <p className="font-numeric text-eyebrow tracking-[0.14em] text-coral uppercase">
              {c.eyebrow}
            </p>
            <h1 className="mt-4 max-w-[17ch] font-display text-display-1 leading-[1.05] font-bold tracking-[-0.02em]">
              {c.heading}
            </h1>
            <p className="mt-6 max-w-[52ch] text-lg leading-relaxed text-ink-on-dark/90">
              {withCounts(c.lede)}
            </p>
          </div>
          {/* No card, no border: the figure sits on the gradient, matching the
              homepage. A boxed figure reads as pasted in. */}
          <div>
            <CardiopulmonaryScene />
          </div>
        </div>

        {/* Night to porcelain, the site's one decorative moment. */}
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

      <section aria-labelledby="state-heading" className="bg-surface-page">
        <div className="mx-auto max-w-[1280px] px-6 pt-4 pb-20">
          <h2
            id="state-heading"
            className="font-display text-2xl font-semibold text-ink-strong md:text-3xl"
          >
            {c.stateHeading}
          </h2>
          <dl className="mt-10 grid list-none gap-6 md:grid-cols-3">
            {c.state.map((item) => (
              <div
                key={item.label}
                className="rounded-lg border border-border bg-surface-raised p-7"
              >
                <dt className="font-numeric text-eyebrow tracking-[0.12em] text-accent uppercase">
                  {item.label}
                </dt>
                <dd className="m-0">
                  <p className="mt-3 font-display text-xl leading-snug font-semibold text-ink-strong">
                    {withCounts(item.value)}
                  </p>
                  <p className="mt-3 text-[15px] leading-relaxed text-ink-body">{item.detail}</p>
                </dd>
              </div>
            ))}
          </dl>
          <p className="mt-8">
            <Link
              href="/validation"
              className="rounded-sm font-medium text-accent underline underline-offset-4 transition-[color] duration-150 ease-[var(--motion-ease)] hover:text-accent-deep motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              {c.registerLink}
            </Link>
          </p>
        </div>
      </section>

      <section aria-labelledby="cta-heading" className="bg-surface-sunken">
        <div className="mx-auto max-w-[1280px] px-6 py-20">
          <h2
            id="cta-heading"
            className="max-w-[24ch] font-display text-2xl font-semibold text-ink-strong md:text-3xl"
          >
            {c.ctaHeading}
          </h2>
          <p className="mt-4 max-w-[62ch] text-[17px] leading-relaxed text-ink-body">{c.ctaBody}</p>
          <a
            href={`mailto:${site.utility.email}`}
            className="mt-8 inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-accent px-6 text-[15px] font-bold text-ink-on-accent transition-[translate,background-color,color] duration-150 ease-[var(--motion-ease)] motion-safe:hover:-translate-y-0.5 hover:bg-accent-deep active:translate-y-px motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            {c.ctaLabel}
          </a>
        </div>
      </section>
    </>
  );
}
