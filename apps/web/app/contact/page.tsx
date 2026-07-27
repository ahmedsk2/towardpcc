import Link from "next/link";
import { SubmissionForm } from "@/components/forms/submission-form";
import { PageHero } from "@/components/page-hero";
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
    <>
      <PageHero crumb={site.nav.contact} title={c.heading} lede={c.lede} />

      <div className="mx-auto max-w-[640px] px-6 pt-4 pb-24">
        <SubmissionForm
          action={submitContact}
          fields={form.fields}
          submitLabel={form.submitLabel}
          privacyLine={form.privacyLine}
          successTitle={form.successTitle}
          successBody={form.successBody}
        />

        <p className="mt-8 text-[15px] text-ink-muted">
          {c.emailLabel}{" "}
          <a
            href={`mailto:${c.email}`}
            className="font-numeric font-medium text-accent-deep underline decoration-accent/40 underline-offset-4 hover:decoration-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
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
    </>
  );
}
