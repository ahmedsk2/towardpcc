import { describe, expect, it } from "vitest";

import { RHYTHM } from "./anatomy";
import { buildMesh } from "./mesh";
import { buildScene, REDUCED_MOTION_POSE, SCENE, sx, sy } from "./scene";

/**
 * The projection layer, tested separately from the anatomy.
 *
 * anatomy.test.ts pins the geometry in anatomy units and is deliberately
 * render-target agnostic. This file pins the step AFTER that: the mesh's
 * connectivity and the projection into scene space. A defect here cannot be
 * caught there, because there every number is still correct.
 */
describe("mesh", () => {
  const mesh = buildMesh();

  it("draws the airway from its own connectivity, not by proximity", () => {
    // A bronchial tree is a graph and the segments are known at generation
    // time. Nearest-neighbour meshing would join a distal twig of the right
    // lower lobe to one of the middle lobe that never shared a bronchus.
    const airway = mesh.edges.filter((e) => e.kind === "airway");
    expect(airway.length).toBeGreaterThan(400);
    // Every airway edge must be a real segment: both ends are tree nodes.
    for (const e of airway) {
      expect(mesh.points[e.a]!.kind).toBe("airway");
      expect(mesh.points[e.b]!.kind).toBe("airway");
    }
  });

  it("keeps the airway one connected tree", () => {
    // Shared endpoints are deduplicated on a grid so a parent's tip and its
    // children's roots are one node. Without that the tree falls into
    // disjoint sticks that happen to line up.
    const airwayNodes = new Set<number>();
    const adjacency = new Map<number, number[]>();
    for (const e of mesh.edges) {
      if (e.kind !== "airway") continue;
      airwayNodes.add(e.a);
      airwayNodes.add(e.b);
      (adjacency.get(e.a) ?? adjacency.set(e.a, []).get(e.a)!).push(e.b);
      (adjacency.get(e.b) ?? adjacency.set(e.b, []).get(e.b)!).push(e.a);
    }
    const start = airwayNodes.values().next().value as number;
    const seen = new Set<number>([start]);
    const queue = [start];
    while (queue.length) {
      for (const n of adjacency.get(queue.pop()!) ?? []) {
        if (seen.has(n)) continue;
        seen.add(n);
        queue.push(n);
      }
    }
    // One component holding essentially the whole tree.
    expect(seen.size / airwayNodes.size).toBeGreaterThan(0.95);
  });

  it("never bridges the mediastinum", () => {
    // An edge joining the two lungs draws a surface across a gap.
    for (const e of mesh.edges) {
      if (e.kind !== "pleura") continue;
      const a = mesh.points[e.a]!;
      const b = mesh.points[e.b]!;
      expect(Math.sign(a.x) === Math.sign(b.x) || Math.abs(a.x - b.x) < 0.1).toBe(true);
    }
  });

  it("meshes the heart densely enough to read as a surface", () => {
    const heart = mesh.edges.filter((e) => e.kind === "heart");
    const nodes = mesh.points.filter((p) => p.kind === "heart").length;
    expect(heart.length).toBeGreaterThan(nodes);
  });
});

describe("scene projection", () => {
  const scene = buildScene();

  it("keeps every drawn coordinate inside the frame", () => {
    const numbers = scene.paths
      .flatMap((p) => p.d.split(/[ML]/).slice(1))
      .flatMap((pair) => pair.trim().split(" ").map(Number));
    expect(numbers.length).toBeGreaterThan(100);
    for (const n of numbers) {
      expect(Number.isFinite(n)).toBe(true);
      expect(n).toBeGreaterThan(-SCENE.width);
      expect(n).toBeLessThan(SCENE.width * 2);
    }
  });

  it("puts the carina at the origin and keeps the axes the right way up", () => {
    // +x is the viewer's RIGHT = the patient's LEFT, and screen y grows
    // DOWNWARD while anatomy y grows upward. A sign error mirrors or inverts
    // the whole chest while every anatomy assertion still passes.
    expect(sx(0)).toBe(SCENE.originX);
    expect(sy(0)).toBe(SCENE.originY);
    expect(sx(0.2)).toBeGreaterThan(sx(-0.2));
    expect(sy(0.2)).toBeLessThan(sy(-0.2));
  });

  it("collapses thousands of edges into a handful of elements", () => {
    // The whole rendering argument: 3,000 edges as individual lines would be
    // six times the element budget for a figure that never changes shape.
    expect(scene.counts.edges).toBeGreaterThan(1500);
    expect(scene.paths.length).toBeLessThanOrEqual(15);
    expect(scene.counts.elements).toBeLessThan(600);
  });

  it("shades the depth bands monotonically", () => {
    // Depth is carried by brightness alone, so the bands must be ordered. If
    // they were not, near structure would recede behind far structure.
    for (const kind of ["airway", "heart", "pleura"] as const) {
      const bands = scene.paths.filter((p) => p.kind === kind).sort((a, b) => a.band - b.band);
      for (let i = 1; i < bands.length; i++) {
        expect(bands[i]!.opacity).toBeGreaterThan(bands[i - 1]!.opacity);
        expect(bands[i]!.width).toBeGreaterThan(bands[i - 1]!.width);
      }
    }
  });

  it("keeps the pleura quieter than the airway it contains", () => {
    // The pleura is the room, not the subject. Drawn any heavier it becomes an
    // outline, and an outline around a mesh reads as a box.
    const brightest = (kind: string) =>
      Math.max(...scene.paths.filter((p) => p.kind === kind).map((p) => p.opacity));
    expect(brightest("pleura")).toBeLessThan(brightest("airway"));
    expect(brightest("airway")).toBeLessThan(brightest("heart"));
  });
});

describe("reduced-motion pose", () => {
  it("holds a composed pose rather than a flat or zeroed one", () => {
    expect(REDUCED_MOTION_POSE.breath).toBeGreaterThan(0.5);
    expect(REDUCED_MOTION_POSE.breath).toBeLessThanOrEqual(1);
    expect(REDUCED_MOTION_POSE.wave).toBeGreaterThan(0);
    expect(REDUCED_MOTION_POSE.swayDeg).not.toBe(0);
  });

  it("keeps the still pose within the volumetric cap", () => {
    // The cap exists because a visibly contracting heart reads grotesque, and a
    // still frame is where an over-scaled pose would be most obvious.
    expect(REDUCED_MOTION_POSE.beatScale).toBeGreaterThan(1);
    expect(REDUCED_MOTION_POSE.beatScale).toBeLessThanOrEqual(1 + RHYTHM.maxVolumetricChange);
  });

  it("sways less than the moving scene's amplitude", () => {
    expect(Math.abs(REDUCED_MOTION_POSE.swayDeg)).toBeLessThan(RHYTHM.swayDeg);
  });
});
