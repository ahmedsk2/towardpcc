import { site } from "@/content/site";

const u = site.utility;

/**
 * Thin contact strip above the header (ADR revision 2). Server-rendered, no
 * JavaScript. Collapses to the email alone on small screens so it never eats
 * vertical space on a phone at the bedside.
 */
export function UtilityBar() {
  return (
    <div className="bg-surface-hero-raised text-ink-on-dark/80" data-print="hide">
      <div className="mx-auto flex max-w-[1280px] flex-wrap items-center gap-x-6 gap-y-1 px-6 py-2 text-[13px]">
        <a
          href={`mailto:${u.email}`}
          aria-label={u.emailLabel}
          className="group relative inline-flex items-center gap-2 rounded-sm transition-colors duration-150 hover:text-coral focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-coral"
        >
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 -bottom-0.5 h-px origin-right scale-x-0 bg-coral transition-[scale] duration-150 ease-[var(--motion-ease)] group-hover:origin-left group-hover:scale-x-100 group-focus-visible:origin-left group-focus-visible:scale-x-100 motion-reduce:transition-none"
          />
          <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className="size-3.5 text-coral">
            <path d="M2 5h16v10H2z" stroke="currentColor" strokeWidth="1.6" />
            <path d="M2 6l8 5 8-5" stroke="currentColor" strokeWidth="1.6" />
          </svg>
          {u.email}
        </a>

        <span className="hidden items-center gap-2 sm:inline-flex">
          <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className="size-3.5 text-coral">
            <path
              d="M10 2a6 6 0 016 6c0 4.2-6 10-6 10S4 12.2 4 8a6 6 0 016-6z"
              stroke="currentColor"
              strokeWidth="1.6"
            />
            <circle cx="10" cy="8" r="2" stroke="currentColor" strokeWidth="1.6" />
          </svg>
          {u.residency}
        </span>

        <a
          href={u.linkedin}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={u.linkedinLabel}
          className="ms-auto grid size-9 place-items-center rounded-full bg-white/10 transition-[background-color,scale,translate,box-shadow] duration-150 ease-[var(--motion-ease)] hover:bg-accent hover:shadow-[var(--shadow-accent)] motion-safe:hover:-translate-y-px motion-safe:hover:scale-110 motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-coral"
        >
          <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" className="size-3.5">
            <path d="M4.5 6.5A1.5 1.5 0 113 5a1.5 1.5 0 011.5 1.5zM3.2 8h2.6v9H3.2V8zm5 0h2.5v1.2c.4-.7 1.3-1.4 2.7-1.4 2.4 0 3.1 1.5 3.1 3.6V17h-2.6v-4.8c0-1.1-.4-1.9-1.4-1.9-.8 0-1.3.6-1.5 1.1V17H8.2V8z" />
          </svg>
        </a>
      </div>
    </div>
  );
}
