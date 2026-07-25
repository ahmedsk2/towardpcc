"use client";

import Link from "next/link";
import { Button } from "@towardpcc/ui";
import { site } from "@/content/site";

// Renders no error details: nothing internal leaks to the page (PRD §9).
export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="mx-auto flex max-w-[1400px] flex-col items-start px-6 py-24">
      <h1 className="font-display text-3xl font-bold tracking-tight text-ink-strong">
        {site.errors.serverError.heading}
      </h1>
      <p className="mt-3 max-w-[52ch] text-ink-body">{site.errors.serverError.body}</p>
      <div className="mt-8 flex items-center gap-5">
        <Button variant="secondary" onClick={reset}>
          {site.errors.serverError.retry}
        </Button>
        <Link
          href="/contact"
          className="rounded-sm font-medium text-accent-deep underline decoration-accent/40 underline-offset-4 hover:decoration-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          {site.errors.serverError.contactLink}
        </Link>
      </div>
    </div>
  );
}
