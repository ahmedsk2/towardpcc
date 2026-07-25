<!-- Slice of the canonical PRD (.taskmanager/docs/prd.md, sections 5). Load only the slice a phase needs. -->

## 5. Design direction (the part visitors will remember)

The founder's brief: _a fabulous UX that attracts visitors and shows professionalism at the same time; the home page may contain animation and 3D._ Execute that with taste, not noise.

### 5.1 Mood references — review them yourself

Using the connected browser (`Claude_Browser` MCP), open and study these before designing:

- https://dribbble.com/tags/3d-website
- https://dribbble.com/shots/popular/web-design
- https://dribbble.com/shots/popular
- https://dribbble.com/tags/ui-template
- https://elements.envato.com/graphic-templates/ux-and-ui-kits
  **Extract principles, never copies.** Note what the best shots share: one confident hero idea, disciplined type scale, generous negative space, a single signature moment, restrained accents. Do not reproduce any specific shot, template, illustration, or purchasable kit — everything here is designed from scratch (IP hygiene is part of professionalism). Record your extracted principles in `docs/decisions/ADR-design-direction.md`.

### 5.2 Design process (mandatory)

Invoke the **`frontend-design`** skill, then the **`taste-skill`** / **`ui-ux-pro-max:design-system`** families, and follow their two-pass discipline: (1) write a compact design plan — palette as named hex tokens, type roles, layout concept with ASCII wireframes, one signature element; (2) self-critique it against the brief — if any part is the generic default you'd produce for any medical SaaS, revise before writing code. Explicitly avoid the current AI-default looks (cream + serif + terracotta; near-black + acid green; broadsheet hairlines). Screenshot and critique your own build in the browser at every milestone.

### 5.3 Direction to start from (refine through 5.2, don't skip it)

**Concept: "Precision and pulse."** The visual world of pediatric intensive care — monitor waveforms, calm urgency, exact numbers — translated into something elegant rather than literal.

- **Canvas:** a deep clinical _midnight-petrol_ hero band (dark, but never generic near-black) flowing into _porcelain_ light content surfaces. The dark→light transition is itself a design moment.
- **Accents:** one _monitor-teal_ primary accent and one _pulse-coral_ used sparingly (alerts, the single most important CTA). Neutrals do most of the work. Define all of it as CSS custom properties / Tailwind tokens in `packages/ui`.
- **Typography:** a characterful grotesk display face (e.g. Space Grotesk, General Sans, or Clash Display via Fontshare — self-host the files, verify the license) paired with a quiet, highly-legible body face (e.g. Inter or Geist). A mono/tabular face (e.g. Geist Mono or IBM Plex Mono) for every number the platform outputs — scores, doses, results — with `font-variant-numeric: tabular-nums`. Numbers are the product; give them their own voice.
- **Signature element (the one bold thing):** the home hero's 3D scene — a slowly _breathing_ abstract form built from flowing waveform lines/particles that subtly responds to pointer movement and, on scroll, resolves into the four pillars. Calm, alive, precise. One orchestrated moment; everything after it is quiet and disciplined.
- **Layout language:** a refined bento grid for the four pillars; generous whitespace; structural labels only where they encode real information; micro-interactions limited to hover/focus states that aid comprehension.

### 5.4 3D & motion engineering rules

- R3F scene is `next/dynamic`-imported, never in the critical path; a designed static poster renders first and always remains the fallback.
- Budgets: hero JS chunk ≤ 300 KB gzipped; 60 fps target on a mid-range laptop; automatic quality step-down (particle count) on weak GPUs; `IntersectionObserver`-paused when off-screen.
- `prefers-reduced-motion: reduce` ⇒ poster only, zero animation, no exceptions.
- Mobile ⇒ lightweight variant or poster, decided by device capability check, not user agent guessing.

### 5.5 Responsive mandate

Fully responsive from 320 px to 4K. Design mobile-first for the calculators (bedside phone use is the primary real-world context), desktop-first for the data-heavy admin. Test at 360, 768, 1024, 1440, 1920 in Playwright viewports; no horizontal scroll, no broken bento collapse, tap targets ≥ 44 px.
---
