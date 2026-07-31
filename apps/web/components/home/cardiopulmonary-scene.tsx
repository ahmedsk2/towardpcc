import type { CSSProperties } from "react";

import type { MeshKind } from "@/lib/hero-cardiopulm/mesh";
import type { ScenePath } from "@/lib/hero-cardiopulm/scene";

import { RHYTHM } from "@/lib/hero-cardiopulm/anatomy";
import {
  BREATH_ANCHOR_Y,
  buildScene,
  REDUCED_MOTION_POSE,
  SCENE,
} from "@/lib/hero-cardiopulm/scene";
import { site } from "@/content/site";
import { PulseDriver } from "./pulse-driver";

/**
 * The hero figure: a child's heart and lungs, as a wire mesh.
 *
 * WHAT IT IS. A bronchial tree grown by space colonisation into five lobes
 * bounded by their own fissure planes; four cardiac chambers meshed into a
 * surface and tinted by chamber laterality; both pleural surfaces suggested by
 * a sparse weave at three depths. Every landmark comes from ANATOMY.md and is
 * asserted — the geometry has its own suite, because a pediatric intensivist is
 * the primary viewer and a wrong relationship is what this site refuses to ship.
 *
 * WHY A MESH. A cloud of unconnected dots reads as noise however correct each
 * dot is. Edges give the eye a surface to follow, and the outermost edges become
 * the silhouette, which is why a mesh needs no outline drawn around it. The
 * first build of this scene had 544 correct particles and six drawn outlines and
 * looked like a contour plot with dust scattered over it.
 *
 * WHAT IT COSTS. Nothing at runtime. The mesh is built on the server, projected
 * once, and emitted as fifteen depth-banded paths plus the cluster and cardiac
 * nodes. No geometry ships as JavaScript. The only client code is PulseDriver,
 * which writes four custom properties on this element and touches nothing else.
 */
const scene = buildScene();

/**
 * Paths regrouped by depth band, so parallax and breath can NEST rather than
 * being concatenated into one transform string. The band group carries the
 * horizontal shift; the paths inside it carry breath and beat, each about its
 * own origin.
 */
const bands = (() => {
  const byBand = new Map<string, { kind: MeshKind; band: number; z: number; paths: ScenePath[] }>();
  for (const p of scene.paths) {
    const key = `${p.kind}:${p.band}`;
    const hit = byBand.get(key);
    if (hit) hit.paths.push(p);
    else byBand.set(key, { kind: p.kind, band: p.band, z: p.z, paths: [p] });
  }
  return [...byBand.values()];
})();

const INK = {
  // Between the airway and the pleura: unmistakably the trunk, still the
  // same figure as the branches hanging off it.
  trachea: "color-mix(in oklab, var(--color-coral), var(--color-peach) 55%)",
  airway: "var(--color-coral)",
  heart: "var(--color-accent-bright)",
  pleura: "var(--color-peach)",
} as const;

export function CardiopulmonaryScene({ className }: { className?: string }) {
  return (
    <figure className={className}>
      <div
        aria-hidden="true"
        className="cps-frame"
        style={
          {
            "--breath": `${REDUCED_MOTION_POSE.breath}`,
            "--beat": `${REDUCED_MOTION_POSE.beatScale}`,
            "--wave": `${REDUCED_MOTION_POSE.wave}`,
            "--sway-cos": `${Math.cos((REDUCED_MOTION_POSE.swayDeg * Math.PI) / 180).toFixed(5)}`,
            "--sway-sin": `${Math.sin((REDUCED_MOTION_POSE.swayDeg * Math.PI) / 180).toFixed(5)}`,
          } as CSSProperties
        }
      >
        <PulseDriver />
        <svg
          className="cps-svg"
          viewBox={`0 0 ${SCENE.width} ${SCENE.height}`}
          preserveAspectRatio="xMidYMid meet"
        >
          {/* DEPTH-BAND PARALLAX, not a turntable.
              For a yaw of theta about the vertical axis a point at depth z
              moves to x' = x*cos(theta) + z*sin(theta). Within a band z is
              nearly constant, so the band translates by one value and this
              group carries the cos term — first-order exact, 31 transforms a
              frame, no path ever rewritten.
              A true rotation on this architecture would re-project 2,989 points
              and rebuild 30 path strings every frame, roughly 6.8 MB/s of
              string allocation at 60fps. That is not a tuning problem, it is
              the wrong architecture for the requirement.
              A chest also has a canonical view in a way a brain does not: past
              90 degrees the viewer is behind the patient and the apex points
              the wrong way, undoing every bit of the mirroring discipline the
              geometry enforces. */}
          <g className="cps-world">
            {bands.map(({ kind, band, z, paths }) => (
              <g
                key={`${kind}${band}`}
                className="cps-band"
                style={{ "--z": z.toFixed(1) } as CSSProperties}
              >
                {paths.map((p) => (
                  <path
                    key={p.dots ? "d" : "e"}
                    className={`cps-${p.kind}`}
                    d={p.d}
                    fill="none"
                    stroke={INK[p.kind]}
                    strokeOpacity={Math.min(1, p.opacity).toFixed(3)}
                    strokeWidth={p.width.toFixed(2)}
                    strokeLinecap="round"
                  />
                ))}
              </g>
            ))}

            {/* Cardiac vertices, so the heart reads as mass and not only wire. */}
            <g className="cps-heart-nodes">
              {scene.heartNodes.map((n, i) => (
                <circle
                  key={i}
                  cx={n.x.toFixed(1)}
                  cy={n.y.toFixed(1)}
                  r={n.r.toFixed(2)}
                  fill="var(--color-accent-bright)"
                  fillOpacity={(0.25 + 0.7 * n.depth).toFixed(3)}
                />
              ))}
            </g>

            {/* Alveolar clusters: the part that visibly breathes. */}
            <g className="cps-clusters">
              {scene.clusters.map((n, i) => (
                <circle
                  key={i}
                  cx={n.x.toFixed(1)}
                  cy={n.y.toFixed(1)}
                  r={n.r.toFixed(2)}
                  fill="var(--color-peach)"
                  fillOpacity={(0.35 + 0.6 * n.depth).toFixed(3)}
                />
              ))}
            </g>
          </g>
        </svg>
      </div>

      {/* The accessible route to the same information. The mesh is aria-hidden
          because its reading order means nothing out loud; this says what the
          picture is for. */}
      <figcaption className="sr-only">{site.home.heroSceneLabel}</figcaption>

      <style>{`
.cps-frame {
  position: relative;
  aspect-ratio: ${SCENE.width} / ${SCENE.height};
  /* A chest is portrait, so at full column width the figure ran past the fold
     and cut the cardiac apex off — the one part of the picture a reader should
     not have to scroll for. Capped against viewport height instead: the width
     follows from the aspect ratio, so the whole thorax is always in view. */
  max-width: min(100%, 46vh);
  margin-inline: auto;
}
.cps-svg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  overflow: visible;
}
.cps-world {
  transform: scaleX(var(--sway-cos));
  transform-origin: ${SCENE.originX}px ${SCENE.originY}px;
  transform-box: view-box;
  will-change: transform;
}
/* The parallax shift. Nested outside breath and beat, so the three compose
   instead of fighting over one transform property. */
.cps-band {
  transform: translateX(calc(var(--z) * var(--sway-sin) * 1px));
  transform-box: view-box;
  will-change: transform;
}

/* ── Breathing ──────────────────────────────────────────────────────────── */
/* DIAPHRAGMATIC, and anchored at the lung APEX. A single radial scale about
   the carina reads as a zoom: everything grows together, so nothing moves
   relative to anything else. A child breathes mostly with the diaphragm — the
   apex barely moves and the bases descend — so the expansion is mostly
   vertical, about the top of the lung, with a small lateral term for the ribs. */
.cps-airway,
.cps-trachea,
.cps-pleura,
.cps-clusters {
  transform: scale(
    calc(1 + ${RHYTHM.breathScaleLateral} * var(--breath)),
    calc(1 + ${RHYTHM.breathScaleVertical} * var(--breath))
  );
  transform-origin: ${SCENE.originX}px ${BREATH_ANCHOR_Y.toFixed(1)}px;
  transform-box: view-box;
}
/* Clusters additionally brighten on inspiration — recruitment, and the thing
   that reads as breathing rather than as a bellows. */
.cps-clusters {
  opacity: calc(0.66 + ${RHYTHM.breathAlphaCluster} * 2 * var(--breath));
}

/* ── Perfusion ──────────────────────────────────────────────────────────── */
/* The heart PERFUSES: brightness crosses it, and volume changes by at most
   ${(RHYTHM.maxVolumetricChange * 100).toFixed(0)}%. A visibly contracting organ at 81 bpm reads frantic and
   slightly grotesque. */
.cps-heart,
.cps-heart-nodes {
  transform: scale(var(--beat));
  transform-origin: ${SCENE.originX}px ${(SCENE.originY + 100).toFixed(0)}px;
  transform-box: view-box;
}
.cps-heart-nodes {
  filter: brightness(calc(0.85 + 0.5 * var(--wave)));
}

@media (prefers-reduced-motion: reduce) {
  .cps-world {
    will-change: auto;
  }
}
`}</style>
    </figure>
  );
}
