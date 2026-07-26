"use client";

/* eslint-disable react-hooks/immutability -- R3F scene code is imperative by
   design: useFrame mutates buffer geometry every frame. The React Compiler
   purity model does not describe WebGL render loops, so the rule is off for
   this one scene file. */

import { Canvas, useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

/**
 * The signature hero scene (ADR-design-direction §5.3): the poster's respiratory
 * waveform brought to life in 3D — layered rose lines that slowly *breathe*
 * (a respiratory-rhythm amplitude envelope, never a cardiac trace) and lean
 * toward the pointer. Lazy-loaded behind the static poster (see hero-scene.tsx),
 * paused off-screen, and never shown under reduced motion.
 */

// Mirrors --color-coral (packages/ui/src/tokens.css); a WebGL material needs a
// literal, not a CSS variable. 7.11:1 on the night band.
const ROSE = new THREE.Color("#ff7a6b");
const SAMPLES = 128;
const SPAN = 11; // world width
const LINES = 5;
const PERIODS = 2.15; // matches the static poster

type WaveLine = {
  line: THREE.Line;
  geom: THREE.BufferGeometry;
  positions: Float32Array;
  i: number;
};

function buildLines(samples: number): WaveLine[] {
  return Array.from({ length: LINES }, (_, i) => {
    const positions = new Float32Array((samples + 1) * 3);
    const geom = new THREE.BufferGeometry();
    geom.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const material = new THREE.LineBasicMaterial({
      color: ROSE,
      transparent: true,
      opacity: i === 0 ? 0.95 : Math.max(0.08, 0.34 - i * 0.06),
    });
    return { line: new THREE.Line(geom, material), geom, positions, i };
  });
}

// THREE.Line objects rendered via <primitive> — the <line> JSX intrinsic
// collides with SVG's line in React 19's typings. Lines are memoized (quality
// is fixed at mount, so they build once); useFrame then mutates their geometry
// each frame, which is why react-hooks/immutability is disabled for this file.
function WaveLines({ quality }: { quality: number }) {
  const group = useRef<THREE.Group>(null);
  const samples = Math.round(SAMPLES * quality);
  const lines = useMemo(() => buildLines(samples), [samples]);

  useEffect(
    () => () => {
      for (const { line } of lines) {
        line.geometry.dispose();
        (line.material as THREE.Material).dispose();
      }
    },
    [lines],
  );

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    // Respiratory envelope: a calm ~0.5 Hz breath modulating amplitude.
    const breath = 0.72 + 0.28 * Math.sin(t * 0.5);
    for (const { geom, positions, i } of lines) {
      const phase = i * 0.55;
      const amp = (1 - i * 0.12) * 1.5;
      const z = -i * 0.7;
      for (let s = 0; s <= samples; s++) {
        const u = s / samples;
        const x = (u - 0.5) * SPAN;
        const y = Math.sin(u * Math.PI * 2 * PERIODS + phase + t * 0.6) * amp * breath;
        positions[s * 3] = x;
        positions[s * 3 + 1] = y;
        positions[s * 3 + 2] = z;
      }
      geom.attributes.position!.needsUpdate = true;
    }
    if (group.current) {
      // Gentle lean toward the pointer (screen-space, [-1,1]).
      group.current.rotation.y = THREE.MathUtils.lerp(
        group.current.rotation.y,
        state.pointer.x * 0.28,
        0.05,
      );
      group.current.rotation.x = THREE.MathUtils.lerp(
        group.current.rotation.x,
        -state.pointer.y * 0.16,
        0.05,
      );
    }
  });

  return (
    <group ref={group}>
      {lines.map(({ line, i }) => (
        <primitive key={i} object={line} />
      ))}
    </group>
  );
}

export function WaveformCanvas({ active }: { active: boolean }) {
  // Step down sampling on weak GPUs (integrated / low pixel-ratio devices).
  const quality = useMemo(() => {
    if (typeof window === "undefined") return 1;
    const dpr = window.devicePixelRatio || 1;
    const cores = navigator.hardwareConcurrency || 4;
    return cores <= 4 || dpr < 1.5 ? 0.6 : 1;
  }, []);

  return (
    // Decorative: this animation duplicates the labelled poster (HeroWaveform,
    // role="img"), so it is hidden from assistive tech (WCAG 1.1.1). R3F spreads
    // unknown props onto its container <div>, so aria-hidden lands on the wrapper.
    <Canvas
      aria-hidden="true"
      camera={{ position: [0, 0, 8.5], fov: 48 }}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      dpr={[1, 2]}
      frameloop={active ? "always" : "never"}
      style={{ background: "transparent" }}
    >
      <WaveLines quality={quality} />
    </Canvas>
  );
}
