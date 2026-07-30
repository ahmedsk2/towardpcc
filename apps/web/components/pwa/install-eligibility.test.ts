import { describe, expect, it } from "vitest";
import { shouldOfferInstall, type InstallEnvironment } from "./install-eligibility";

/** A phone, not installed, never dismissed — the one case that should offer. */
const eligible: InstallEnvironment = {
  standalone: false,
  iosStandalone: false,
  phone: true,
  dismissed: false,
};

describe("shouldOfferInstall", () => {
  it("offers on a phone that has not installed or dismissed", () => {
    expect(shouldOfferInstall(eligible)).toBe(true);
  });

  it("stays silent when already running as an installed app", () => {
    expect(shouldOfferInstall({ ...eligible, standalone: true })).toBe(false);
  });

  it("stays silent on an installed iOS home-screen app", () => {
    // iOS Safari never set display-mode, so without this flag the banner would
    // appear inside the installed app — the one place it is clearly broken.
    expect(shouldOfferInstall({ ...eligible, iosStandalone: true })).toBe(false);
  });

  it("stays silent on anything that is not a phone", () => {
    // The founder asked for phones specifically. A desktop cannot "add to home
    // screen" in the sense the copy describes.
    expect(shouldOfferInstall({ ...eligible, phone: false })).toBe(false);
  });

  it("stays silent once dismissed", () => {
    expect(shouldOfferInstall({ ...eligible, dismissed: true })).toBe(false);
  });

  it("stays silent when installed even if not dismissed and on a phone", () => {
    // Guards against a future refactor reordering the checks so that an
    // un-dismissed phone short-circuits to true before the installed test runs.
    expect(shouldOfferInstall({ ...eligible, standalone: true, dismissed: false })).toBe(false);
  });

  it("requires every condition — no single flag can carry it", () => {
    const flags = ["standalone", "iosStandalone", "dismissed"] as const;
    for (const flag of flags) {
      expect(shouldOfferInstall({ ...eligible, [flag]: true })).toBe(false);
    }
    expect(shouldOfferInstall({ ...eligible, phone: false })).toBe(false);
    // And the positive control, so this test cannot pass vacuously by having
    // built an environment that was never eligible in the first place.
    expect(shouldOfferInstall(eligible)).toBe(true);
  });
});
