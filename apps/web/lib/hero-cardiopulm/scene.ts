import { BUDGET, DEFAULT_SEED, ENVELOPE, RHYTHM, THORAX } from "./anatomy";
import { generateHeart } from "./heart";
import { generateShells, type Shell } from "./shells";
import { generateTree, LOBES } from "./tree";

/**
 * Projection from anatomy units into the scene's local pixel space.
 *
 * ONE coordinate space, scaled by CSS rather than re-generated per breakpoint.
 * A second geometry for narrow screens would double the markup to show half of
 * it, and the phase-1 measurement removed the reason to: per-frame cost is flat
 * in particle count and scales with GROUP count, so 550 particles cost a phone
 * no more main-thread time than 280. What a phone does pay for is compositor
 * layers, and that is answered by promoting the ~60 groups instead of the 550
 * particles — see the note on will-change in the component.
 */
export const SCENE = {
  /**
   * Box sized to the CHEST, not to a comfortable rectangle. The thorax spans
   * 0.74 units across and 1.0 down, so a landscape frame would be mostly empty
   * margin and the figure would sit small inside its own card.
   */
  width: 340,
  height: 440,
  /** Pixels per anatomy unit. The chest is 1.0 units apex to costophrenic. */
  scale: 400,
  /** Where the carina sits in the box. Everything is measured from it. */
  originX: 170,
  originY: 176,
} as const;

export const px = (u: number) => u * SCENE.scale;
export const sx = (x: number) => SCENE.originX + px(x);
export const sy = (y: number) => SCENE.originY - px(y);

export interface SceneParticle {
  /** Local pixel position; z is depth, positive toward the viewer. */
  x: number;
  y: number;
  z: number;
  /** Diameter in px. */
  r: number;
  /** 0..1, meaning depends on the system. */
  t: number;
}

export interface SceneGroup {
  id: string;
  kind: "chamber" | "cluster" | "dust";
  /** Origin the group scales about, in local px. */
  ox: number;
  oy: number;
  oz: number;
  /** For chambers: 0 = right heart, 1 = left. For airways: lobe index. */
  key: number;
  particles: SceneParticle[];
}

export interface SceneShell {
  lung: "right" | "left";
  z: number;
  /** Stroked outline: one subpath per segment, the gaps between them fissures. */
  d: string;
  /**
   * The same contour as ONE closed path, for a soft fill.
   *
   * Separate from `d` because a fill needs a closed loop and the stroke needs
   * the fissure gaps — filling the gapped path would close each fragment
   * independently and shade the fissures as if they were lobes of their own.
   */
  fillD: string;
}

export interface SceneModel {
  groups: SceneGroup[];
  shells: SceneShell[];
  counts: { particles: number; groups: number; shells: number };
}

/**
 * Drop points that add nothing to the drawn curve.
 *
 * The marcher walks 150 rows per lung to find the surface accurately; the
 * SVG needs far fewer to LOOK like it. Most of a lung outline is a near-
 * vertical wall, where consecutive samples are collinear to well under a
 * pixel, and shipping them all cost 19 KB of path data in the HTML. A point
 * survives only if dropping it would move the curve by more than half a pixel
 * — which keeps every point around the apex, the costophrenic corner and the
 * notch, where the curvature actually is.
 */
function simplify(points: { x: number; y: number }[], tolerancePx: number) {
  if (points.length < 3) return points;
  const kept = [points[0]!];
  for (let i = 1; i < points.length - 1; i++) {
    const a = kept[kept.length - 1]!;
    const b = points[i]!;
    const c = points[i + 1]!;
    // Perpendicular distance from b to the chord a-c.
    const dx = c.x - a.x;
    const dy = c.y - a.y;
    const len = Math.hypot(dx, dy);
    const dev = len < 1e-6 ? 0 : Math.abs(dx * (a.y - b.y) - dy * (a.x - b.x)) / len;
    if (dev > tolerancePx) kept.push(b);
  }
  kept.push(points[points.length - 1]!);
  return kept;
}

/** The whole contour as one closed subpath, taken from the UNBROKEN loop. */
function shellFillPath(shell: Shell): string {
  if (shell.loop.length < 3) return "";
  const pts = simplify(
    shell.loop.map((p) => ({ x: sx(p.x), y: sy(p.y) })),
    0.5,
  );
  return "M" + pts.map((p) => `${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join("L") + "Z";
}

function shellPath(shell: Shell): string {
  return shell.segments
    .map((seg) => {
      const pts = simplify(
        seg.points.map((p) => ({ x: sx(p.x), y: sy(p.y) })),
        0.5,
      );
      return "M" + pts.map((p) => `${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join("L");
    })
    .join("");
}

/**
 * Build the whole scene, once, at render time on the server.
 *
 * Deterministic from DEFAULT_SEED, so the markup is byte-stable across builds
 * and a static page stays static. Nothing here runs in the browser.
 */
export function buildScene(): SceneModel {
  const budget = BUDGET.desktop;
  const heart = generateHeart(budget.heart, DEFAULT_SEED);
  const tree = generateTree(budget.airways, budget.generations, DEFAULT_SEED);
  const shells = generateShells();

  const groups: SceneGroup[] = [];

  // ── Heart: one group per chamber ────────────────────────────────────────
  // Grouped by chamber because the beat acts per chamber — the ventricles
  // perfuse, the atria do not. Four groups, not 190.
  for (let ci = 0; ci < 4; ci++) {
    const particles: SceneParticle[] = [];
    let ox = 0;
    let oy = 0;
    let oz = 0;
    for (let i = 0; i < heart.count; i++) {
      if (heart.chamber[i] !== ci) continue;
      const p = {
        x: sx(heart.positions[i * 3]!),
        y: sy(heart.positions[i * 3 + 1]!),
        z: px(heart.positions[i * 3 + 2]!),
        r: 6.4,
        t: heart.tint[i]!,
      };
      particles.push(p);
      ox += p.x;
      oy += p.y;
      oz += p.z;
    }
    if (!particles.length) continue;
    const n = particles.length;
    groups.push({
      id: `ch${ci}`,
      kind: "chamber",
      ox: ox / n,
      oy: oy / n,
      oz: oz / n,
      // Ventricles only take the volumetric change; atria hold still.
      key: ci === 0 || ci === 2 ? 1 : 0,
      particles,
    });
  }

  // ── Airways: one group per alveolar cluster, plus one dust group per lobe ──
  // Clusters swell about their own centroids — that is recruitment, and it is
  // the motion that reads as breathing. Branch dust only rides the global
  // scale, so it needs no group of its own beyond its lobe.
  const clusters = new Map<number, SceneParticle[]>();
  const dust = new Map<number, SceneParticle[]>();
  for (let i = 0; i < tree.count; i++) {
    const p: SceneParticle = {
      x: sx(tree.positions[i * 3]!),
      y: sy(tree.positions[i * 3 + 1]!),
      z: px(tree.positions[i * 3 + 2]!),
      r: tree.isCluster[i] === 1 ? 4.6 : 3.2,
      t: tree.lobe[i]! / (LOBES.length - 1),
    };
    if (tree.isCluster[i] === 1) {
      const id = tree.clusterId[i]!;
      (clusters.get(id) ?? clusters.set(id, []).get(id)!).push(p);
    } else {
      const lobe = tree.lobe[i]!;
      (dust.get(lobe) ?? dust.set(lobe, []).get(lobe)!).push(p);
    }
  }

  for (const [id, particles] of [...clusters].sort((a, b) => a[0] - b[0])) {
    const c = tree.clusterCentroids;
    const has = id * 3 + 2 < c.length;
    groups.push({
      id: `cl${id}`,
      kind: "cluster",
      ox: has ? sx(c[id * 3]!) : particles[0]!.x,
      oy: has ? sy(c[id * 3 + 1]!) : particles[0]!.y,
      oz: has ? px(c[id * 3 + 2]!) : particles[0]!.z,
      key: id,
      particles,
    });
  }

  // Dust scales about the carina with the rest of the tree, so its origin is
  // the scene origin rather than a per-lobe centroid.
  for (const [lobe, particles] of [...dust].sort((a, b) => a[0] - b[0])) {
    groups.push({
      id: `du${lobe}`,
      kind: "dust",
      ox: SCENE.originX,
      oy: SCENE.originY,
      oz: 0,
      key: lobe,
      particles,
    });
  }

  const sceneShells: SceneShell[] = shells.map((s) => ({
    lung: s.lung,
    z: px(s.z),
    d: shellPath(s),
    fillD: shellFillPath(s),
  }));

  return {
    groups,
    shells: sceneShells,
    counts: {
      particles: groups.reduce((a, g) => a + g.particles.length, 0),
      groups: groups.length,
      shells: sceneShells.length,
    },
  };
}

/**
 * The still the scene holds under `prefers-reduced-motion`.
 *
 * Not a flat elevation and not frame zero: an end-inspiratory, mid-systolic
 * pose, so a reader who never sees it move still sees lungs that are full and a
 * heart that is perfused. A composed still, the same standard the organ stack
 * held itself to.
 */
export const REDUCED_MOTION_POSE = {
  breath: 0.72,
  beatScale: 1 + RHYTHM.maxVolumetricChange * 0.6,
  wave: 0.55,
  swayDeg: RHYTHM.swayDeg * 0.45,
} as const;

/** Vertical span the scene occupies, for sizing the frame. */
export const SCENE_EXTENT = {
  topPx: sy(THORAX.lungApexY),
  bottomPx: sy(THORAX.costophrenicY),
  notchTopPx: sy(ENVELOPE.cardiacNotch.topY),
} as const;
