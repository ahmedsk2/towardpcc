import { LegalPage } from "@/components/legal/legal-page";
import { site } from "@/content/site";

export const metadata = {
  title: site.disclaimer.title,
  description: site.disclaimer.metaDescription,
};

export default function DisclaimerPage() {
  return (
    <LegalPage
      heading={site.disclaimer.heading}
      lede={site.disclaimer.lede}
      sections={site.disclaimer.sections}
    />
  );
}
