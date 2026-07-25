"use client";

import { useEffect, useState } from "react";
import { cn } from "@towardpcc/ui";
import { site } from "@/content/site";

/**
 * Registers the Serwist service worker, surfaces an "update available" toast
 * (PRD §6.5), and shows an offline banner. No user data is involved — the SW
 * only precaches public assets so the calculators work in bedside dead-zones.
 */
export function ServiceWorker() {
  const [waiting, setWaiting] = useState<ServiceWorker | null>(null);
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    // Sync with the browser's live online/offline state on mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOffline(!navigator.onLine);
    const onOnline = () => setOffline(false);
    const onOffline = () => setOffline(true);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);

    let reg: ServiceWorkerRegistration | undefined;
    const track = (r: ServiceWorkerRegistration) => {
      if (r.waiting) setWaiting(r.waiting);
      r.addEventListener("updatefound", () => {
        const nw = r.installing;
        if (!nw) return;
        nw.addEventListener("statechange", () => {
          if (nw.state === "installed" && navigator.serviceWorker.controller) setWaiting(nw);
        });
      });
    };

    navigator.serviceWorker
      .register("/sw.js")
      .then((r) => {
        reg = r;
        track(r);
      })
      .catch(() => {
        // Registration failure must never break the page; the site still works online.
      });

    // Reload once the new worker takes control.
    let refreshing = false;
    const onControllerChange = () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);

    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
      void reg;
    };
  }, []);

  const applyUpdate = () => {
    waiting?.postMessage({ type: "SKIP_WAITING" });
    setWaiting(null);
  };

  return (
    <>
      {offline && (
        <div role="status" className="bg-alert-bg px-4 py-2 text-center text-sm text-alert-text">
          {site.pwa.offline}
        </div>
      )}
      {waiting && (
        <div
          role="status"
          className="fixed inset-x-4 bottom-4 z-50 mx-auto flex max-w-md items-center justify-between gap-4 rounded-lg border border-surface-sunken bg-surface-raised p-4 shadow-md"
        >
          <p className="text-sm text-ink-body">{site.pwa.updateReady}</p>
          <button
            type="button"
            onClick={applyUpdate}
            className={cn(
              "shrink-0 rounded-md bg-accent px-3.5 py-2 text-sm font-medium text-ink-on-accent",
              "hover:bg-accent-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
            )}
          >
            {site.pwa.updateAction}
          </button>
        </div>
      )}
    </>
  );
}
