import { cn } from "@towardpcc/ui";

/**
 * The small uppercase label above a section heading.
 *
 * It was built inline from the same six utilities in three places, and all
 * three drew a `bg-accent-tint` pill. That fill is #fff2ee — 1.09:1 against the
 * white and near-white grounds these sections sit on, and byte-identical to
 * `surface-sunken`. The pill was invisible: what actually read was uppercase
 * crimson text with unexplained padding around it.
 *
 * A leading rule replaces it. It works on any ground, it does not pretend to be
 * a shape nobody can see, and it gives the eye a consistent entry point down
 * the page — which is the job the pill was meant to do.
 *
 * Crimson on white is 5.36:1, past AA for this size, and the rule itself is far
 * past the 3:1 a non-text element needs.
 */
export function Eyebrow({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <p
      className={cn(
        "mb-4 inline-flex items-center gap-3 font-numeric text-[12px] font-semibold tracking-[0.14em] text-accent uppercase",
        className,
      )}
    >
      <span aria-hidden="true" className="h-0.5 w-7 rounded-full bg-accent" />
      {children}
    </p>
  );
}
