import { describe, expect, it } from "vitest";

import { RHYTHM } from "./anatomy";
import { buildMesh } from "./mesh";
import { buildScene, MAX_SWAY_DEG, REDUCED_MOTION_POSE, SCENE, sx, sy } from "./scene";

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

  /** The airway is ONE tree; the central part is a separate kind only so it
   *  can be drawn heavier. Connectivity does not care about that split. */
  const isAirway = (k: string) => k === "airway" || k === "trachea";

  it("draws the airway from its own connectivity, not by proximity", () => {
    // A bronchial tree is a graph and the segments are known at generation
    // time. Nearest-neighbour meshing would join a distal twig of the right
    // lower lobe to one of the middle lobe that never shared a bronchus.
    const airway = mesh.edges.filter((e) => isAirway(e.kind));
    expect(airway.length).toBeGreaterThan(400);
    // Every airway edge must be a real segment: both ends are tree nodes.
    for (const e of airway) {
      expect(mesh.points[e.a]!.kind).toBe("airway");
      expect(mesh.points[e.b]!.kind).toBe("airway");
    }
    // And the central airway must actually exist, or the trunk is unweighted.
    expect(mesh.edges.filter((e) => e.kind === "trachea").length).toBeGreaterThan(4);
  });

  it("keeps the airway one connected tree", () => {
    // Shared endpoints are deduplicated on a grid so a parent's tip and its
    // children's roots are one node. Without that the tree falls into
    // disjoint sticks that happen to line up.
    const airwayNodes = new Set<number>();
    const adjacency = new Map<number, number[]>();
    for (const e of mesh.edges) {
      if (!isAirway(e.kind)) continue;
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
    // Five bands per system for the edges, and five more for the vertices,
    // which ride as zero-length subpaths rather than as three thousand circles.
    // Four systems, five depth bands each, edges and vertices banding
    // independently: forty at the ceiling, thirty-one where bands are non-empty.
    expect(scene.paths.length).toBeLessThanOrEqual(40);
    expect(scene.counts.elements).toBeLessThan(150);
  });

  it("shades the depth bands monotonically", () => {
    // Depth is carried by brightness alone, so the bands must be ordered. If
    // they were not, near structure would recede behind far structure.
    // Edges and vertices band independently, so each family is checked on its
    // own — interleaving them would compare a near edge against a far dot.
    for (const kind of ["trachea", "airway", "heart", "pleura"] as const) {
      for (const dots of [false, true]) {
        const bands = scene.paths
          .filter((p) => p.kind === kind && Boolean(p.dots) === dots)
          .sort((a, b) => a.band - b.band);
        for (let i = 1; i < bands.length; i++) {
          expect(bands[i]!.opacity).toBeGreaterThan(bands[i - 1]!.opacity);
          expect(bands[i]!.width).toBeGreaterThan(bands[i - 1]!.width);
        }
      }
    }
  });

  it("keeps the pleura quieter than the airway it contains", () => {
    // The pleura is the room, not the subject. Drawn any heavier it becomes an
    // outline, and an outline around a mesh reads as a box.
    const brightest = (kind: string) =>
      Math.max(...scene.paths.filter((p) => p.kind === kind && !p.dots).map((p) => p.opacity));
    expect(brightest("pleura")).toBeLessThan(brightest("airway"));
    expect(brightest("airway")).toBeLessThan(brightest("trachea"));
    // The central airway is the trunk: heavier than what hangs off it.
    const widest = (kind: string) =>
      Math.max(...scene.paths.filter((p) => p.kind === kind && !p.dots).map((p) => p.width));
    expect(widest("airway")).toBeLessThan(widest("trachea"));
  });
});

describe("depth-band parallax", () => {
  const scene = buildScene();

  it("orders the bands monotonically in depth", () => {
    // The parallax shifts each band by its own depth, so the bands must BE
    // ordered in depth or near structure slides behind far structure.
    for (const kind of ["airway", "heart", "pleura"] as const) {
      const bands = scene.paths
        .filter((p) => p.kind === kind && !p.dots)
        .sort((a, b) => a.band - b.band);
      for (let i = 1; i < bands.length; i++) {
        expect(bands[i]!.z).toBeGreaterThan(bands[i - 1]!.z);
      }
    }
    // The central airway is a short trunk near the midline, so it may not
    // populate every band; only that what it does populate is ordered.
    const trunk = scene.paths
      .filter((p) => p.kind === "trachea" && !p.dots)
      .sort((a, b) => a.band - b.band);
    for (let i = 1; i < trunk.length; i++) {
      expect(trunk[i]!.z).toBeGreaterThan(trunk[i - 1]!.z);
    }
  });

  it("holds the sway amplitude below the angle at which bands cross", () => {
    // First-order exact, not an imitation — but only while the bands keep
    // their depth order relative to one another. Past ~15 degrees they cross
    // and it visibly breaks. This is a number someone will reasonably want to
    // turn up, so it is pinned rather than left to a comment.
    expect(RHYTHM.swayDeg).toBeLessThanOrEqual(MAX_SWAY_DEG);
    expect(MAX_SWAY_DEG).toBeLessThanOrEqual(15);
  });

  it("keeps the parallax shift small against the figure", () => {
    // sin(15 deg) is 0.26, so the deepest band moves about a quarter of its
    // depth. If that ever exceeded a tenth of the frame the scene would read
    // as sliding apart rather than turning.
    const deepest = Math.max(...scene.paths.map((p) => Math.abs(p.z)));
    const shift = deepest * Math.sin((MAX_SWAY_DEG * Math.PI) / 180);
    expect(shift).toBeLessThan(SCENE.width * 0.1);
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
