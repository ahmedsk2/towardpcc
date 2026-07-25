import { Callout } from "@towardpcc/ui";

type Section = { heading: string; body: string };

/** Shared layout for the plain-English legal pages (terms, disclaimer). */
export function LegalPage({
  heading,
  lede,
  sections,
  pendingNote,
}: {
  heading: string;
  lede: string;
  sections: readonly Section[];
  pendingNote?: string;
}) {
  return (
    <div className="mx-auto max-w-[720px] px-6 py-16 md:py-24">
      <h1 className="font-display text-4xl font-bold tracking-tight text-ink-strong">{heading}</h1>
      <p className="mt-5 max-w-[62ch] text-lg leading-relaxed text-ink-body">{lede}</p>

      <div className="mt-12 flex flex-col gap-10">
        {sections.map((s) => (
          <section key={s.heading}>
            <h2 className="font-display text-xl font-medium text-ink-strong">{s.heading}</h2>
            <p className="mt-3 max-w-[62ch] leading-relaxed text-ink-body">{s.body}</p>
          </section>
        ))}
      </div>

      {pendingNote && (
        <Callout tone="note" className="mt-12 text-[13px]">
          {/* The counsel-review marker lives in the source; strip it from display. */}
          {pendingNote.replace(/\s*<!--.*?-->\s*$/, "")}
        </Callout>
      )}
    </div>
  );
}
