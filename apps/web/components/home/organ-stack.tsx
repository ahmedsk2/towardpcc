import { site } from "@/content/site";

/**
 * The hero figure: six organ systems as planes stacked in depth.
 *
 * It is the inverse of the usual medical hero graphic, deliberately. A rotating
 * brain with signals labelled around it is hub-and-spoke — one organ, many
 * probes. What this site actually computes is the other shape: PELOD-2, pSOFA,
 * Phoenix and PRISM are all sums ACROSS organ systems, and a score means
 * nothing until every plane is accounted for. The stack is that idea, and a
 * reader who understands the picture has understood the product.
 *
 * The six are pSOFA's, taken from its own inputs rather than invented for the
 * illustration: respiratory support and P/F, platelets, bilirubin, MAP and four
 * vasoactives, GCS, creatinine. Each plane names the system and the measurement
 * the score reads it from, so the graphic is checkable against the calculator
 * it describes.
 *
 * NO JAVASCRIPT. This is a server component: `perspective` plus
 * `transform-style: preserve-3d` and one keyframe. It replaces a client
 * component that dynamically imported a canvas renderer, so the hero gets more
 * meaning and the route gets a little of its budget back.
 *
 * It drifts rather than spins — ±16° on a 20s alternation. A full rotation
 * would put every label edge-on twice a revolution, and a label you have to
 * wait for is worse than no label. Under reduced motion it holds at the
 * outbound angle, which is a composed still rather than a flat elevation.
 */
const SYSTEMS = [
  { system: "Respiratory", read: "PaO₂/FiO₂, support" },
  { system: "Coagulation", read: "Platelets" },
  { system: "Hepatic", read: "Bilirubin" },
  { system: "Cardiovascular", read: "MAP, vasoactives" },
  { system: "Neurologic", read: "Glasgow Coma Scale" },
  { system: "Renal", read: "Creatinine" },
] as const;

export function OrganStack({ className }: { className?: string }) {
  return (
    <figure className={className}>
      <div
        aria-hidden="true"
        className="[perspective:1100px] [perspective-origin:50%_40%] relative aspect-[5/4] sm:aspect-[640/460]"
      >
        {/* The rhythm is two custom properties rather than fixed pixels, so the
            stack can compress on a phone without a second markup path. At 375px
            the card is ~285px wide and a 40px step ran the sixth plane 116px
            past the frame. */}
        <ul
          className={[
            "absolute inset-0 m-0 list-none p-0 [transform-style:preserve-3d]",
            "[--depth:22px] [--step:22px] sm:[--depth:34px] sm:[--step:38px]",
            // Held at the outbound angle when motion is reduced, so the figure
            // still reads as a stack in depth rather than collapsing flat.
            "[transform:rotateX(16deg)_rotateY(16deg)]",
            "motion-safe:animate-[organDrift_20s_ease-in-out_infinite_alternate]",
          ].join(" ")}
        >
          {SYSTEMS.map((s, i) => (
            <li
              key={s.system}
              // Each plane sits one step deeper and one step lower, so the set
              // reads as a stack seen slightly from above rather than a fan.
              style={
                {
                  "--i": i,
                  "--d": SYSTEMS.length - 1 - i,
                  "--tint": `${0.05 + i * 0.022}`,
                } as React.CSSProperties
              }
              className={[
                "absolute inset-x-[8%] top-[10%] flex items-center justify-between gap-3",
                "rounded-xl border border-coral/30 px-3.5 py-2.5 sm:px-4 sm:py-3",
                "bg-[rgba(255,122,107,var(--tint))] backdrop-blur-[2px]",
                "[transform:translate3d(0,calc(var(--step)*var(--i)),calc(var(--depth)*var(--d)))]",
                "shadow-[0_18px_34px_-26px_rgba(0,0,0,0.9)]",
              ].join(" ")}
            >
              <span className="font-display text-[12px] font-semibold tracking-tight text-ink-on-dark sm:text-[13px]">
                {s.system}
              </span>
              {/* Dropped below sm. At phone width the plane is ~200px and this
                  wrapped to a second line, which doubled every plane's height
                  and pushed the stack out of its frame. The system name alone
                  still carries the idea. */}
              <span className="hidden font-numeric text-[10.5px] tracking-[0.04em] text-ink-on-dark/75 sm:inline">
                {s.read}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {/* The accessible route to the same information. The 3D construction is
          aria-hidden because its reading order is a stacking order, which means
          nothing out loud; this says the thing the picture is for. */}
      <figcaption className="sr-only">{site.home.heroSceneLabel}</figcaption>
    </figure>
  );
}
