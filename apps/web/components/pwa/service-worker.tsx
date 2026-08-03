"use client";

import { useEffect, useRef, useState } from "react";
import { site } from "@/content/site";

/**
 * Registers the Serwist service worker and shows the offline banner. No user
 * data is involved — the SW only precaches public assets so the calculators
 * work in bedside dead-zones.
 *
 * Updates apply SILENTLY, as the reader leaves a page. There is deliberately no
 * "a new version is available" prompt (PRD §6.5 asked for one; this is a
 * considered departure, see below).
 *
 * Why no prompt: `next.config.ts` pins no `generateBuildId`, so Next mints a
 * random build id per build and bakes it into precached paths. `sw.js` therefore
 * changes on EVERY deploy — including one that touched only a markdown file —
 * and every returning reader was told a new version was available. The toast had
 * no dismiss control and lives in the root layout, which does not remount across
 * client-side navigation, so once shown it stayed pinned over the content on
 * every page until clicked. A prompt that fires on non-changes and cannot be
 * refused is noise, and readers learn to ignore it.
 *
 * Why on pagehide, and not immediately: `sw.ts` keeps `skipWaiting: false` on
 * purpose. Routes are code-split, so a worker that takes over mid-session leaves
 * the running page asking for chunk URLs the new precache no longer lists and
 * the origin no longer serves. Waiting until the document is being torn down
 * means activation costs the reader nothing — the page they are on is already
 * going away, and the next one is controlled by the new worker with assets that
 * match it.
 *
 * Known limit: with several tabs open, one tab unloading activates the worker
 * for the others, which are still running the previous build. Next recovers from
 * a chunk-load failure with a hard navigation, so the cost is one slow route
 * change in that case rather than a broken page. That is a better trade than
 * reloading every reader, which is what the previous unconditional
 * `controllerchange` reload did — measured as a second document request ~5.1s
 * into every first visit.
 */
export function ServiceWorker() {
  const [offline, setOffline] = useState(false);
  const waitingRef = useRef<ServiceWorker | null>(null);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    // Sync with the browser's live online/offline state on mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOffline(!navigator.onLine);
    const onOnline = () => setOffline(false);
    const onOffline = () => setOffline(true);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);

    const track = (r: ServiceWorkerRegistration) => {
      if (r.waiting) waitingRef.current = r.waiting;
      r.addEventListener("updatefound", () => {
        const nw = r.installing;
        if (!nw) return;
        nw.addEventListener("statechange", () => {
          // `controller` non-null means this is a genuine update rather than the
          // first install, where there is no previous worker to replace.
          if (nw.state === "installed" && navigator.serviceWorker.controller) {
            waitingRef.current = nw;
          }
        });
      });
    };

    navigator.serviceWorker
      .register("/sw.js")
      .then(track)
      .catch(() => {
        // Registration failure must never break the page; the site still works online.
      });

    // `pagehide` rather than `beforeunload`: it is the event that actually fires
    // on mobile Safari, and it tells us whether the document is being frozen for
    // the back/forward cache instead of destroyed. A bfcache'd page can be
    // restored and keep running, so leave its worker alone.
    const onPageHide = (event: PageTransitionEvent) => {
      if (event.persisted) return;
      waitingRef.current?.postMessage({ type: "SKIP_WAITING" });
      waitingRef.current = null;
    };
    window.addEventListener("pagehide", onPageHide);

    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("pagehide", onPageHide);
    };
  }, []);

  if (!offline) return null;

  return (
    <div role="status" className="bg-alert-bg px-4 py-2 text-center text-sm text-alert-text">
      {site.pwa.offline}
    </div>
  );
}
