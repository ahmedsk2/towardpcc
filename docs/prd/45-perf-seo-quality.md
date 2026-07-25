<!-- Slice of the canonical PRD (.taskmanager/docs/prd.md, sections 10). Load only the slice a phase needs. -->

## 10. Performance, SEO, and quality budgets

Performance (hard limits, CI-checked via Lighthouse CI on key pages): LCP ≤ 2.5 s and CLS ≤ 0.1 on mid-tier mobile; calculator pages interactive ≤ 2 s on 4G; route JS ≤ 170 KB gzipped excluding the lazy hero chunk (≤ 300 KB, §5.4); images AVIF/WebP via `next/image`; fonts self-hosted, subset, `display: swap`.
SEO: unique metadata everywhere; Open Graph images per pillar (designed, on-brand); JSON-LD (`Organization`, `WebSite`, `MedicalWebPage` for calculators with appropriate modesty); sitemap + robots; canonical URLs on towardpcc.com with the other domains 301-redirected (document in the deploy runbook).
Quality: axe-clean in CI on all public pages; Playwright e2e for the critical journeys (home → calculator → compute → copy result; each form → admin inbox; offline calculator use); zero console errors; `code-cleanup` families run before each release (dead code, weak types, async patterns, slop-remover on comments).
---
