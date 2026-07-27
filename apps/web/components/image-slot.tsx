import Image from "next/image";
import { cn } from "@towardpcc/ui";

/**
 * An image frame that degrades to a designed placeholder.
 *
 * When `src` is supplied the photograph renders on top of the brand gradient;
 * if the file is missing the gradient and its label remain visible, so a
 * missing asset never leaves a broken-image icon on a clinical site. Without
 * `src` it is purely a placeholder naming the artwork that belongs here.
 *
 * A photograph carries an `alt`; the empty-slot state is `aria-hidden`, because
 * a screen reader should never be told about a picture that does not exist.
 */
export function ImageSlot({
  label,
  hint,
  src,
  alt,
  className,
  gradient = "from-surface-hero-raised via-accent to-coral",
}: {
  label: string;
  hint?: string | undefined;
  src?: string | undefined;
  alt?: string | undefined;
  className?: string | undefined;
  gradient?: string | undefined;
}) {
  return (
    <div
      {...(src ? {} : { "aria-hidden": "true" as const })}
      className={cn(
        "relative grid place-items-center overflow-hidden rounded-[26px] bg-linear-140 shadow-[0_34px_70px_-30px_rgba(61,21,38,0.55)]",
        gradient,
        className,
      )}
    >
      <div className="absolute inset-0 bg-[radial-gradient(400px_300px_at_30%_25%,rgba(255,255,255,0.22),transparent_70%)]" />

      {/* Placeholder text sits underneath, so it shows through if src 404s. */}
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

      {src ? (
        <Image
          src={src}
          alt={alt ?? ""}
          fill
          sizes="(max-width: 1024px) 100vw, 640px"
          className="z-20 object-cover"
        />
      ) : null}
    </div>
  );
}
