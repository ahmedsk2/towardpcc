import { describe, expect, it } from "vitest";

import { BUDGET, ENVELOPE, RHYTHM } from "./anatomy";
import { buildScene, REDUCED_MOTION_POSE, SCENE, sx, sy } from "./scene";

/**
 * The projection layer, tested separately from the anatomy.
 *
 * anatomy.test.ts pins the geometry in anatomy units and is deliberately
 * render-target agnostic — it survived the switch from Canvas to CSS 3D without
 * an edit. This file pins the step AFTER that: the mapping into the scene's
 * pixel space and the grouping the renderer depends on. A defect here cannot be
 * caught there, because there the numbers are all still correct.
 */
describe("scene projection", () => {
  const scene = buildScene();

  it("keeps every particle inside the frame", () => {
    // The box is sized to the chest, so anything outside it is a projection
    // error rather than a margin choice.
    for (const g of scene.groups) {
      for (const p of g.particles) {
        expect(p.x).toBeGreaterThanOrEqual(0);
        expect(p.x).toBeLessThanOrEqual(SCENE.width);
        expect(p.y).toBeGreaterThanOrEqual(0);
        expect(p.y).toBeLessThanOrEqual(SCENE.height);
      }
    }
  });

  it("puts the carina at the origin and keeps the axes the right way up", () => {
    // +x is the viewer's RIGHT = the patient's LEFT, and screen y grows
    // DOWNWARD while anatomy y grows upward. A sign error here mirrors or
    // inverts the whole chest while every anatomy assertion still passes.
    expect(sx(0)).toBe(SCENE.originX);
    expect(sy(0)).toBe(SCENE.originY);
    expect(sx(0.2)).toBeGreaterThan(sx(-0.2));
    expect(sy(0.2)).toBeLessThan(sy(-0.2));
  });

  it("groups by chamber and cluster, not by particle", () => {
    // The whole performance argument rests on this: per-frame cost scales with
    // the number of elements whose style changes. Four chambers plus one group
    // per alveolar cluster is ~60 elements; a group per particle would be 544.
    const kinds = new Map<string, number>();
    for (const g of scene.groups) kinds.set(g.kind, (kinds.get(g.kind) ?? 0) + 1);
    expect(kinds.get("chamber")).toBe(4);
    expect(kinds.get("cluster")).toBeGreaterThan(20);
    expect(kinds.get("dust")).toBe(5);
    expect(scene.counts.groups).toBeLessThan(100);
    expect(scene.counts.groups).toBeLessThan(scene.counts.particles / 5);
  });

  it("stays within the rendered-element budget", () => {
    // Particles plus stroked shells, against the preset total. The shells are
    // rendered elements too and are charged for.
    expect(scene.counts.particles + scene.counts.shells).toBeLessThanOrEqual(BUDGET.desktop.total);
    expect(scene.counts.shells).toBe(6);
  });

  it("marks only the ventricles as taking the volumetric change", () => {
    // The heart perfuses; it does not squeeze. Atria hold still.
    const ventricles = scene.groups.filter((g) => g.kind === "chamber" && g.key === 1);
    expect(ventricles).toHaveLength(2);
  });

  it("gives every group an origin inside the frame", () => {
    // Groups scale about their own centroid via transform-origin. An origin
    // outside the box would swing the group across the scene as it scales.
    for (const g of scene.groups) {
      expect(g.ox).toBeGreaterThanOrEqual(0);
      expect(g.ox).toBeLessThanOrEqual(SCENE.width);
      expect(g.oy).toBeGreaterThanOrEqual(0);
      expect(g.oy).toBeLessThanOrEqual(SCENE.height);
    }
  });

  it("emits a closed fill path and a gapped stroke path per shell", () => {
    for (const s of scene.shells) {
      expect(s.fillD.startsWith("M")).toBe(true);
      expect(s.fillD.endsWith("Z")).toBe(true);
      // The stroke is broken at the fissures; the fill must not be, or the
      // gaps shade as if they were lobes of their own.
      expect(s.d.split("M").length).toBeGreaterThan(2);
      expect(s.fillD.split("M")).toHaveLength(2);
    }
  });

  it("simplifies the shell paths without losing the silhouette", () => {
    // The marcher walks 150 rows per lung for accuracy; the SVG needs far fewer
    // to look identical. Shipping them all cost 19 KB of path data in the HTML.
    const chars = scene.shells.reduce((a, s) => a + s.d.length + s.fillD.length, 0);
    expect(chars).toBeLessThan(9000);
  });
});

describe("reduced-motion pose", () => {
  it("holds a composed pose rather than a flat or zeroed one", () => {
    // Not frame zero and not a flat elevation: a reader who never sees this
    // move should still see lungs that are full and a heart that is perfused.
    expect(REDUCED_MOTION_POSE.breath).toBeGreaterThan(0.5);
    expect(REDUCED_MOTION_POSE.breath).toBeLessThanOrEqual(1);
    expect(REDUCED_MOTION_POSE.wave).toBeGreaterThan(0);
    expect(REDUCED_MOTION_POSE.swayDeg).not.toBe(0);
  });

  it("keeps the still pose within the volumetric cap", () => {
    // The cap exists because a visibly contracting heart reads grotesque. A
    // still frame is exactly where an over-scaled pose would be most obvious.
    expect(REDUCED_MOTION_POSE.beatScale).toBeGreaterThan(1);
    expect(REDUCED_MOTION_POSE.beatScale).toBeLessThanOrEqual(1 + RHYTHM.maxVolumetricChange);
  });

  it("sways less than the moving scene's amplitude", () => {
    expect(Math.abs(REDUCED_MOTION_POSE.swayDeg)).toBeLessThan(RHYTHM.swayDeg);
  });
});

describe("shell depths", () => {
  it("draws one shell per lung per depth, mid-depth included", () => {
    const scene = buildScene();
    expect(ENVELOPE.shellDepths).toContain(0);
    expect(scene.shells.filter((s) => s.z === 0)).toHaveLength(2);
    expect(scene.shells).toHaveLength(ENVELOPE.shellDepths.length * 2);
  });
});
