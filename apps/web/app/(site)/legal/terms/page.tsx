import { LegalPage } from "@/components/legal/legal-page";
import { site } from "@/content/site";

export const metadata = {
  title: site.terms.title,
  description: site.terms.metaDescription,
};

export default function TermsPage() {
  return (
    <LegalPage
      crumb={site.terms.title}
      heading={site.terms.heading}
      lede={site.terms.lede}
      sections={site.terms.sections}
    />
  );
}
