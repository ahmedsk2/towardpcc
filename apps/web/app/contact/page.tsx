import { PillarStub } from "@/components/pillar-stub";
import { site } from "@/content/site";

export const metadata = {
  title: site.contactPage.title,
  description: site.contactPage.metaDescription,
};

export default function ContactPage() {
  return (
    <PillarStub
      title={site.contactPage.heading}
      status={site.contactPage.status}
      description={site.contactPage.description}
    >
      <p className="mt-6 text-lg">
        {site.contactPage.emailLabel}{" "}
        <a
          href={`mailto:${site.contactPage.email}`}
          className="numeric font-medium text-accent-deep underline decoration-accent/40 underline-offset-4 hover:decoration-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          {site.contactPage.email}
        </a>
      </p>
    </PillarStub>
  );
}
