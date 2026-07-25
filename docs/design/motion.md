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
   `--motion-ease`); durations only from tokens: 150ms interactions,
   400ms reveals.
3. **Entry reveals** use the `Reveal` component (`components/reveal.tsx`):
   one-time, `whileInView`, 12px rise + fade, viewport 30%, never looping.
4. **Hover/focus states** may transition color/border only (150ms).
   `active:` presses translate 1px. Nothing else moves.
5. **Banned:** marquees, parallax, scroll-hijack, infinite loops,
   attention pulses, animated backgrounds outside the P4 hero scene.
   One carve-out: `Skeleton`'s loading pulse — motivated state feedback
   that stops the moment content arrives, and disabled under reduced
   motion (`motion-reduce:animate-none`).
6. **Performance:** animate `transform`/`opacity` only; no
   `window.addEventListener("scroll")` — Motion's `useScroll`/observers
   only (relevant from P4).
7. **Motion must be motivated** — hierarchy, feedback, or state change.
   If the reason can't be said in one sentence, cut the animation.
