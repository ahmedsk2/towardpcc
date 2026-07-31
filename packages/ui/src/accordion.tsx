"use client";

import { useId, useState } from "react";
import { cn } from "./cn";

export type AccordionItem = { question: string; answer: string };

/**
 * Single-open disclosure list.
 *
 * Uses a grid-rows 0fr→1fr transition rather than animating height, so the
 * panel never needs a measured pixel value and content can reflow freely. The
 * open panel is a real `region` labelled by its trigger, and the trigger keeps
 * `aria-expanded`, so it is navigable without sight.
 */
export function Accordion({
  items,
  className,
}: {
  items: readonly AccordionItem[];
  className?: string | undefined;
}) {
  const [open, setOpen] = useState<number | null>(null);
  const base = useId();

  return (
    <div className={cn("flex flex-col gap-3.5", className)}>
      {items.map((item, i) => {
        const isOpen = open === i;
        const btnId = `${base}-t-${i}`;
        const panelId = `${base}-p-${i}`;
        return (
          <div
            key={item.question}
            className={cn(
              "overflow-hidden rounded-md border bg-surface-raised transition-colors duration-150",
              isOpen ? "border-accent" : "border-border-strong",
            )}
          >
            <h3 className="m-0">
              <button
                id={btnId}
                type="button"
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() => setOpen(isOpen ? null : i)}
                className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left font-display text-[17px] font-semibold text-ink-strong transition-colors duration-150 hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                {item.question}
                <span
                  aria-hidden="true"
                  className={cn(
                    "relative grid size-7 shrink-0 place-items-center rounded-full transition-colors duration-150",
                    isOpen ? "bg-accent" : "bg-accent-tint",
                  )}
                >
                  <span
                    className={cn("absolute h-0.5 w-3", isOpen ? "bg-ink-on-accent" : "bg-accent")}
                  />
                  <span
                    className={cn(
                      // `transition-[rotate]`: Tailwind v4 compiles rotate-90
                      // to the `rotate` property, so naming `transform` here
                      // transitioned nothing and the plus snapped to a minus.
                      "absolute h-0.5 w-3 transition-[rotate] duration-200 ease-[var(--motion-ease)] motion-reduce:transition-none",
                      isOpen ? "bg-ink-on-accent" : "rotate-90 bg-accent",
                    )}
                  />
                </span>
              </button>
            </h3>
            <div
              id={panelId}
              role="region"
              aria-labelledby={btnId}
              className={cn(
                "grid transition-[grid-template-rows] duration-300 ease-[var(--motion-ease)]",
                isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
              )}
            >
              <div className="overflow-hidden">
                <p className="m-0 px-6 pb-6 text-[15px] leading-relaxed text-ink-muted">
                  {item.answer}
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
