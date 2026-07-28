# Motion guidelines

From ADR-design-direction (dial: motion 3 site-wide). The hero's
orchestrated moment (P4) is the single exception and lives inside these
same guards.

## Rules

1. **Reduced motion is absolute.** Every animation — CSS or Motion —
   collapses to static under `prefers-reduced-motion: reduce`. In React,
   use `useReducedMotion()`; in CSS, the `motion-reduce:` variant. No
   exceptions, including the P4 hero (poster only).
2. **One easing voice.** `cubic-bezier(0.22, 1, 0.36, 1)` (token
   `--motion-ease`); durations only from tokens: 150ms interactions
   (never longer — half a second on a control reads as lag), 400ms state
   changes, 700ms scroll reveals, 1500ms counters. Always name the
   properties being transitioned; `transition: all` is banned, because it
   forces the browser to watch every animatable property and makes the
   intent unreadable.
3. **Entry reveals** use the `Reveal` component (`components/reveal.tsx`):
   one-time, `whileInView`, 12px rise + fade, viewport 30%, never looping.
4. **Hover/focus states** may transition color/border only (150ms).
   `active:` presses translate 1px. Nothing else moves.
5. **Banned:** preloaders (never block a loaded interface behind a splash —
   a clinician opening a calculator mid-resuscitation must see input
   fields); marquees; parallax on content; **scroll-hijack** — no
   smooth-scroll libraries, they break anchor precision, assistive tech,
   and scroll muscle memory; infinite loops on anything interactive;
   attention pulses; and any reveal that replays (an `IntersectionObserver`
   must `unobserve` after firing — content dissolving while it is being
   re-read is a usability defect, not polish).

   **Permitted from 2026-07-27 (ADR revision 2):** slow ambient drift on
   purely decorative hero elements, and count-up animation on **marketing
   figures only** — never on a computed clinical value, because rolling
   digits teach the eye that a number is decorative, and that is the exact
   opposite of what a score must communicate.

   **Narrowed 2026-07-28 (revision 3): count-up is permitted in the home
   counter band and nowhere else.** "Marketing figures only" was too loose. The
   pillar-page hero stat band was legal under it and shipped a real defect: the
   band sits above the fold, the component server-renders `0` and animates
   after hydration, so the first paint read "0 Pilot unit" directly beneath
   "Pilot underway · one Gulf unit", and "1 Areas of support" beside "Three
   kinds of help." The underlying content was correct throughout — the
   animation was reading correct values out loud starting from zero, in a place
   where a visitor could screenshot the contradiction.

   The rule is therefore positional, not categorical: count-up is safe where a
   figure is decorative _and_ below the fold, so it has scrolled into view
   before it animates. Every other figure renders its final value in the first
   paint. Carve-out retained:
   `Skeleton`'s loading pulse — motivated state feedback that stops the
   moment content arrives, disabled under reduced motion
   (`motion-reduce:animate-none`).

6. **Performance:** animate `transform`/`opacity` only; no
   `window.addEventListener("scroll")` — Motion's `useScroll`/observers
   only (relevant from P4).
7. **Motion must be motivated** — hierarchy, feedback, or state change.
   If the reason can't be said in one sentence, cut the animation.
