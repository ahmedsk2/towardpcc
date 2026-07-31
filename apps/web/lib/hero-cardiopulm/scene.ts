import { RHYTHM } from "./anatomy";
import { buildMesh, type MeshKind } from "./mesh";

/**
 * The mesh, projected and bucketed into something a page can render.
 *
 * ONE PATH PER DEPTH BAND, not one element per edge.
 *
 * The scene has ~3,000 edges. As individual SVG lines that is 3,000 DOM nodes,
 * six times the whole element budget, for a figure that never changes shape.
 * Concatenated into a single path it is one node but one opacity — and depth
 * cueing is the entire reason the mesh reads as a volume rather than a doily.
 *
 * Bucketing by depth resolves it: edges are sorted back to front, grouped into
 * a few bands, and each band becomes one path with its own opacity and stroke
 * width. Five bands per system is fifteen nodes, and is indistinguishable from
 * per-edge shading because the eye reads the gradient, not the steps.
 *
 * Everything here runs on the server. No geometry ships as JavaScript; the
 * client's only job is to move four numbers.
 */
export const SCENE = {
  /** Sized to the chest: the thorax is 0.74 across and 1.0 down. */
  width: 340,
  height: 440,
  scale: 400,
  originX: 170,
  originY: 176,
  /** Camera distance for the perspective divide, in anatomy units. */
  camera: 2.6,
} as const;

/** Depth bands per system. Five is enough for the eye to read a gradient. */
const BANDS = 5;

export const px = (u: number) => u * SCENE.scale;
export const sx = (x: number) => SCENE.originX + px(x);
export const sy = (y: number) => SCENE.originY - px(y);

export interface ScenePath {
  kind: MeshKind;
  /** 0 = furthest band, BANDS-1 = nearest. */
  band: number;
  d: string;
  opacity: number;
  width: number;
  /**
   * True for the vertex paths.
   *
   * Vertices are drawn as ZERO-LENGTH SUBPATHS with a round linecap, which a
   * renderer paints as a disc of stroke-width diameter. That is what makes
   * them free: three thousand vertices would be three thousand circles, most
   * of the element budget spent on texture, but as `M x y L x y` they fold
   * into the same depth-banded paths the edges already use and cost nothing
   * but path data.
   *
   * They earn their place — a mesh drawn as edges alone reads as a net, and
   * the vertices are what make it read as sampled structure.
   */
  dots?: boolean;
}

export interface SceneNode {
  x: number;
  y: number;
  /** 0 at the back, 1 at the front. */
  depth: number;
  r: number;
}

export interface SceneModel {
  paths: ScenePath[];
  /** Alveolar clusters — the part that visibly breathes. */
  clusters: SceneNode[];
  /** Cardiac vertices, kept as dots so the heart reads as mass rather than wire. */
  heartNodes: SceneNode[];
  counts: { points: number; edges: number; elements: number };
}

/** Rotate about y, then x, then divide. */
function project(p: { x: number; y: number; z: number }, yaw: number, pitch: number) {
  const cy = Math.cos(yaw);
  const sy2 = Math.sin(yaw);
  const x1 = p.x * cy + p.z * sy2;
  const z1 = -p.x * sy2 + p.z * cy;
  const cp = Math.cos(pitch);
  const sp = Math.sin(pitch);
  const y1 = p.y * cp - z1 * sp;
  const z2 = p.y * sp + z1 * cp;
  const k = SCENE.camera / (SCENE.camera - z2);
  return { x: SCENE.originX + x1 * px(1) * k, y: SCENE.originY - y1 * px(1) * k, z: z2 };
}

/** Per-system band styling: opacity and stroke width at the far and near bands. */
const STYLE: Record<MeshKind, { far: number; near: number; wFar: number; wNear: number }> = {
  /** The structure the eye should follow first. */
  airway: { far: 0.14, near: 0.8, wFar: 0.5, wNear: 1.4 },
  /** The subject: brightest, and drawn last. */
  heart: { far: 0.22, near: 0.95, wFar: 0.55, wNear: 1.2 },
  /**
   * The room, not the subject. Barely there on purpose — drawn any heavier it
   * becomes an outline, and an outline around a mesh reads as a box the scene
   * has been placed inside.
   */
  pleura: { far: 0.035, near: 0.17, wFar: 0.4, wNear: 0.65 },
};

/** Vertices sit a little brighter than their edges, or they vanish into them. */
const DOT_LIFT = 1.35;

const KIND_ORDER: MeshKind[] = ["pleura", "airway", "heart"];

let cached: SceneModel | null = null;

export function buildScene(): SceneModel {
  if (cached) return cached;

  const mesh = buildMesh();
  const pitch = (RHYTHM.pitchDeg * Math.PI) / 180;
  const projected = mesh.points.map((p) => project(p, 0, pitch));

  const zs = projected.map((p) => p.z);
  const near = Math.max(...zs);
  const far = Math.min(...zs);
  const norm = (z: number) => (z - far) / (near - far || 1);

  const paths: ScenePath[] = [];
  for (const kind of KIND_ORDER) {
    const style = STYLE[kind];
    const buckets: string[][] = Array.from({ length: BANDS }, () => []);
    for (const e of mesh.edges) {
      if (e.kind !== kind) continue;
      const a = projected[e.a]!;
      const b = projected[e.b]!;
      const d = (norm(a.z) + norm(b.z)) / 2;
      const band = Math.min(BANDS - 1, Math.floor(d * BANDS));
      buckets[band]!.push(
        `M${a.x.toFixed(1)} ${a.y.toFixed(1)}L${b.x.toFixed(1)} ${b.y.toFixed(1)}`,
      );
    }
    buckets.forEach((segs, band) => {
      if (!segs.length) return;
      const t = band / (BANDS - 1);
      paths.push({
        kind,
        band,
        d: segs.join(""),
        // Eased, so the far bands recede faster than linear. That is what makes
        // the volume feel deep rather than merely layered.
        opacity: style.far + (style.near - style.far) * Math.pow(t, 1.6),
        width: style.wFar + (style.wNear - style.wFar) * t,
      });
    });

    // Vertices, in the same bands.
    const dotBuckets: string[][] = Array.from({ length: BANDS }, () => []);
    mesh.points.forEach((p, i) => {
      if (p.kind !== kind) return;
      const q = projected[i]!;
      const band = Math.min(BANDS - 1, Math.floor(norm(q.z) * BANDS));
      const x = q.x.toFixed(1);
      const y = q.y.toFixed(1);
      dotBuckets[band]!.push(`M${x} ${y}L${x} ${y}`);
    });
    dotBuckets.forEach((segs, band) => {
      if (!segs.length) return;
      const t = band / (BANDS - 1);
      paths.push({
        kind,
        band,
        d: segs.join(""),
        dots: true,
        opacity: (style.far + (style.near - style.far) * Math.pow(t, 1.4)) * DOT_LIFT,
        width: style.wFar * 1.5 + (style.wNear * 2.2 - style.wFar * 1.5) * t,
      });
    });
  }

  const clusters: SceneNode[] = mesh.nodes.map((i) => {
    const q = projected[i]!;
    const d = norm(q.z);
    return { x: q.x, y: q.y, depth: d, r: 1.4 + 1.8 * d };
  });

  // No cardiac vertex dots. They existed to give the heart mass when it was a
  // proximity web of loose points; the surface grid carries it on its own, and
  // 520 circles is most of the element budget spent restating what the mesh
  // already says.
  const heartNodes: SceneNode[] = [];

  cached = {
    paths,
    clusters,
    heartNodes,
    counts: {
      points: mesh.points.length,
      edges: mesh.edges.length,
      elements: paths.length + clusters.length + heartNodes.length,
    },
  };
  return cached;
}

/**
 * The pose held under `prefers-reduced-motion`.
 *
 * Not frame zero and not a flat elevation: end-inspiratory and mid-systolic, so
 * a reader who never sees this move still sees lungs that are full and a heart
 * that is perfused.
 */
export const REDUCED_MOTION_POSE = {
  breath: 0.72,
  beatScale: 1 + RHYTHM.maxVolumetricChange * 0.6,
  wave: 0.55,
  swayDeg: RHYTHM.swayDeg * 0.45,
} as const;
