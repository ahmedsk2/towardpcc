"use client";

import { useCallback, useEffect, useState } from "react";

const KEY = "towardpcc:favorites";

/**
 * Local-only favorites (PRD §6.4): stored in this browser's localStorage,
 * never transmitted. Read once on mount to avoid a hydration mismatch.
 */
export function useFavorites() {
  const [favorites, setFavorites] = useState<readonly string[]>([]);
  const [ready, setReady] = useState(false);

  // Read from localStorage on mount (post-hydration) — reading it in the
  // initializer would diverge from the server render and mismatch hydration.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const parsed: unknown = JSON.parse(raw);
        if (Array.isArray(parsed))
          // eslint-disable-next-line react-hooks/set-state-in-effect
          setFavorites(parsed.filter((x): x is string => typeof x === "string"));
      }
    } catch {
      // Corrupt/unavailable storage → start with no favorites.
    }
    setReady(true);
  }, []);

  const toggle = useCallback((slug: string) => {
    setFavorites((prev) => {
      const next = prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug];
      try {
        localStorage.setItem(KEY, JSON.stringify(next));
      } catch {
        // Storage may be full or blocked; the in-memory state still updates.
      }
      return next;
    });
  }, []);

  return { favorites, toggle, ready };
}
