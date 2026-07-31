import { describe, expect, it } from "vitest";
import {
  BUDGET,
  CHAMBERS,
  DEFAULT_SEED,
  ENVELOPE,
  HEART,
  LOBE_SHARES,
  RUL_TAKEOFF,
  THORAX,
  type Preset,
} from "./anatomy";
import { cardiacField, cardiacHullExtentX, generateHeart } from "./heart";
import { generateTree, LOBES, MAIN_BRONCHI } from "./tree";
import {
  insideLung,
  insidePleura,
  NOTCH_MATCHES_HEART_BORDER,
  PLEURAL_LATERAL_EXTENT,
} from "./envelope";
import { generateShells, sampleShells, shellsAsPointCloud } from "./shells";

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
    shells: generateShells(),
    envelope: shellsAsPointCloud(generateShells()),
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
      //
      // The geometric apex is HEART.apex.x exactly, by construction of the
      // taper. The band is wider than that because this measures a SAMPLED
      // extreme: over 60 seeds at both presets the lowest particle ranged
      // 0.121 to 0.155 in x, since at the narrow budget the cloud does not
      // always reach deep enough for the taper to fully converge. Tightening
      // the band toward the spec value would assert the RNG, not the anatomy.
      expect(apexX).toBeGreaterThanOrEqual(0.115);
      expect(apexX).toBeLessThanOrEqual(0.17);
      expect(minY).toBeGreaterThanOrEqual(-0.475);
      expect(minY).toBeLessThanOrEqual(-0.43);
      expect(minY).toBeLessThan(HEART.baseY);
    });

    it("holds the cardiac silhouette to the documented AP borders", () => {
      // ANALYTIC, not sampled — the borders a radiologist measures off a film.
      //
      // This replaces a mass-fraction assertion that anatomy never made. The
      // documented 2:1 split is about silhouette WIDTH, and asserting it as
      // mass let a 24%-over-wide right border ship: the RA and the border table
      // in ANATOMY.md §3 disagreed, and a [0.45, 0.55] CTR band was loose
      // enough to swallow the difference.
      //
      // Sampling cannot replace this. Across 40 seeds the widest sampled
      // particle ranged 0.205 to 0.239 against a true border of 0.240, so any
      // band loose enough to survive the RNG is too loose to catch the defect
      // that motivated the check.
      const hull = cardiacHullExtentX();
      expect(hull.minX).toBeCloseTo(HEART.rightBorderX, 2);
      expect(hull.maxX).toBeCloseTo(HEART.leftBorderX, 2);
      expect(hull.maxX - hull.minX).toBeCloseTo(HEART.width, 2);
      expect(hull.ctr).toBeCloseTo(HEART.ctr, 2);
    });

    it("tints by chamber laterality, so the right ventricle crosses the midline", () => {
      // The septum is NOT the midline. It runs obliquely from upper-right to
      // lower-left, and the RV — the most anterior chamber, the front of the
      // heart — sits substantially across it. A tint keyed to sign(x) cannot
      // express that: it measured 0 of 30 RV particles at x > 0 reading as
      // right heart. Chamber-membership blending measures 21–45%.
      let rightTinted = 0;
      let crossing = 0;
      for (let i = 0; i < s.heart.count; i++) {
        if (s.heart.tint[i]! >= 0.5) continue;
        rightTinted++;
        if (s.heart.positions[i * 3]! > 0) crossing++;
      }
      expect(crossing / rightTinted).toBeGreaterThanOrEqual(0.1);
    });

    it("keeps the right/left tint continuous rather than seamed", () => {
      // A hard split down the middle reads as two hearts, not one.
      const intermediate = [...s.heart.tint].filter((t) => t > 0.05 && t < 0.95).length;
      expect(intermediate / s.heart.count).toBeGreaterThanOrEqual(0.1);
    });

    it("keeps cardiac mass predominantly to the patient's left", () => {
      // LOOSE, and deliberately so. This measures a DIFFERENT QUANTITY from the
      // silhouette assertion above — sampled mass, not projected width — and
      // anatomy makes no claim about it. Kept only as a sanity check that the
      // heart has not been mirrored. NEVER TUNE GEOMETRY AGAINST THIS NUMBER;
      // doing so is what produced a heart 24% too wide on the right.
      let positive = 0;
      for (let i = 0; i < s.heart.count; i++) {
        if (s.heart.positions[i * 3]! > 0) positive++;
      }
      const fraction = positive / s.heart.count;
      expect(fraction).toBeGreaterThanOrEqual(0.55);
      expect(fraction).toBeLessThanOrEqual(0.72);
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

  describe("lung filling", () => {
    it("fills each lung out to its pleural surface", () => {
      // THE BIGGEST VISUAL DEFECT THIS SCENE EVER SHIPPED. The right lung was
      // filled to 0.613 of its half-width, leaving an empty shell across its
      // entire lateral third — anatomically backwards, since the right lung is
      // the LARGER one, and on screen it read as a chest with one lung missing.
      //
      // The cause was real anatomy faithfully implemented: the right hilum sits
      // at x -0.054 and the left at +0.124, so the right tree must cross 0.313
      // to reach its pleura against the left's 0.228 — and both sides had the
      // same decay, depth and isotropic branching.
      let minX = Infinity;
      let maxX = -Infinity;
      for (let i = 0; i < s.tree.count; i++) {
        const x = s.tree.positions[i * 3]!;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
      }
      // Compared against the ANALYTIC pleural surface, not against whichever
      // envelope particle happened to land furthest out.
      expect(Math.abs(minX) / PLEURAL_LATERAL_EXTENT).toBeGreaterThanOrEqual(0.85);
      expect(maxX / PLEURAL_LATERAL_EXTENT).toBeGreaterThanOrEqual(0.85);
    });

    it("keeps every airway particle inside the pleura", () => {
      // The other half of the fill problem. Steering branches along their
      // lobe's growth axis fixed the hollow lung and then pushed tips 7.6%
      // BEYOND the pleural surface — one defect traded for its mirror image.
      // Reach and containment are separate properties needing separate
      // mechanisms; a single tuned constant just hides whichever the seed hides.
      let outside = 0;
      for (let i = 0; i < s.tree.count; i++) {
        if (
          !insidePleura(
            s.tree.positions[i * 3]!,
            s.tree.positions[i * 3 + 1]!,
            s.tree.positions[i * 3 + 2]!,
          )
        ) {
          outside++;
        }
      }
      expect(outside).toBe(0);
    });

    it("allocates the airway budget per lobe, not per side", () => {
      // Allocating by side fixed R:L and still shipped the RIGHT LOWER LOBE —
      // the largest lobe of the lung — as the thinnest object in the scene, at
      // 13 particles, because within a side the split fell out of branch
      // counts. The lesson from the R:L fix generalises one level down.
      const counts = LOBES.map((_, i) => [...s.tree.lobe].filter((v) => v === i).length);
      const total = counts.reduce((a, b) => a + b, 0);
      LOBES.forEach((lobe, i) => {
        const share = counts[i]! / total;
        const want = LOBE_SHARES[lobe];
        expect(Math.abs(share - want) / want).toBeLessThanOrEqual(0.2);
        expect(share).toBeGreaterThanOrEqual(0.05);
      });
      const rll = counts[LOBES.indexOf("rll")]!;
      expect(rll).toBeGreaterThan(counts[LOBES.indexOf("rml")]!);
      expect(rll).toBeGreaterThan(counts[LOBES.indexOf("rul")]!);
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

    it("puts no pleural surface inside the cardiac hull", () => {
      // TESTED AT FULL PRECISION, off the paths themselves. The lung's
      // mediastinal border and the cardiac border are the same line where the
      // two abut, so surface points sit exactly ON the hull — and a float32
      // round-trip of a point that is exactly on a boundary lands a few times
      // 1e-8 either side of it. Asserting `< 0` against the float32 adapter
      // therefore measured storage precision, not geometry: it reported 18
      // intrusions where the model has none.
      let intruders = 0;
      for (const p of sampleShells(s.shells)) {
        if (cardiacField(p.x, p.y, p.z) < 0) intruders++;
      }
      expect(intruders).toBe(0);
    });

    it("keeps the float32 render buffer within an epsilon of the hull", () => {
      // The adapter is what a renderer would upload. It may not drift further
      // than the rounding that produced it.
      const EPS = 1e-5;
      let beyond = 0;
      for (let i = 0; i < s.envelope.count; i++) {
        const d = cardiacField(
          s.envelope.positions[i * 3]!,
          s.envelope.positions[i * 3 + 1]!,
          s.envelope.positions[i * 3 + 2]!,
        );
        if (d < -EPS) beyond++;
      }
      expect(beyond).toBe(0);
    });

    it("cuts the cardiac notch to exactly the heart's left border", () => {
      // The notch and the cardiac silhouette are the same curve — asserted
      // against the constant rather than a transcribed copy of it.
      expect(NOTCH_MATCHES_HEART_BORDER).toBe(true);
    });

    it("leaves the notch empty of left lung, anteriorly", () => {
      // NARROWED TO THE ANTERIOR HALF, and the narrowing is the point rather
      // than an accommodation. This previously asserted the notch was empty at
      // EVERY depth, which encoded a full-thickness cut through the lung. The
      // heart lies against the FRONT of the left lung; behind it the lung runs
      // medially toward the descending aorta and the spine. Asserting emptiness
      // posteriorly asserts the absence of lung that is really there.
      //
      // Anterior emptiness is still absolute — that is the notch.
      let anteriorIntruders = 0;
      let posteriorPresence = 0;
      for (let i = 0; i < s.envelope.count; i++) {
        if (s.envelope.isRight[i] === 1) continue;
        const x = s.envelope.positions[i * 3]!;
        const y = s.envelope.positions[i * 3 + 1]!;
        const z = s.envelope.positions[i * 3 + 2]!;
        const inBand =
          y <= ENVELOPE.cardiacNotch.topY &&
          y >= ENVELOPE.cardiacNotch.bottomY &&
          x < ENVELOPE.cardiacNotch.medialX - 0.005;
        if (!inBand) continue;
        if (z > ENVELOPE.cardiacNotch.anteriorZ) anteriorIntruders++;
        else posteriorPresence++;
      }
      expect(anteriorIntruders).toBe(0);
      // And the posterior lung must actually be there, or the depth-limited
      // notch would be indistinguishable from the full-thickness one it fixed.
      expect(posteriorPresence).toBeGreaterThan(0);
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
      // The envelope no longer spends particles: its surfaces are six stroked
      // paths, and the ~110 it used to cost went to the airways and the heart,
      // which is where the hollow right lung was.
      // Counts RENDERED ELEMENTS. s.envelope is a point cloud sampled off the
      // paths for assertion purposes only — 1459 vertices describe 6 elements,
      // and charging the budget for vertices would price a curve as if it were
      // still a particle cloud.
      const total = s.heart.count + s.tree.count + s.shells.length;
      expect(total).toBeLessThanOrEqual(s.budget.total);
    });

    it("draws the pleural surfaces as six paths, not a particle cloud", () => {
      // Three nested outlines per lung. The count is asserted because the whole
      // point of the rewrite was replacing 110 DOM nodes with a handful, and a
      // regression that quietly reintroduced per-depth particles would still
      // pass every landmark assertion below.
      expect(s.shells.length).toBe(6);
      expect(s.shells.filter((sh) => sh.lung === "right")).toHaveLength(3);
      expect(s.shells.filter((sh) => sh.lung === "left")).toHaveLength(3);
    });

    it("nests the shells, so depth reads without motion", () => {
      // The cross-section narrows with |z|, so the anterior and posterior
      // outlines must sit strictly inside the mid one. If they did not, the
      // three would overdraw as a single thick line and the volume would be
      // carried entirely by the sway.
      for (const lung of ["right", "left"] as const) {
        const width = (z: number) => {
          const sh = s.shells.find((h) => h.lung === lung && h.z === z)!;
          const xs = sh.segments.flatMap((g) => g.points.map((p) => p.x));
          return Math.max(...xs) - Math.min(...xs);
        };
        expect(width(0)).toBeGreaterThan(width(0.14));
        expect(width(0)).toBeGreaterThan(width(-0.14));
      }
    });

    /** Points on one lung's mid-depth outline. */
    const outline = (lung: "right" | "left") =>
      s.shells
        .filter((h) => h.lung === lung && h.z === 0)
        .flatMap((h) => h.segments.flatMap((g) => g.points));

    it("keeps both costophrenic angles sharp", () => {
      // ANATOMY.md §7 requires this and it had NO ASSERTION, while
      // ENVELOPE.costophrenicAngleDeg sat unreferenced by any code — a
      // documented landmark with neither an implementation nor a test. What
      // shipped was 112 degrees on the right and 133 on the left. A blunted
      // costophrenic angle on a pediatric film is the cardinal sign of a
      // pleural effusion, so this is not a cosmetic tolerance.
      //
      // The angle is between a vertical chest wall and the diaphragm, so it is
      // measured as 90 degrees minus the diaphragm's rise going medially from
      // the lowest point of the lung.
      //
      // Measured off the PREDICATE, not off the drawn outline. The outline has
      // 150 rows over a 1.0-unit lung, so its vertical quantum is 0.0067 and a
      // two-row rise over a 0.02 baseline reads as 56 degrees no matter what
      // the surface does — the first version of this assertion measured its own
      // sampling step and failed on geometry that is correct.
      const floorAt = (x: number) => {
        for (let i = 0; i <= 2400; i++) {
          const y = -0.78 + i * 0.0005;
          if (insideLung(x, y, 0)) return y;
        }
        return NaN;
      };
      for (const lung of ["right", "left"] as const) {
        const sign = lung === "right" ? -1 : 1;
        let low = { x: 0, y: Infinity };
        for (let i = 0; i <= 1200; i++) {
          const x = sign * (0.02 + (i / 1200) * 0.36);
          const y = floorAt(x);
          if (Number.isFinite(y) && y < low.y) low = { x, y };
        }
        const rise = floorAt(low.x - sign * 0.02) - low.y;
        const angle = 90 - (Math.atan2(rise, 0.02) * 180) / Math.PI;
        expect(angle, `${lung} costophrenic angle`).toBeLessThan(45);
        expect(angle).toBeGreaterThan(0);
      }
    });

    it("sits the right costophrenic angle higher than the left", () => {
      // The liver raises the WHOLE right hemidiaphragm, the angle with it.
      //
      // Amendment C claimed this was delivered. It was not: the two angles came
      // out 0.0007 apart against a specified 0.015, because the diaphragm's
      // lateral term was normalised by half the lung's width, so it ran 0 to 2
      // and the shell — not the diaphragm — ended up forming the base. The
      // amendment was written from the constants rather than from the geometry,
      // which is precisely what an assertion is for.
      const lowest = (lung: "right" | "left") =>
        outline(lung).reduce((a, p) => (p.y < a.y ? p : a)).y;
      const specified = Math.abs(THORAX.rightCostophrenicY - THORAX.leftCostophrenicY);
      const delivered = lowest("right") - lowest("left");
      expect(delivered).toBeGreaterThan(0);
      expect(delivered).toBeGreaterThan(specified * 0.5);
      expect(delivered).toBeLessThan(specified * 2);
    });

    it("tapers the lung apex into a dome", () => {
      // The split wall exponent exists for this. A single exponent high enough
      // to give the vertical lower wall a costophrenic angle needs also flattens
      // the apex: measured, the lung at y +0.30 was 94% as wide as at y -0.30,
      // a column rather than a chest.
      //
      // Measured on the LATERAL border only — the notch cuts the left medial
      // border, so a full-width measure would report the notch, not the apex.
      for (const lung of ["right", "left"] as const) {
        const pts = outline(lung);
        const lateralAt = (y: number) => {
          const band = pts.filter((p) => Math.abs(p.y - y) < 0.03);
          return band.length ? Math.max(...band.map((p) => Math.abs(p.x))) : 0;
        };
        expect(lateralAt(0.3) / lateralAt(-0.3), `${lung} apical taper`).toBeLessThan(0.85);
      }
    });

    it("runs the medial border along the cardiac silhouette", () => {
      // Where the heart is present the lung's medial border IS the heart's
      // border; they are the same curve, which is the claim ANATOMY.md makes
      // for the notch and the reason the shell is worth drawing at all.
      //
      // A row through the heart is discontinuous — lung laterally, cardiac
      // shadow, then a thin strip medial to the heart where the chamber
      // ellipsoids fall short of the mediastinum. Taking the row's min and max
      // drew the outline straight through the cardiac shadow: medial border
      // -0.021 against a heart border of -0.115.
      const pts = outline("right");
      for (const y of [-0.1, -0.2]) {
        const band = pts.filter((p) => Math.abs(p.y - y) < 0.012);
        if (!band.length) continue;
        const medial = Math.max(...band.map((p) => p.x));
        let heartBorder = Infinity;
        for (let i = 0; i <= 600; i++) {
          const x = -0.2 + (i / 600) * 0.3;
          if (cardiacField(x, y, 0) <= 0) {
            heartBorder = x;
            break;
          }
        }
        expect(Math.abs(medial - heartBorder), `right medial border at y=${y}`).toBeLessThan(0.02);
      }
    });

    it("closes every shell contour", () => {
      // A shell is a closed surface. The lateral and medial chains meet at the
      // apex, and leaving them unjoined drew every lung with an open top —
      // 0.054 to 0.085 wide, indistinguishable from a fissure to anything
      // reading the stroke, including a viewer.
      for (const shell of s.shells) {
        const first = shell.segments[0]!.points[0]!;
        const lastSeg = shell.segments[shell.segments.length - 1]!;
        const last = lastSeg.points[lastSeg.points.length - 1]!;
        expect(Math.hypot(first.x - last.x, first.y - last.y)).toBeLessThanOrEqual(
          ENVELOPE.fissureGap,
        );
      }
    });

    it("resolves three lobes on the right and two on the left, as stroke gaps", () => {
      // The horizontal fissure exists only on the right. Two fissures break the
      // right outline more times than one breaks the left — which is what makes
      // the lobes visible without drawing a line where there is no edge.
      const segs = (lung: "right" | "left") =>
        s.shells.filter((h) => h.lung === lung).map((h) => h.segments.length);
      expect(Math.min(...segs("right"))).toBeGreaterThan(Math.max(...segs("left")) - 2);
      expect(Math.max(...segs("right"))).toBeGreaterThan(Math.min(...segs("left")));
    });

    it("opens the cardiac notch anteriorly and closes it behind the heart", () => {
      // The heart lies against the FRONT of the left lung. A full-thickness
      // notch deletes posterior lung that really exists, and discards the one
      // fact the notch is there to convey. The medial border inside the notch
      // band must therefore sit at the heart's left border on anterior shells
      // and at the mediastinum on the posterior one.
      const medialAt = (z: number) => {
        const sh = s.shells.find((h) => h.lung === "left" && h.z === z)!;
        const band = sh.segments
          .flatMap((g) => g.points)
          .filter((p) => p.y <= ENVELOPE.cardiacNotch.topY && p.y >= ENVELOPE.cardiacNotch.bottomY);
        return Math.min(...band.map((p) => p.x));
      };
      expect(medialAt(0.14)).toBeGreaterThanOrEqual(ENVELOPE.cardiacNotch.medialX - 0.005);
      expect(medialAt(-0.14)).toBeLessThan(ENVELOPE.cardiacNotch.medialX - 0.05);
    });

    it("respects the airway / heart split", () => {
      expect(s.heart.count).toBeLessThanOrEqual(s.budget.heart);
      expect(s.tree.count).toBeLessThanOrEqual(s.budget.airways);
      expect(s.budget.envelope).toBe(0);
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
  /**
   * Every generator. shells.ts was omitted from this list when it was added,
   * and immediately drifted — it carried its own copy of the lung half-width.
   */
  const GENERATORS = ["tree.ts", "heart.ts", "envelope.ts", "shells.ts"];

  const read = async (f: string) => {
    const { readFileSync } = await import("node:fs");
    const { fileURLToPath } = await import("node:url");
    return readFileSync(fileURLToPath(new URL(f, import.meta.url)), "utf8");
  };

  it("keeps every geometry number in anatomy.ts", async () => {
    // THIS TEST USED TO CHECK ONLY FOR COLOURS while claiming, in its own name
    // and its own comment, to guard geometry numbers. It passed over nineteen
    // bare decimals across four files — including 0.175 written out separately
    // in envelope.ts and shells.ts, two copies of the lung's half-width free to
    // drift apart. A guard that cannot fail is worse than none, because it gets
    // read as evidence that the thing it names was checked.
    //
    // Comments and string literals are stripped first: prose citing a measured
    // value is documentation, not a bypass.
    const ALLOWED = new Set(["0.5", "1.5", "2.0"]);
    for (const f of GENERATORS) {
      const src = (await read(f))
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .replace(/\/\/.*$/gm, "")
        .replace(/"[^"]*"|'[^']*'|`[^`]*`/g, '""');
      const bare = [
        ...new Set([...src.matchAll(/(?<![\w.])(\d+\.\d+)(?![\w])/g)].map((m) => m[1]!)),
      ].filter((v) => !ALLOWED.has(v));
      expect(bare, `${f} carries bare geometry numbers; move them to anatomy.ts`).toEqual([]);
    }
  });

  it("keeps colour out of the geometry layer", async () => {
    for (const f of GENERATORS) {
      const src = await read(f);
      expect(src, `${f} must not carry a hex colour`).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
      expect(src, `${f} must not carry an rgb()/hsl() literal`).not.toMatch(/\b(rgba?|hsla?)\(/);
    }
  });
});
