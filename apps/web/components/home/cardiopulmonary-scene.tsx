import type { CSSProperties } from "react";

import { RHYTHM } from "@/lib/hero-cardiopulm/anatomy";
import { buildScene, REDUCED_MOTION_POSE, SCENE } from "@/lib/hero-cardiopulm/scene";
import { site } from "@/content/site";
import { PulseDriver } from "./pulse-driver";

/**
 * The hero figure: a child's heart and lungs, in CSS 3D.
 *
 * WHAT IT IS. Airways branching from the carina into alveolar clusters that
 * swell on inspiration; four cardiac chambers in their real depth order,
 * perfusing right to left; both lungs drawn as nested pleural outlines with the
 * cardiac notch cut where the heart actually sits. Every landmark comes from
 * ANATOMY.md and every one of them is asserted — the geometry has its own suite
 * of 95 tests, because a pediatric intensivist is the primary viewer and a
 * wrong relationship is exactly what this site refuses to ship.
 *
 * WHY IT REPLACES THE ORGAN STACK. The stack said "a score sums across organ
 * systems", which is true and is a diagram of an idea. This says "a child is
 * breathing and perfusing", which is the thing the scores are ABOUT. It is also
 * the one picture a PICU clinician reads faster than any label.
 *
 * NO JAVASCRIPT FOR THE GEOMETRY. This is a server component: 544 particles and
 * six stroked shells emitted as static markup with static transforms, laid out
 * by `perspective` and `transform-style: preserve-3d`. Nothing here re-renders.
 *
 * The only client code is PulseDriver, which writes two custom properties on
 * this element and nothing else. That split is deliberate and measured: the
 * phase-1 benchmark showed per-frame cost is FLAT in particle count and scales
 * with the number of elements whose style actually changes. Here that is 4
 * chambers, 54 clusters, 5 dust groups and the world — about 64 elements, which
 * measured p95 0.7 ms against a 16.7 ms frame. Driving 544 particles instead
 * would be the same picture at eight times the price.
 *
 * WILL-CHANGE GOES ON THE GROUPS, NOT THE PARTICLES. Particles never animate
 * individually, so promoting each one would buy nothing and cost 544 compositor
 * layers — which on a phone is the term that actually hurts.
 */
const scene = buildScene();

/**
 * The scene is laid out PROPORTIONALLY, not in the pixels it was designed in.
 *
 * x and y become percentages of the frame, which resolve against the group's
 * containing block and therefore track the card at any width. Depth becomes
 * container-query units, so it scales with them — z left in absolute pixels
 * would flatten the scene as the card grew, since everything else would widen
 * around a fixed depth.
 *
 * The obvious alternative, scaling the whole world by `calc(100cqw / 340)`,
 * silently does nothing: that expression resolves to a LENGTH, `scale()` takes
 * a number, and the browser drops the declaration — the first build of this
 * component rendered with `transform: none` and no perspective at all.
 */
const pctX = (v: number) => `${((v / SCENE.width) * 100).toFixed(3)}%`;
const pctY = (v: number) => `${((v / SCENE.height) * 100).toFixed(3)}%`;
const cqw = (v: number) => `${((v / SCENE.width) * 100).toFixed(3)}cqw`;

const RIGHT_HEART = "var(--color-accent-deep)";
const LEFT_HEART = "var(--color-accent-bright)";

/** Chamber order of perfusion: RA → RV → LA → LV, as the wave crosses. */
const PERFUSION_SEQUENCE: Record<string, number> = { ch1: 0, ch0: 1, ch3: 2, ch2: 3 };

export function CardiopulmonaryScene({ className }: { className?: string }) {
  return (
    <figure className={className}>
      <div
        aria-hidden="true"
        className="cps-frame"
        style={
          {
            "--cps-w": `${SCENE.width}`,
            "--cps-h": `${SCENE.height}`,
            // The pose held under reduced motion, and the starting pose before
            // the driver's first frame — so the scene is never briefly wrong.
            "--breath": `${REDUCED_MOTION_POSE.breath}`,
            "--beat": `${REDUCED_MOTION_POSE.beatScale}`,
            "--wave": `${REDUCED_MOTION_POSE.wave}`,
            "--sway": `${REDUCED_MOTION_POSE.swayDeg}deg`,
          } as CSSProperties
        }
      >
        <PulseDriver />
        <div className="cps-stage">
          <div className="cps-world">
            {/* The pleural surfaces, behind everything: they are the room. */}
            {scene.shells.map((shell, i) => (
              <svg
                key={`${shell.lung}${i}`}
                className={`cps-shell${shell.z === 0 ? " cps-shell-mid" : ""}`}
                viewBox={`0 0 ${SCENE.width} ${SCENE.height}`}
                style={{ transform: `translate3d(0,0,${cqw(shell.z)})` }}
              >
                <path className="cps-fill" d={shell.fillD} />
                <path className="cps-edge" d={shell.d} />
              </svg>
            ))}

            {scene.groups.map((g) => (
              <div
                key={g.id}
                className={`cps-g cps-${g.kind}`}
                style={
                  {
                    transformOrigin: `${pctX(g.ox)} ${pctY(g.oy)} ${cqw(g.oz)}`,
                    ...(g.kind === "chamber"
                      ? ({
                          "--seq": `${(PERFUSION_SEQUENCE[g.id] ?? 0) / 3}`,
                          "--vent": `${g.key}`,
                        } as CSSProperties)
                      : {}),
                  } as CSSProperties
                }
              >
                {g.particles.map((p, i) => (
                  <i
                    key={i}
                    style={
                      {
                        left: pctX(p.x),
                        top: pctY(p.y),
                        transform: `translate3d(-50%,-50%,${cqw(p.z)})`,
                        width: `${p.r}px`,
                        height: `${p.r}px`,
                        ...(g.kind === "chamber"
                          ? {
                              background: `color-mix(in oklab, ${RIGHT_HEART}, ${LEFT_HEART} ${(p.t * 100).toFixed(0)}%)`,
                            }
                          : {}),
                      } as CSSProperties
                    }
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* The accessible route to the same information. The construction is
          aria-hidden because its reading order is a stacking order, which means
          nothing out loud; this says what the picture is for. */}
      <figcaption className="sr-only">{site.home.heroSceneLabel}</figcaption>

      <style>{`
.cps-frame {
  position: relative;
  aspect-ratio: var(--cps-w) / var(--cps-h);
  /* The query container. Its own cqw units are not available to itself, which
     is why perspective lives on the stage inside it rather than here. */
  container-type: inline-size;
}
/* Perspective in container units, so depth stays proportional as the card
   grows. A fixed px perspective around percentage-positioned content flattens
   the scene on wide screens and exaggerates it on narrow ones. */
.cps-stage {
  position: absolute;
  inset: 0;
  perspective: 324cqw;
  perspective-origin: 50% 42%;
}
.cps-world {
  position: absolute;
  inset: 0;
  transform-style: preserve-3d;
  transform: rotateX(${RHYTHM.pitchDeg}deg) rotateY(var(--sway));
  will-change: transform;
}
/* ONE silhouette, with a whisper of volume behind it.
   Three outlines at equal weight read as parallel drafting lines, not as
   depth — the first build drew all six shells at 0.42 and the lungs came out
   looking like an architectural elevation. The mid shell carries the edge; the
   anterior and posterior ones are barely there, which is all depth needs. */
.cps-shell {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  overflow: visible;
}
/* fill-opacity, not color-mix against the transparent keyword. That mix
   resolved to opaque black here rather than to a faint coral, and the lungs
   rendered as solid silhouettes. An explicit alpha cannot misresolve. */
.cps-fill {
  fill: var(--color-coral);
  fill-opacity: 0.05;
  stroke: none;
}
.cps-edge {
  fill: none;
  stroke: var(--color-peach);
  stroke-width: 1;
  stroke-linecap: round;
  stroke-opacity: 0.16;
}
.cps-shell-mid .cps-edge {
  stroke-width: 1.5;
  stroke-opacity: 0.5;
}
.cps-shell-mid .cps-fill {
  fill-opacity: 0.09;
}
.cps-g {
  position: absolute;
  inset: 0;
  transform-style: preserve-3d;
  will-change: transform, opacity;
}
.cps-g > i {
  position: absolute;
  display: block;
  border-radius: 50%;
  background: var(--color-coral);
}

/* ── Breathing ──────────────────────────────────────────────────────────── */
/* The whole tree scales about the carina; clusters additionally swell about
   their own centroids, which is recruitment and is what reads as breathing
   rather than as a bellows. */
.cps-dust {
  transform: scale3d(
    calc(1 + ${RHYTHM.breathScaleGlobal} * var(--breath)),
    calc(1 + ${RHYTHM.breathScaleGlobal} * var(--breath)),
    1
  );
}
.cps-cluster {
  transform: scale3d(
    calc(1 + ${RHYTHM.breathScaleCluster} * var(--breath)),
    calc(1 + ${RHYTHM.breathScaleCluster} * var(--breath)),
    1
  );
  opacity: calc(0.72 + ${RHYTHM.breathAlphaCluster} * var(--breath));
}
.cps-cluster > i {
  box-shadow: 0 0 5px 1px color-mix(in oklab, var(--color-coral), transparent 62%);
}
/* Branch dust IS the tree. At 0.62 it vanished under the clusters' glow and
   the airways read as unconnected blobs floating in a wireframe chest. */
.cps-dust > i {
  opacity: 0.9;
  background: color-mix(in oklab, var(--color-coral), var(--color-peach) 30%);
}

/* ── Perfusion ──────────────────────────────────────────────────────────── */
/* Ventricles take the volumetric change; atria hold still. --vent is 1 on a
   ventricle and 0 on an atrium, so one rule covers both without a second
   class. The heart PERFUSES: brightness crosses the chambers in sequence, and
   volume changes by at most ${RHYTHM.maxVolumetricChange * 100}%. A contracting
   organ at 81 bpm reads frantic and slightly grotesque. */
.cps-chamber {
  transform: scale3d(
    calc(1 + (var(--beat) - 1) * var(--vent)),
    calc(1 + (var(--beat) - 1) * var(--vent)),
    1
  );
  /* Distance from the wave to this chamber's place in the sequence, without
     abs(): max(a-b, b-a) is the same value and needs no recent CSS. */
  --dist: max(calc(var(--wave) - var(--seq)), calc(var(--seq) - var(--wave)));
  filter: brightness(calc(1 + 0.55 * max(0, calc(1 - 3 * var(--dist)))));
}
.cps-chamber > i {
  box-shadow: 0 0 8px 2px color-mix(in oklab, var(--color-accent), transparent 40%);
}

@media (prefers-reduced-motion: reduce) {
  /* Held at the composed pose set above. Nothing animates, and the driver
     never mounts, so there is no path by which motion can start. */
  .cps-world {
    will-change: auto;
  }
  .cps-g {
    will-change: auto;
  }
}
`}</style>
    </figure>
  );
}
