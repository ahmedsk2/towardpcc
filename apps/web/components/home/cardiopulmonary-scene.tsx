import type { CSSProperties } from "react";

import { RHYTHM } from "@/lib/hero-cardiopulm/anatomy";
import { buildScene, REDUCED_MOTION_POSE, SCENE } from "@/lib/hero-cardiopulm/scene";
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

const INK = {
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
            "--sway": `${REDUCED_MOTION_POSE.swayDeg}deg`,
          } as CSSProperties
        }
      >
        <PulseDriver />
        <svg
          className="cps-svg"
          viewBox={`0 0 ${SCENE.width} ${SCENE.height}`}
          preserveAspectRatio="xMidYMid meet"
        >
          {/* The sway is a rotation about the vertical axis, applied as a
              horizontal squeeze. A real rotation would need the mesh
              reprojected every frame, which is exactly the per-vertex work this
              architecture exists to avoid; at ±12° the difference is not
              visible and the cost is one transform on one group. */}
          <g className="cps-world">
            {scene.paths.map((p) => (
              <path
                key={`${p.kind}${p.band}`}
                className={`cps-${p.kind}`}
                d={p.d}
                fill="none"
                stroke={INK[p.kind]}
                strokeOpacity={p.opacity.toFixed(3)}
                strokeWidth={p.width.toFixed(2)}
                strokeLinecap="round"
              />
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
  transform: scaleX(calc(1 - 0.055 * (var(--sway) / ${RHYTHM.swayDeg}deg) * (var(--sway) / ${RHYTHM.swayDeg}deg)));
  transform-origin: ${SCENE.originX}px ${SCENE.originY}px;
  transform-box: view-box;
  will-change: transform;
}

/* ── Breathing ──────────────────────────────────────────────────────────── */
/* The tree and the surfaces expand about the carina together: a lung that
   inflates without its pleura moving is a lung inside a rigid box. */
.cps-airway,
.cps-pleura,
.cps-clusters {
  transform: scale(calc(1 + ${RHYTHM.breathScaleGlobal} * var(--breath)));
  transform-origin: ${SCENE.originX}px ${SCENE.originY}px;
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
