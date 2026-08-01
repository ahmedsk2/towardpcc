"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { cn } from "@towardpcc/ui";
import { site } from "@/content/site";
import { shouldOfferInstall, type InstallEnvironment } from "./install-eligibility";

const p = site.pwa;

/** Browser-local, like favorites. Never transmitted; see the data-protection page. */
const DISMISSED_KEY = "towardpcc:install-dismissed";

/**
 * How long to wait for `beforeinstallprompt` before concluding the browser will
 * never fire it.
 *
 * This is how iOS is detected — by capability rather than by user-agent string.
 * Safari has never implemented the event, so on iPhone the wait always expires
 * and the banner falls back to linking at the manual instructions. Sniffing the
 * UA would have been shorter and would have broken on the next iPadOS release
 * that reports itself as a Mac, and again on every Chromium-on-iOS build, which
 * is WebKit underneath and equally has no event to fire.
 *
 * The same expiry doubles as the "don't fight first paint" delay: a banner that
 * animates in during LCP is both irritating and a performance regression.
 */
const PROMPT_WAIT_MS = 2500;

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function readDismissed(): boolean {
  try {
    return localStorage.getItem(DISMISSED_KEY) === "1";
  } catch {
    // Safari in private mode throws on storage access. Treat it as
    // not-dismissed: showing the banner once more is a smaller failure than
    // crashing the page on a bedside phone.
    return false;
  }
}

/**
 * Read the live environment. The decision itself lives in install-eligibility.ts
 * so it can be tested — see the note there on why a browser cannot exercise it.
 *
 * The phone test needs both halves: width alone would catch a narrowed desktop
 * window, and `pointer: coarse` alone would catch a touchscreen laptop, where
 * "add to home screen" means nothing.
 */
function readEnvironment(): InstallEnvironment {
  return {
    standalone: window.matchMedia("(display-mode: standalone)").matches,
    iosStandalone: (window.navigator as Navigator & { standalone?: boolean }).standalone === true,
    phone: window.matchMedia("(max-width: 767px) and (pointer: coarse)").matches,
    dismissed: readDismissed(),
  };
}

/**
 * A one-time nudge, on phones only, to install the app for offline use.
 *
 * Deliberately not a modal. A dialog that traps focus over a clinical page,
 * before the reader has seen anything, is the pattern everyone has learned to
 * dismiss without reading. This is a bottom sheet that can be ignored, and it
 * never returns once dismissed.
 *
 * Three conditions must all hold: a phone, not already installed, and not
 * previously dismissed. `appinstalled` also writes the flag, so installing
 * through the browser's own menu — rather than this button — still stops it.
 */
export function InstallPrompt() {
  const [visible, setVisible] = useState(false);
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    if (!shouldOfferInstall(readEnvironment())) return;

    const onBeforeInstall = (e: Event) => {
      // Suppress Chrome's own mini-infobar so there are not two prompts.
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setVisible(false);
      try {
        localStorage.setItem(DISMISSED_KEY, "1");
      } catch {
        /* nothing to do; the display-mode check will suppress it next time */
      }
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    const timer = window.setTimeout(() => setVisible(true), PROMPT_WAIT_MS);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
      window.clearTimeout(timer);
    };
  }, []);

  const dismiss = useCallback(() => {
    setVisible(false);
    try {
      localStorage.setItem(DISMISSED_KEY, "1");
    } catch {
      /* private mode: the banner may appear once more, which is acceptable */
    }
  }, []);

  const install = useCallback(() => {
    if (!deferred) return;
    void deferred.prompt();
    // Either outcome ends this banner's life: accepted installs the app,
    // dismissed is an answer. Re-asking is what makes these hateful.
    void deferred.userChoice.finally(dismiss);
  }, [deferred, dismiss]);

  if (!visible) return null;

  return (
    <div
      role="region"
      aria-label={p.installPromptAriaLabel}
      className={cn(
        "fixed inset-x-3 bottom-3 z-50 rounded-lg border border-border bg-surface-raised p-4 shadow-md",
        "motion-safe:animate-[installIn_var(--motion-duration-panel)_var(--motion-ease)_both]",
      )}
    >
      <p className="font-display text-[15px] font-medium text-ink-strong">
        {p.installPromptHeading}
      </p>
      <p className="mt-1 text-sm leading-relaxed text-ink-body">{p.installPromptBody}</p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {deferred ? (
          <button
            type="button"
            onClick={install}
            className={cn(
              "inline-flex min-h-11 items-center rounded-md bg-accent px-4 text-sm font-medium text-ink-on-accent",
              "hover:bg-accent-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
            )}
          >
            {p.installPromptAction}
          </button>
        ) : (
          // No `beforeinstallprompt` means no programmatic install — iOS, or a
          // browser that has not met its own install criteria. Send them to the
          // page that already explains how to do it by hand.
          <Link
            href="/install"
            onClick={dismiss}
            className={cn(
              "inline-flex min-h-11 items-center rounded-md bg-accent px-4 text-sm font-medium text-ink-on-accent",
              "hover:bg-accent-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
            )}
          >
            {p.installPromptHow}
          </Link>
        )}
        <button
          type="button"
          onClick={dismiss}
          className={cn(
            "inline-flex min-h-11 items-center rounded-md px-3 text-sm font-medium text-ink-muted",
            "hover:text-ink-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
          )}
        >
          {p.installPromptDismiss}
        </button>
      </div>
    </div>
  );
}
