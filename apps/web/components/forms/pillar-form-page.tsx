import type { ReactNode } from "react";
import Link from "next/link";
import { StatusChip } from "@towardpcc/ui";
import { site } from "@/content/site";
import { SubmissionForm, type FormField } from "./submission-form";
import type { SubmitResult } from "@/lib/submissions";

type FormConfig = {
  readonly submitLabel: string;
  readonly fields: readonly FormField[];
  readonly privacyLine: string;
  readonly successTitle: string;
  readonly successBody: string;
};

/**
 * Shared shell for the three pillar pages that carry a form (Services,
 * Knowledge, Data): honest status + scope, the pillar's real body, then the
 * shared SubmissionForm and the data-protection link (PRD §8.4).
 */
export function PillarFormPage({
  status,
  statusTone = "neutral",
  title,
  lede,
  body,
  formHeading,
  action,
  form,
}: {
  status: string;
  statusTone?: "accent" | "neutral" | "success";
  title: string;
  lede: string;
  body?: ReactNode;
  formHeading: string;
  action: (prev: SubmitResult | null, formData: FormData) => Promise<SubmitResult>;
  form: FormConfig;
}) {
  return (
    <div className="mx-auto max-w-[720px] px-6 py-16 md:py-24">
      <StatusChip tone={statusTone}>{status}</StatusChip>
      <h1 className="mt-4 font-display text-4xl font-bold tracking-tight text-ink-strong">
        {title}
      </h1>
      <p className="mt-5 max-w-[62ch] text-lg leading-relaxed text-ink-body">{lede}</p>

      {body && <div className="mt-8 max-w-[62ch]">{body}</div>}

      <section className="mt-12 border-t border-border pt-10">
        <h2 className="font-display text-2xl font-medium text-ink-strong">{formHeading}</h2>
        <div className="mt-6">
          <SubmissionForm
            action={action}
            fields={form.fields}
            submitLabel={form.submitLabel}
            privacyLine={form.privacyLine}
            successTitle={form.successTitle}
            successBody={form.successBody}
          />
        </div>
        <p className="mt-6 text-[13px] text-ink-muted">
          <Link
            href={site.home.trust.href}
            className="text-accent-deep underline decoration-accent/40 underline-offset-4 hover:decoration-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            Read {site.forms.policyLinkText}
          </Link>
          .
        </p>
      </section>
    </div>
  );
}
