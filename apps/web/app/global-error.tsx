"use client";

// Last-resort boundary: layout itself failed, so this renders bare html.
// No error details are shown (PRD §9).
export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", padding: "4rem 1.5rem" }}>
        <h1>Something went wrong on our side</h1>
        <p>Try again, and if it keeps happening, tell us.</p>
        <button type="button" onClick={reset} style={{ marginTop: "1rem" }}>
          Try again
        </button>
      </body>
    </html>
  );
}
