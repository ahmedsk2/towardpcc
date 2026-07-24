# Privacy Engineering

Rules of construction for every feature in this repo (from PRD §8):

1. **Data minimization.** Collect only what a feature needs; prefer not
   collecting at all.
2. **Calculators are client-side.** Score computation happens entirely in
   the browser from `@towardpcc/scoring-engine`. Inputs are never
   transmitted or stored; analytics may record page views only, never input
   values. Shareable state lives in the URL fragment (`#…`), never the
   query string, so it does not reach server logs.
3. **No third-party trackers, fonts, or embeds that phone home.** Fonts are
   self-hosted. Analytics is self-hosted, cookie-less Umami.
4. **Residency.** Production servers are located in Saudi Arabia (Gulf
   region); the site states this where relevant. PDPL-aligned practices; no
   compliance-certification overclaims anywhere, ever.
5. **Notices at the point of entry.** Every form states what is collected,
   why, and where it is stored; every calculator carries the client-side
   line; /legal/data-protection is the canonical trust page.
6. **Retention.** Contact/interest submissions 24 months, audit logs 12
   months — enforced by a scheduled purge job (P6), documented per table in
   ADR-data-model.
7. **Secrets** live in env/secret stores only; `.env.example` documents
   names, never values; gitleaks guards the history.
