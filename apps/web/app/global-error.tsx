"use client";

import { site } from "@/content/site";
import { GLOBAL_ERROR_STYLE } from "@/lib/global-error-style";

// Last-resort boundary: layout itself failed, so this renders bare html.
// No error details are shown (PRD §9).
export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif" }}>
        {/* No Tailwind is available in this bare boundary, so restore the app's
            crimson focus-visible idiom (accent #cf1f3d) inline.

            The string lives in lib/global-error-style.ts because proxy.ts must
            name its CSP hash: the admin tier sends style-src-elem with a nonce,
            and a browser supporting the style-src-elem/-attr split ignores the
            permissive style-src that used to cover this element. Kept apart, the
            two drift silently and the style is simply refused — on the one page
            that only renders after everything else has already failed. */}
        <style>{GLOBAL_ERROR_STYLE}</style>
        <main style={{ padding: "4rem 1.5rem" }}>
          <h1>{site.errors.serverError.heading}</h1>
          <p>{site.errors.serverError.body}</p>
          <button type="button" onClick={reset} style={{ marginTop: "1rem" }}>
            {site.errors.serverError.retry}
          </button>
        </main>
      </body>
    </html>
  );
}
