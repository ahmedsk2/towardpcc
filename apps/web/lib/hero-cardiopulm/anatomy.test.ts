import { describe, expect, it } from "vitest";
import {
  BUDGET,
  CHAMBERS,
  DEFAULT_SEED,
  ENVELOPE,
  HEART,
  RUL_TAKEOFF,
  THORAX,
  type Preset,
} from "./anatomy";
import { cardiacField, generateHeart } from "./heart";
import { generateTree, LOBES, MAIN_BRONCHI } from "./tree";
import { generateEnvelope, NOTCH_MATCHES_HEART_BORDER } from "./envelope";

/**
 * The anatomical assertion suite — ANATOMY.md §7, verbatim.
 *
 * Contrast is asserted rather than eyeballed on this platform; anatomy gets the
 * same treatment. A pediatric intensivist is the primary viewer, and a wrong
 * relationship is exactly the kind of thing this site refuses to ship.
 *
 * These test typed arrays, not pixels, so they are render-target agnostic:
 * they survived the switch from the brief's Canvas 2D to CSS 3D without an
 * edit, and they must pass at EVERY degradation tier. A cheaper scene is still
 * a correct one.
 */
const PRESETS: Preset[] = ["desktop", "narrow"];

const scene = (preset: Preset) => {
  const b = BUDGET[preset];
  return {
    heart: generateHeart(b.heart, DEFAULT_SEED),
    tree: generateTree(b.airways, b.generations, DEFAULT_SEED),
    envelope: generateEnvelope(b.envelope, DEFAULT_SEED),
    budget: b,
  };
};

describe.each(PRESETS)("anatomical assertions — %s", (preset) => {
  const s = scene(preset);

  describe("cardiac position", () => {
    it("orders the chambers RV anterior → LA posterior", () => {
      const z = Object.fromEntries(CHAMBERS.map((c) => [c.id, c.centroid.z]));
      // The ordering that makes bronchi pass behind the RV and above the LA.
      expect(z.rv).toBeGreaterThan(z.ra!);
      expect(z.ra).toBeGreaterThan(z.lv!);
      expect(z.lv).toBeGreaterThan(z.la!);
      expect(Math.min(...CHAMBERS.map((c) => c.centroid.z))).toBe(z.la);
      expect(Math.max(...CHAMBERS.map((c) => c.centroid.z))).toBe(z.rv);
    });

    it("puts the left-atrial roof immediately beneath the carina", () => {
      // Close enough that LA enlargement splays the carinal angle — the classic
      // sign of a large left-to-right shunt.
      const la = CHAMBERS.find((c) => c.id === "la")!;
      expect(la.centroid.y + la.radii.y).toBeGreaterThanOrEqual(-0.01);
    });

    it("places no chamber centroid above the carina", () => {
      for (const c of CHAMBERS) expect(c.centroid.y).toBeLessThan(0);
    });

    it("makes the apex the inferior-most cardiac particle, to the patient's left", () => {
      let minY = Infinity;
      let apexX = 0;
      for (let i = 0; i < s.heart.count; i++) {
        const y = s.heart.positions[i * 3 + 1]!;
        if (y < minY) {
          minY = y;
          apexX = s.heart.positions[i * 3]!;
        }
      }
      // +x is the viewer's right = the patient's LEFT. This is correct.
      expect(apexX).toBeGreaterThan(0);
      expect(minY).toBeLessThan(HEART.baseY);
    });

    it("puts two thirds of cardiac mass to the patient's left", () => {
      let positive = 0;
      for (let i = 0; i < s.heart.count; i++) {
        if (s.heart.positions[i * 3]! > 0) positive++;
      }
      const fraction = positive / s.heart.count;
      expect(fraction).toBeGreaterThanOrEqual(0.6);
      expect(fraction).toBeLessThanOrEqual(0.72);
    });

    it("holds the cardiothoracic ratio in the normal childhood range", () => {
      // Computed from the orthographic AP silhouette, as a clinician reads it
      // off a film: max cardiac transverse width ÷ max thoracic width.
      let minX = Infinity;
      let maxX = -Infinity;
      for (let i = 0; i < s.heart.count; i++) {
        const x = s.heart.positions[i * 3]!;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
      }
      const ctr = (maxX - minX) / THORAX.maxTransverseWidth;
      expect(ctr).toBeGreaterThanOrEqual(0.45);
      expect(ctr).toBeLessThanOrEqual(0.55);
    });
  });

  describe("airways", () => {
    it("keeps the right main bronchus more vertical than the left", () => {
      expect(MAIN_BRONCHI.right.angleDeg).toBeLessThan(MAIN_BRONCHI.left.angleDeg);
    });

    it("keeps the right main bronchus shorter than the left", () => {
      expect(MAIN_BRONCHI.right.length).toBeLessThan(MAIN_BRONCHI.left.length);
    });

    it("holds the subcarinal angle in the pediatric range", () => {
      expect(MAIN_BRONCHI.subcarinalAngleDeg).toBeGreaterThanOrEqual(65);
      expect(MAIN_BRONCHI.subcarinalAngleDeg).toBeLessThanOrEqual(80);
    });

    it("takes the right upper lobe bronchus off in the proximal half", () => {
      // Its early takeoff is the most recognisable feature of the right airway.
      expect(RUL_TAKEOFF.alongRightMain).toBeGreaterThan(0);
      expect(RUL_TAKEOFF.alongRightMain).toBeLessThanOrEqual(0.5);
    });

    it("sends the right upper lobe superolaterally, not into the mediastinum", () => {
      // Aimed downward it drives through the heart and is culled entirely.
      let topY = -Infinity;
      let mostLateralX = Infinity;
      for (let i = 0; i < s.tree.count; i++) {
        if (LOBES[s.tree.lobe[i]!] !== "rul") continue;
        const x = s.tree.positions[i * 3]!;
        const y = s.tree.positions[i * 3 + 1]!;
        if (y > topY) topY = y;
        if (x < mostLateralX) mostLateralX = x;
      }
      expect(topY).toBeGreaterThan(0); // above the carina
      expect(mostLateralX).toBeLessThan(0); // the patient's right
    });

    it("gives the right lung more particles than the left, by 10–25%", () => {
      let right = 0;
      let left = 0;
      for (let i = 0; i < s.tree.count; i++) {
        if (LOBES[s.tree.lobe[i]!]!.startsWith("r")) right++;
        else left++;
      }
      const ratio = right / left;
      expect(ratio).toBeGreaterThanOrEqual(1.1);
      expect(ratio).toBeLessThanOrEqual(1.25);
    });

    it("resolves three lobar groups on the right and two on the left", () => {
      const present = new Set<string>();
      for (let i = 0; i < s.tree.count; i++) present.add(LOBES[s.tree.lobe[i]!]!);
      expect([...present].filter((l) => l.startsWith("r"))).toHaveLength(3);
      expect([...present].filter((l) => l.startsWith("l"))).toHaveLength(2);
    });
  });

  describe("spatial integrity", () => {
    it("puts no airway particle inside the cardiac hull", () => {
      // The heart sits in a real cavity, not inside a thicket.
      let inside = 0;
      for (let i = 0; i < s.tree.count; i++) {
        if (
          cardiacField(
            s.tree.positions[i * 3]!,
            s.tree.positions[i * 3 + 1]!,
            s.tree.positions[i * 3 + 2]!,
          ) < 0
        ) {
          inside++;
        }
      }
      expect(inside).toBe(0);
    });

    it("puts no envelope particle inside the cardiac hull", () => {
      let inside = 0;
      for (let i = 0; i < s.envelope.count; i++) {
        if (
          cardiacField(
            s.envelope.positions[i * 3]!,
            s.envelope.positions[i * 3 + 1]!,
            s.envelope.positions[i * 3 + 2]!,
          ) < 0
        ) {
          inside++;
        }
      }
      expect(inside).toBe(0);
    });

    it("cuts the cardiac notch to exactly the heart's left border", () => {
      // The notch and the cardiac silhouette are the same curve — asserted
      // against the constant rather than a transcribed copy of it.
      expect(NOTCH_MATCHES_HEART_BORDER).toBe(true);
    });

    it("leaves the notch empty of left-lung particles", () => {
      let intruders = 0;
      for (let i = 0; i < s.envelope.count; i++) {
        if (s.envelope.isRight[i] === 1) continue;
        const x = s.envelope.positions[i * 3]!;
        const y = s.envelope.positions[i * 3 + 1]!;
        if (
          y <= ENVELOPE.cardiacNotch.topY &&
          y >= ENVELOPE.cardiacNotch.bottomY &&
          x <= ENVELOPE.cardiacNotch.medialX
        ) {
          intruders++;
        }
      }
      expect(intruders).toBe(0);
    });

    it("gives the right lung no equivalent notch", () => {
      // The asymmetry between the two medial borders is much of what makes
      // this read as a real chest rather than a symmetric ornament.
      const band = (lo: number, hi: number, right: boolean) => {
        let extreme = right ? -Infinity : Infinity;
        for (let i = 0; i < s.envelope.count; i++) {
          if ((s.envelope.isRight[i] === 1) !== right) continue;
          const y = s.envelope.positions[i * 3 + 1]!;
          if (y > hi || y < lo) continue;
          const x = s.envelope.positions[i * 3]!;
          extreme = right ? Math.max(extreme, x) : Math.min(extreme, x);
        }
        return extreme;
      };
      const notchLo = ENVELOPE.cardiacNotch.bottomY;
      const notchHi = ENVELOPE.cardiacNotch.topY;
      const rightMedial = Math.abs(band(notchLo, notchHi, true));
      const leftMedial = Math.abs(band(notchLo, notchHi, false));
      // The left medial border is pushed laterally by the notch; the right is not.
      expect(leftMedial).toBeGreaterThan(rightMedial);
    });

    it("carries the lung apices well above the carina", () => {
      let top = -Infinity;
      for (let i = 0; i < s.envelope.count; i++) {
        top = Math.max(top, s.envelope.positions[i * 3 + 1]!);
      }
      expect(top).toBeGreaterThanOrEqual(0.3);
    });

    it("sits the right hemidiaphragm dome higher than the left", () => {
      // The liver raises it. Measured at the DOME, which is medial — not at the
      // lowest particle overall, which is the costophrenic angle. ANATOMY.md
      // gives one costophrenic value for both sides and differing values only
      // for the domes, so comparing the lowest point compares the wrong
      // landmark and fails on geometry that is in fact correct.
      expect(THORAX.rightDiaphragmY).toBeGreaterThan(THORAX.leftDiaphragmY);

      const domeFloor = (right: boolean) => {
        let y = Infinity;
        for (let i = 0; i < s.envelope.count; i++) {
          if ((s.envelope.isRight[i] === 1) !== right) continue;
          const x = s.envelope.positions[i * 3]!;
          // Medial third of that lung, where the dome sits.
          if (Math.abs(x) > 0.14) continue;
          y = Math.min(y, s.envelope.positions[i * 3 + 1]!);
        }
        return y;
      };
      expect(domeFloor(true)).toBeGreaterThan(domeFloor(false));
    });
  });

  describe("budget", () => {
    it("lands within the preset's total", () => {
      const total = s.heart.count + s.tree.count + s.envelope.count;
      expect(total).toBeLessThanOrEqual(s.budget.total);
    });

    it("respects the airway / heart / envelope split", () => {
      expect(s.heart.count).toBeLessThanOrEqual(s.budget.heart);
      expect(s.tree.count).toBeLessThanOrEqual(s.budget.airways);
      expect(s.envelope.count).toBeLessThanOrEqual(s.budget.envelope);
    });

    it("keeps the heart's density — it is the separation from the airways", () => {
      // Cutting the heart first defeats the design: that density IS how it
      // reads as distinct from the branch dust around it.
      expect(s.heart.count / s.budget.heart).toBeGreaterThan(0.9);
    });
  });

  describe("determinism", () => {
    it("produces byte-identical geometry from the same seed", () => {
      const again = scene(preset);
      const hash = (a: Float32Array) => {
        let h = 2166136261;
        for (let i = 0; i < a.length; i++) {
          h ^= Math.round(a[i]! * 1e6);
          h = Math.imul(h, 16777619);
        }
        return h >>> 0;
      };
      expect(hash(again.heart.positions)).toBe(hash(s.heart.positions));
      expect(hash(again.tree.positions)).toBe(hash(s.tree.positions));
      expect(hash(again.envelope.positions)).toBe(hash(s.envelope.positions));
    });
  });
});

describe("source hygiene", () => {
  it("keeps every geometry number in anatomy.ts", async () => {
    // A bare coordinate literal in tree/heart/envelope bypasses this file's
    // tests, which is why the brief calls it review-blocking.
    const { readFileSync } = await import("node:fs");
    const { fileURLToPath } = await import("node:url");
    for (const f of ["tree.ts", "heart.ts", "envelope.ts"]) {
      const src = readFileSync(fileURLToPath(new URL(f, import.meta.url)), "utf8");
      expect(src, `${f} must not carry a hex colour`).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
      expect(src, `${f} must not carry an rgb()/hsl() literal`).not.toMatch(/\b(rgba?|hsla?)\(/);
    }
  });
});
