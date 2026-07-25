/// <reference lib="webworker" />
import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { NetworkOnly, Serwist } from "serwist";

// Serwist injects the precache manifest (all build assets + calculator pages)
// at build time. The calculator catalog is precached so it works offline
// (PRD §6.5). No user input is ever cached — compute is in-page from the
// engine bundle, which is itself precached.
declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[];
  }
}

declare const self: ServiceWorkerGlobalScope;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: false,
  clientsClaim: true,
  navigationPreload: true,
  // Never cache the authenticated admin area — its pages render submitter PII,
  // so a cached copy could be served offline on a shared device or read via
  // caches.match. This NetworkOnly rule is matched before the defaultCache
  // catch-all (Serwist evaluates in order), so no /admin document or RSC
  // response is ever stored; /admin is dynamic, so it is never precached either.
  runtimeCaching: [
    {
      matcher: ({ url, sameOrigin }) => sameOrigin && url.pathname.startsWith("/admin"),
      handler: new NetworkOnly(),
    },
    ...defaultCache,
  ],
});

serwist.addEventListeners();

// Let the update toast trigger activation of a waiting worker.
self.addEventListener("message", (event: ExtendableMessageEvent) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    void self.skipWaiting();
  }
});
