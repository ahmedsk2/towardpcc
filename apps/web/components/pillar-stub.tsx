import type { ReactNode } from "react";
import { Callout, StatusChip } from "@towardpcc/ui";
import { site } from "@/content/site";

interface PillarStubProps {
  title: string;
  status: string;
  description: string;
  chipTone?: "accent" | "neutral";
  children?: ReactNode;
}

/**
 * Honest placeholder for a pillar page while its real build lands
 * (calculators in P2/P3, forms + full pages in P5). Real scope text,
 * real status, zero fake content.
 */
export function PillarStub({
  title,
  status,
  description,
  chipTone = "neutral",
  children,
}: PillarStubProps) {
  return (
    <div className="mx-auto max-w-[1400px] px-6 py-20">
      <StatusChip tone={chipTone}>{status}</StatusChip>
      <h1 className="mt-4 font-display text-4xl font-bold tracking-tight text-ink-strong">
        {title}
      </h1>
      <p className="mt-5 max-w-[58ch] text-lg leading-relaxed">{description}</p>
      {children}
      <Callout tone="note" className="mt-10 max-w-[58ch]">
        {site.stub.notice}
      </Callout>
    </div>
  );
}
