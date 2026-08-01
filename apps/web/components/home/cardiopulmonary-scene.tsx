import type { CSSProperties } from "react";

import type { MeshKind } from "@/lib/hero-cardiopulm/mesh";
import type { ScenePath } from "@/lib/hero-cardiopulm/scene";

import { RHYTHM } from "@/lib/hero-cardiopulm/anatomy";
import {
  BREATH_ANCHOR_Y,
  buildScene,
  REDUCED_MOTION_POSE,
  SCENE,
  VITALS,
} from "@/lib/hero-cardiopulm/scene";
import { capnograph, ieRatio, pulseTrace, rsaPercent } from "@/lib/hero-cardiopulm/waveforms";
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
const capno = capnograph();
const pulse = pulseTrace();
const ie = ieRatio();

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

/**
 * Shifted toward peach for the unboxed ground.
 *
 * Coral on a crimson gradient is the same hue at a similar value, which is why
 * the airways washed out once the dark panel went. Separation has to come from
 * VALUE here, so each ink moves toward the light end. The heart keeps the most
 * saturation, because it is the one system that should still read as the
 * warmest thing in the frame.
 */
const INK = {
  /**
   * Peach, barely lifted. It was peach + 22% white, which on this ground is
   * near enough to white that the inverted Y read as a line drawn ON the
   * figure in a different medium — the same failure its stroke weight had
   * already been pulled back from once. The airway is warm; its trunk should
   * be the brightest warm thing, not a cold one.
   */
  trachea: "color-mix(in oklab, var(--color-peach), white 8%)",
  airway: "color-mix(in oklab, var(--color-coral), var(--color-peach) 62%)",
  /**
   * The artery is nearly the heart's own ink, one step softer.
   *
   * Continuity is the correct relationship, not a decorative one: the pulmonary
   * trunk IS the right ventricle's outflow, and a reader should be able to
   * follow the colour out of the heart and into the lungs without the eye
   * having to cross a boundary that anatomy does not have.
   *
   * Not blue, and never will be. The convention that colours a pulmonary artery
   * blue is a textbook convention about oxygen saturation, and this palette
   * reserves the whole range to crimson and its warm neighbours. Artery and
   * vein are separated by SATURATION and WEIGHT instead, which is a difference
   * that survives at a stroke width of one and a half pixels.
   */
  artery: "color-mix(in oklab, var(--color-accent-bright), var(--color-peach) 26%)",
  /** The return: the palest, finest system, running where the bundle is not. */
  vein: "color-mix(in oklab, var(--color-peach), var(--color-coral) 16%)",
  heart: "color-mix(in oklab, var(--color-accent-bright), var(--color-peach) 10%)",
  pleura: "color-mix(in oklab, var(--color-peach), white 12%)",
} as const;

export function CardiopulmonaryScene({ className }: { className?: string }) {
  return (
    <figure className={className}>
      {/* The hover target wraps BOTH the mesh and the labels, so pointing
          anywhere on the figure reveals them. */}
      <div className="cps-stage">
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

        {/* PHYSIOLOGY, never anatomy — see VITALS. Real DOM text rather than
          paths, so it is selectable and translatable, and NOT inside the
          aria-hidden mesh: adding visible text makes the figure content.
          Revealed on hover or keyboard focus rather than always on, so the
          default state stays evocative and the labels do not compete with the
          headline on first paint. Off below the narrow breakpoint, where a
          cramped label is worse than none. */}
        <ul className="cps-labels">
          <li className="cps-label cps-label-rr">
            <span className="cps-key">RR</span>
            <span className="cps-val">{VITALS.respiratoryRate}</span>
            <span className="cps-unit">/min</span>
            {/* Capnography, from the breath curve itself. Square-shouldered
                because a real trace is: near zero through inspiration, a steep
                upstroke into the alveolar plateau, then a cliff at the next
                breath. A smooth sine here would be recognisably wrong to
                anyone who reads one at a bedside. */}
            <svg
              className="cps-trace"
              viewBox={`0 0 ${capno.width} ${capno.height}`}
              aria-hidden="true"
              style={{ "--period": `${capno.periodMs}ms` } as CSSProperties}
            >
              <path d={capno.d} />
            </svg>
          </li>
          <li className="cps-label cps-label-ie">
            <span className="cps-key">I:E</span>
            <span className="cps-val">{ie}</span>
          </li>
          <li className="cps-label cps-label-hr">
            <span className="cps-key">HR</span>
            <span className="cps-val">{VITALS.heartRate}</span>
            <span className="cps-unit">bpm</span>
            {/* The arterial pulse, from the same perfusion curve that drives
                the brightness crossing the chambers, so the trace peaks
                exactly when the figure does. The dicrotic notch sits on the
                downstroke; without it this reads as a sine, not a pulse. */}
            <svg
              className="cps-trace"
              viewBox={`0 0 ${pulse.width} ${pulse.height}`}
              aria-hidden="true"
              style={{ "--period": `${pulse.periodMs}ms` } as CSSProperties}
            >
              <path d={pulse.d} />
            </svg>
          </li>
          {/* The signature of the whole piece, and invisible to anyone who does
            not already know it is there. One line makes it legible. */}
          <li className="cps-label cps-label-rsa">
            <span className="cps-key">RSA</span>
            <span className="cps-unit">
              ±{rsaPercent}% · {site.home.heroSceneCoupling}
            </span>
          </li>
        </ul>
      </div>

      {/* The accessible route to the same information. The mesh is aria-hidden
          because its reading order means nothing out loud; this says what the
          picture is for. */}
      <figcaption className="sr-only">{site.home.heroSceneLabel}</figcaption>

      <style>{`
.cps-stage {
  position: relative;
  /* A chest is portrait, so at full column width the figure ran past the fold
     and cut the cardiac apex off — the one part of the picture a reader should
     not have to scroll for. Capped against viewport height instead: the width
     follows from the aspect ratio, so the whole thorax is always in view. */
  max-width: min(100%, 46vh);
  margin-inline: auto;
}
.cps-frame {
  position: relative;
  aspect-ratio: ${SCENE.width} / ${SCENE.height};
}

/* ── Labels ─────────────────────────────────────────────────────────────── */
.cps-labels {
  position: absolute;
  inset: 0;
  margin: 0;
  padding: 0;
  list-style: none;
  pointer-events: none;
}
.cps-label {
  position: absolute;
  display: flex;
  align-items: baseline;
  gap: 0.3em;
  /* The existing small-label scale. No new size is invented for this. */
  font-size: 11px;
  letter-spacing: 0.06em;
  color: var(--color-ink-on-dark);
  /* STANDING, not hover-gated. They were revealed on hover so the default
     state stayed evocative; that also meant the scene's best idea was
     invisible to everyone who never pointed at it — and invisible entirely on
     touch. They earn their place because every value is one the animation is
     actually running at. Held low enough not to compete with the headline. */
  opacity: 0.72;
  animation: cpsLabelIn 700ms var(--motion-ease) both;
}
/* Staggered, so the panel assembles rather than appearing. */
.cps-label-rr {
  animation-delay: 300ms;
}
.cps-label-ie {
  animation-delay: 520ms;
}
.cps-label-hr {
  animation-delay: 740ms;
}
.cps-label-rsa {
  animation-delay: 960ms;
}
@keyframes cpsLabelIn {
  from {
    opacity: 0;
    translate: 0 5px;
  }
  to {
    opacity: 0.72;
    translate: 0 0;
  }
}
/* A STRIP ABOVE THE FIGURE, and a note below it. Nothing over the mesh —
   which is the one placement rule the review set, and which the corners could
   not actually satisfy.
   Measured rather than judged: the lung apex sits ${((BREATH_ANCHOR_Y / SCENE.height) * 100).toFixed(1)}% down the frame, so
   the band above it is genuinely empty and the top corners are not. At 12% the
   silhouette already reaches in to 16% of the width, and both labels ran into
   it — RR's capnograph overlapped the right upper lobe and HR's key sat on the
   left apex. */
.cps-label-rr {
  top: 0;
  left: 0;
}
.cps-label-hr {
  top: 0;
  right: 0;
  justify-content: flex-end;
}
.cps-label-ie {
  /* Centred between them, on the same line. Full-width and centred rather than
     translated, so it cannot drift into either neighbour as the figure
     resizes — the three occupy the left, middle and right thirds by
     construction. */
  top: 0;
  left: 0;
  right: 0;
  justify-content: center;
}
.cps-label-rsa {
  bottom: 1%;
  left: 0;
  right: 0;
  justify-content: center;
  font-size: 10.5px;
  color: color-mix(in oklab, var(--color-ink-on-dark), transparent 25%);
}

/* ── Traces ─────────────────────────────────────────────────────────────── */
/* Scrolled by CSS, never by JavaScript. Each path holds two whole cycles and
   translates by exactly one over exactly one period, so the loop is seamless
   and the scroll rate IS the physiological rate by construction. */
.cps-trace {
  width: 46px;
  height: 15px;
  overflow: hidden;
  margin-inline-start: 0.35em;
  align-self: center;
}
.cps-trace path {
  fill: none;
  stroke: var(--color-coral);
  stroke-width: 1.2;
  stroke-opacity: 0.85;
  stroke-linecap: round;
  stroke-linejoin: round;
  animation: cpsScroll var(--period) linear infinite;
}
@keyframes cpsScroll {
  from {
    translate: 0 0;
  }
  to {
    translate: -50% 0;
  }
}
.cps-label-hr .cps-trace path {
  stroke: var(--color-accent-bright);
}
.cps-key {
  font-family: var(--font-numeric);
  text-transform: uppercase;
  color: color-mix(in oklab, var(--color-ink-on-dark), transparent 45%);
}
.cps-val {
  font-family: var(--font-numeric);
  font-size: 15px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}
.cps-unit {
  color: color-mix(in oklab, var(--color-ink-on-dark), transparent 45%);
}

/* Pointing at the figure lifts them the rest of the way. */
.cps-stage:hover .cps-label,
.cps-stage:focus-within .cps-label {
  opacity: 1;
}

/* No room on a phone, and a cramped label is worse than none. */
@media (max-width: 767px) {
  .cps-labels {
    display: none;
  }
}
@media (prefers-reduced-motion: reduce) {
  .cps-label {
    animation: none;
    opacity: 0.72;
    translate: 0 0;
  }
  /* A scrolling trace is motion for its own sake once motion is refused. It
     holds one still cycle, which still shows the waveform's shape. */
  .cps-trace path {
    animation: none;
  }
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
/* The vessels breathe WITH the lung, including the trunk and the hilar runs.
   The bundle demands it — an artery that stayed put while its bronchus moved
   would tear the two apart along their whole length — and the mediastinal ends
   are kept joined at the other side by the cardiac descent below rather than by
   being pinned to it. */
.cps-airway,
.cps-trachea,
.cps-artery,
.cps-vein,
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
/* AND THE HEART DESCENDS ON INSPIRATION. It rests on the diaphragm and is
   tethered above by the great vessels, so it travels down as the bases do —
   which is why a chest film is taken at full inspiration and why the cardiac
   silhouette looks larger on an expiratory one.
   It was added because the vessels needed it: the trunk leaves the right
   ventricle and four veins enter the left atrium, so a stationary heart beside
   hila that rise and fall by ten pixels tore the vessels apart at both ends.
   ${(RHYTHM.breathCardiacDescent * SCENE.scale).toFixed(0)}px lands within about two of where the breath scale carries the
   hilum, so the two systems agree rather than one being pinned to the other. */
.cps-heart,
.cps-heart-nodes {
  transform: translateY(calc(${(RHYTHM.breathCardiacDescent * SCENE.scale).toFixed(2)}px * var(--breath)))
    scale(var(--beat));
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
