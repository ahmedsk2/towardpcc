import Image from "next/image";
import { cn } from "@towardpcc/ui";

/**
 * An image frame that degrades to a designed placeholder.
 *
 * When `src` is supplied the artwork renders on top of the brand gradient; if
 * the file is missing the gradient and its label remain visible, so a missing
 * asset never leaves a broken-image icon on a clinical site. Without `src` it
 * is purely a placeholder naming the artwork that belongs there.
 *
 * A photograph carries an `alt`; the empty-slot state is `aria-hidden`, because
 * a screen reader should never be told about a picture that does not exist.
 *
 * `aspect` is deliberately its own prop rather than folded into `className`.
 * The ratio belongs to the IMAGE AREA while `className` styles the outer box —
 * a distinction that matters once `frame` puts chrome around the image, and one
 * that previously hid a bug: `aspect-4/3.4` is not a valid Tailwind class
 * (fraction shorthand takes integers), so it compiled to nothing, the box
 * collapsed onto its caption at 581x99, and `object-cover` discarded 74-80% of
 * four photographs across four pages. Always use bracket syntax here.
 */
export function ImageSlot({
  label,
  hint,
  src,
  alt,
  aspect,
  className,
  gradient = "from-surface-hero-raised via-accent to-coral",
  fit = "cover",
  frame = false,
}: {
  label: string;
  hint?: string | undefined;
  src?: string | undefined;
  alt?: string | undefined;
  /** Aspect class for the image area. Bracket syntax only: `aspect-[3/2]`. */
  aspect?: string | undefined;
  className?: string | undefined;
  gradient?: string | undefined;
  /**
   * `cover` fills the box and crops the overflow — right for a photograph,
   * whose subject survives a trim. `contain` fits the whole image, the only
   * correct choice for a screenshot: cropping a user interface destroys the
   * thing the screenshot exists to show.
   */
  fit?: "cover" | "contain" | undefined;
  /**
   * Wrap the image in window chrome. Reads as "this is real software" rather
   * than "this is a photograph", and gives a contained image a surface to sit
   * on instead of floating against the brand gradient.
   */
  frame?: boolean | undefined;
}) {
  const hidden = src ? {} : { "aria-hidden": "true" as const };

  const imageArea = (
    <div
      className={cn(
        "relative grid place-items-center overflow-hidden",
        frame ? "bg-surface-sunken" : cn("rounded-[26px] bg-linear-140", gradient),
        aspect,
      )}
    >
      {frame ? null : (
        <div className="absolute inset-0 bg-[radial-gradient(400px_300px_at_30%_25%,rgba(255,255,255,0.22),transparent_70%)]" />
      )}

      {/* Placeholder sits underneath, so it shows through if src 404s. */}
      <div
        className={cn("relative z-10 px-6 text-center", frame ? "text-ink-muted" : "text-white")}
      >
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
          <p
            className={cn(
              "m-0 mt-1.5 font-numeric text-[11px] tracking-[0.06em]",
              frame ? "text-ink-muted/70" : "text-white/70",
            )}
          >
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
          className={cn("z-20", fit === "contain" ? "object-contain" : "object-cover")}
        />
      ) : null}
    </div>
  );

  if (!frame) {
    return (
      <div
        {...hidden}
        className={cn(
          "overflow-hidden rounded-[26px] shadow-[0_34px_70px_-30px_rgba(61,21,38,0.55)]",
          className,
        )}
      >
        {imageArea}
      </div>
    );
  }

  return (
    <figure
      {...hidden}
      className={cn(
        "m-0 overflow-hidden rounded-[20px] border border-border bg-surface-raised shadow-lg",
        className,
      )}
    >
      {/* Window chrome. The dots are decorative and hidden from assistive tech;
          the caption beside them carries the meaning. */}
      <div className="flex items-center gap-1.5 border-b border-border-subtle bg-surface-sunken px-4 py-2.5">
        <span aria-hidden="true" className="flex gap-1.5">
          <span className="block size-2.5 rounded-full bg-border-strong/35" />
          <span className="block size-2.5 rounded-full bg-border-strong/35" />
          <span className="block size-2.5 rounded-full bg-border-strong/35" />
        </span>
        <figcaption className="ms-2 truncate font-numeric text-[11px] tracking-[0.06em] text-ink-muted">
          {label}
        </figcaption>
      </div>
      {imageArea}
    </figure>
  );
}
