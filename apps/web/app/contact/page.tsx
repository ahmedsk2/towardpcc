import Link from "next/link";
import { SubmissionForm } from "@/components/forms/submission-form";
import { site } from "@/content/site";
import { submitContact } from "./actions";

export const metadata = {
  title: site.contactPage.title,
  description: site.contactPage.metaDescription,
};

const c = site.contactPage;
const form = site.forms.contact;

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-[640px] px-6 py-16 md:py-24">
      <h1 className="font-display text-4xl font-bold tracking-tight text-ink-strong">
        {c.heading}
      </h1>
      <p className="mt-4 max-w-[56ch] text-lg leading-relaxed text-ink-body">{c.lede}</p>

      <div className="mt-10">
        <SubmissionForm
          action={submitContact}
          fields={form.fields}
          submitLabel={form.submitLabel}
          privacyLine={form.privacyLine}
          successTitle={form.successTitle}
          successBody={form.successBody}
        />
      </div>

      <p className="mt-8 text-[15px] text-ink-muted">
        {c.emailLabel}{" "}
        <a
          href={`mailto:${c.email}`}
          className="numeric font-medium text-accent-deep underline decoration-accent/40 underline-offset-4 hover:decoration-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          {c.email}
        </a>
        .{" "}
        <Link
          href={site.home.trust.href}
          className="text-accent-deep underline decoration-accent/40 underline-offset-4 hover:decoration-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          Read {site.forms.policyLinkText}
        </Link>
        .
      </p>
    </div>
  );
}
