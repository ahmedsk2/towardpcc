# Launch-readiness scorecard

- Date: 2026-07-25 · after P7 (hardening & audits). Next: P8 (launch readiness).
- Legend: ✅ done & verified · 🟡 done, follow-up tracked · 🔴 P8 / pre-launch

| Area                             | Status | Evidence / notes                                                                                                                                                                           |
| -------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Calculators**                  | ✅     | 22 Tier-A scores, 100% engine line+branch coverage, each cites its source; independently clinical-red-teamed (86 worked examples recomputed, zero wrong numbers); offline compute verified |
| **Client-side privacy (TM-001)** | ✅     | Inputs never leave the browser — static grep-guards + Playwright airplane-mode e2e in CI                                                                                                   |
| **PWA / offline**                | ✅     | Serwist precache, install page; `/admin` excluded from the SW cache                                                                                                                        |
| **Home + signature hero**        | ✅     | R3F breathing-waveform (lazy, poster fallback, reduced-motion, capability-gated); budgets met                                                                                              |
| **Pillar pages + forms**         | ✅     | contact / services / knowledge / data — Zod-validated, honeypot + time-trap, rate-limited, IP-hashed; verified end-to-end                                                                  |
| **Admin (auth/inbox/meta)**      | ✅     | Auth.js + Argon2id + mandatory TOTP (replay-protected) + lockout; inbox/triage/audit/email; verified end-to-end                                                                            |
| **Security — code**              | ✅     | Full-stack audit clean on injection/secrets/authz classes; P5 + P7 findings all fixed (docs/security/p5-, p7- reports)                                                                     |
| **Security — headers/CSP**       | 🟡     | Strict headers + two-tier CSP shipping; nonce tier live on `/admin`. Re-run `sec-web` for a grade at P8                                                                                    |
| **Dependencies**                 | ✅     | Prod audit zero high/critical; CI `deps` gate; SHA-pinned actions + dependabot                                                                                                             |
| **Performance budgets**          | 🟡     | Route JS ≤170 KB gzipped enforced deterministically in CI; Lighthouse timing metrics warn until calibrated on CI hardware; CLS follow-up (font-swap)                                       |
| **Accessibility**                | 🟡     | Semantic structure, focus-visible idiom, tap targets ≥44px, reduced-motion throughout; a full WCAG 2.2 AA audit is a pre-launch pass                                                       |
| **Data model + retention**       | ✅     | Prisma model + migrations; retention purge (24mo/12mo) verified; ADR-data-model                                                                                                            |
| **Legal & trust**                | 🟡     | data-protection / terms / disclaimer live (§8.2/§8.3 wording, counsel-review markers); **counsel review pending**                                                                          |
| **Ops — Docker**                 | 🟡     | Hardened (non-root, healthcheck, digest-pinned, dumb-init, packages/db); image not yet built/scanned in CI (P8)                                                                            |
| **Ops — backups**                | 🔴     | Runbook written; scheduled backup + **tested restore drill** on OCI infra required before launch                                                                                           |
| **Ops — observability**          | 🔴     | Structured request logging (pino) to add pre-launch                                                                                                                                        |
| **Domain trust (TM-008)**        | 🔴     | Registry/registrar lock, DNSSEC, CAA, monitoring — P8, before DNS                                                                                                                          |
| **Email auth (TM-008)**          | 🔴     | SPF/DKIM/DMARC `p=reject`/MTA-STS — P8, before first send                                                                                                                                  |
| **Staging deploy (OCI)**         | 🔴     | me-riyadh-1/me-jeddah-1; needs the founder's explicit go-ahead (spends money / public infra)                                                                                               |
| **PWA raster icons**             | 🔴     | SVG-only today; generate PNGs pre-launch (sharp unavailable on ARM dev box)                                                                                                                |
| **Mailbox `info@towardpcc.com`** | 🔴     | Verify it exists and receives mail before launch                                                                                                                                           |

## Bottom line

The product (calculators, home, pillar pages + forms, admin) is **built,
verified, and secure**; P0–P7 are complete and green in CI. What remains for P8
is **deployment and infrastructure trust** — standing up OCI, backups, domain +
email authentication, the counsel review, and the raster icons — none of which
can be finished from the dev environment, and the OCI deploy needs the founder's
explicit go-ahead.
