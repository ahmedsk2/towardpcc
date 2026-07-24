import Link from "next/link";
import { site } from "@/content/site";

export const metadata = { title: "Page not found" };

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-[1400px] flex-col items-start px-6 py-24">
      <p className="numeric text-7xl font-medium text-ink-muted md:text-8xl" aria-hidden="true">
        {site.errors.notFound.code}
      </p>
      <h1 className="mt-4 font-display text-3xl font-bold tracking-tight text-ink-strong">
        {site.errors.notFound.heading}
      </h1>
      <p className="mt-3 max-w-[52ch] text-ink-body">{site.errors.notFound.body}</p>
      <Link
        href="/"
        className="mt-8 rounded-sm font-medium text-accent-deep underline decoration-accent/40 underline-offset-4 hover:decoration-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        {site.errors.notFound.homeLink}
      </Link>
    </div>
  );
}
