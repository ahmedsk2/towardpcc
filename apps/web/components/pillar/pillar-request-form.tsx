import Link from "next/link";
import { site } from "@/content/site";
import { SubmissionForm, type FormField } from "@/components/forms/submission-form";
import type { SubmitResult } from "@/lib/submissions";

type FormConfig = {
  readonly submitLabel: string;
  readonly fields: readonly FormField[];
  readonly privacyLine: string;
  readonly successTitle: string;
  readonly successBody: string;
};

/**
 * The request form that closes every pillar page, with the data-protection
 * link the PRD requires next to it (§8.4).
 */
export function PillarRequestForm({
  heading,
  action,
  form,
}: {
  heading: string;
  action: (prev: SubmitResult | null, formData: FormData) => Promise<SubmitResult>;
  form: FormConfig;
}) {
  return (
    <>
      <h2 className="font-display text-3xl font-bold tracking-tight text-ink-strong">{heading}</h2>
      <div className="mt-8">
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
    </>
  );
}
