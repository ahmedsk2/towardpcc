"use client";

import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";

/**
 * One-time entry reveal — the only ambient motion the shell allows
 * (docs/design/motion.md). Collapses to static under reduced motion.
 * `data-reveal` pairs with the layout's <noscript> override so content
 * stays visible when JS never runs; a hydration failure after SSR is a
 * documented residual risk (P1 tradeoff, revisit if it ever bites).
 */
export function Reveal({ children, className }: { children: ReactNode; className?: string }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      data-reveal
      className={className}
      initial={reduce ? false : { opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}
