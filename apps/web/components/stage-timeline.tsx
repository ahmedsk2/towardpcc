import { cn } from "@towardpcc/ui";

export type Stage = {
  label: string;
  /** What has to be true to leave this stage. Kept honest and specific. */
  detail: string;
};

/**
 * A horizontal progression with the current stage marked.
 *
 * Built for /data, where there is no dashboard imagery to publish yet — the
 * pilot unit has not approved it — and a placeholder in that slot says nothing.
 * Showing the *process* instead is the honest substitute: it tells a prospective
 * unit what stage the registry is at and what the next one requires, which is
 * more useful to someone deciding whether to join than a screenshot would be.
 *
 * Deliberately shows stages that are NOT reached. A roadmap that only lists what
 * is done is a changelog; the value here is being explicit that multi-unit is
 * ahead, not behind.
 */
export function StageTimeline({
  stages,
  currentIndex,
  className,
}: {
  stages: readonly Stage[];
  /** Zero-based. Everything before it is complete, everything after is ahead. */
  currentIndex: number;
  className?: string;
}) {
  return (
    <ol className={cn("grid list-none gap-6 sm:grid-cols-3", className)}>
      {stages.map((stage, i) => {
        const done = i < currentIndex;
        const current = i === currentIndex;
        return (
          <li key={stage.label} className="relative">
            {/* The connector, drawn between cards rather than through them.
                Hidden on small screens where the list stacks vertically and a
                horizontal rule would point nowhere. */}
            {i < stages.length - 1 ? (
              <span
                aria-hidden="true"
                className={cn(
                  "absolute top-3 left-[calc(50%+1.25rem)] hidden h-px w-[calc(100%-2.5rem)] sm:block",
                  done ? "bg-accent/50" : "bg-border",
                )}
              />
            ) : null}

            <span
              aria-hidden="true"
              className={cn(
                "relative z-10 grid size-6 place-items-center rounded-full border-2",
                done && "border-accent bg-accent",
                current && "border-accent bg-surface-raised",
                !done && !current && "border-border bg-surface-raised",
              )}
            >
              {done ? (
                <svg viewBox="0 0 12 12" fill="none" className="size-3 text-white">
                  <path
                    d="M2.5 6.2 4.8 8.5 9.5 3.6"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              ) : current ? (
                <span className="size-2 rounded-full bg-accent" />
              ) : null}
            </span>

            <h3
              className={cn(
                "mt-4 font-display text-[17px] font-semibold",
                current ? "text-accent-deep" : "text-ink-strong",
              )}
            >
              {stage.label}
              {/* Stated in text, not only by colour — the current stage must be
                  identifiable without seeing the dot (WCAG 1.4.1). */}
              {current ? <span className="sr-only"> — current stage</span> : null}
              {done ? <span className="sr-only"> — complete</span> : null}
            </h3>
            <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">{stage.detail}</p>
          </li>
        );
      })}
    </ol>
  );
}
