"use client";

import { site } from "@/content/site";

// Last-resort boundary: layout itself failed, so this renders bare html.
// No error details are shown (PRD §9).
export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif" }}>
        {/* No Tailwind is available in this bare boundary, so restore the app's
            crimson focus-visible idiom (accent #cf1f3d) inline. */}
        <style>{`button:focus-visible{outline:2px solid #cf1f3d;outline-offset:2px}`}</style>
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
