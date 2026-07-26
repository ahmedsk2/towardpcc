import { cn } from "@towardpcc/ui";

/**
 * A designed placeholder for artwork that has not been produced yet.
 *
 * It is deliberately a real gradient surface rather than a grey box, so layout
 * and rhythm can be judged before the photography exists. Swap it for
 * `next/image` once a file is in place; the `label` names what belongs here so
 * nobody has to guess.
 *
 * Decorative by definition — `aria-hidden`, so a screen reader is never told
 * about a picture that does not exist.
 */
export function ImageSlot({
  label,
  hint,
  className,
  gradient = "from-surface-hero-raised via-accent to-coral",
}: {
  label: string;
  hint?: string;
  className?: string;
  gradient?: string;
}) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "relative grid place-items-center overflow-hidden rounded-[26px] bg-linear-140 shadow-[0_34px_70px_-30px_rgba(61,21,38,0.55)]",
        gradient,
        className,
      )}
    >
      <div className="absolute inset-0 bg-[radial-gradient(400px_300px_at_30%_25%,rgba(255,255,255,0.22),transparent_70%)]" />
      <div className="relative z-10 px-6 text-center text-white">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          className="mx-auto mb-3 size-10 opacity-90"
          aria-hidden="true"
        >
          <rect x="2" y="4" width="20" height="16" rx="3" stroke="currentColor" strokeWidth="1.7" />
          <circle cx="8.5" cy="9.5" r="1.8" stroke="currentColor" strokeWidth="1.7" />
          <path
            d="M4 17l5-5 3.5 3.5L16 12l4 4"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <p className="m-0 font-display text-base font-semibold">{label}</p>
        {hint ? (
          <p className="m-0 mt-1.5 font-numeric text-[11px] tracking-[0.06em] text-white/70">
            {hint}
          </p>
        ) : null}
      </div>
    </div>
  );
}
