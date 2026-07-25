import { site } from "@/content/site";

/**
 * The signature: a calm, breathing RESPIRATORY waveform (never a cardiac trace
 * that could flatline — ADR-design-direction §5.3 / self-critique #3). Rendered
 * as layered sine lines glowing in rose on the night canvas, with sparse
 * particle nodes along the leading crest. This static SVG is both the hero's
 * always-present poster and the reduced-motion / no-WebGL fallback; the P4 R3F
 * scene animates the same motif. Decorative only — labelled for assistive tech,
 * hidden from the reading order elsewhere.
 */

const W = 640;
const H = 460;

/** A respiratory sine as a dense polyline path (round joins read as smooth). */
function sinePath(opts: {
  amp: number;
  periods: number;
  phase: number;
  yOffset: number;
  samples?: number;
}): string {
  const { amp, periods, phase, yOffset, samples = 96 } = opts;
  const pts: string[] = [];
  for (let i = 0; i <= samples; i++) {
    const t = i / samples;
    const x = t * W;
    // Respiratory rhythm: a gentle, rounded sinusoid (calm, continuous).
    const y = yOffset + Math.sin(t * periods * Math.PI * 2 + phase) * amp;
    pts.push(`${x.toFixed(1)},${y.toFixed(1)}`);
  }
  return `M ${pts.join(" L ")}`;
}

/** Evenly spaced nodes riding the leading line's crest (the "particles"). */
function crestNodes(opts: { amp: number; periods: number; phase: number; yOffset: number }) {
  const { amp, periods, phase, yOffset } = opts;
  const nodes: { x: number; y: number }[] = [];
  const count = 7;
  for (let i = 0; i < count; i++) {
    const t = (i + 0.5) / count;
    const x = t * W;
    const y = yOffset + Math.sin(t * periods * Math.PI * 2 + phase) * amp;
    nodes.push({ x, y });
  }
  return nodes;
}

// Layered echoes behind one bright leading line — depth + the "breathing" feel.
const LEAD = { amp: 46, periods: 2.15, phase: 0, yOffset: H * 0.5 };
const ECHOES = [
  { amp: 40, periods: 2.15, phase: 0.55, yOffset: H * 0.5 + 26, opacity: 0.28 },
  { amp: 52, periods: 2.15, phase: -0.5, yOffset: H * 0.5 - 22, opacity: 0.2 },
  { amp: 34, periods: 2.15, phase: 1.1, yOffset: H * 0.5 + 54, opacity: 0.12 },
  { amp: 58, periods: 2.15, phase: -1.05, yOffset: H * 0.5 - 48, opacity: 0.1 },
];

export function HeroWaveform({ className }: { className?: string }) {
  const nodes = crestNodes(LEAD);
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className={className}
      role="img"
      aria-label={site.home.heroSceneLabel}
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        <radialGradient id="hw-glow" cx="50%" cy="50%" r="60%">
          <stop offset="0%" stopColor="var(--color-accent-bright)" stopOpacity="0.18" />
          <stop offset="70%" stopColor="var(--color-accent-bright)" stopOpacity="0" />
        </radialGradient>
        <filter id="hw-soft" x="-20%" y="-40%" width="140%" height="180%">
          <feGaussianBlur stdDeviation="3" />
        </filter>
      </defs>

      {/* Soft breath of light behind the trace */}
      <rect x="0" y={H * 0.18} width={W} height={H * 0.64} fill="url(#hw-glow)" />

      {/* Faint echo lines — the breathing depth */}
      {ECHOES.map((e, i) => (
        <path
          key={i}
          d={sinePath(e)}
          fill="none"
          stroke="var(--color-accent-bright)"
          strokeWidth={i < 2 ? 1.5 : 1}
          strokeOpacity={e.opacity}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}

      {/* Leading line: a soft-blurred glow pass under a crisp pass */}
      <path
        d={sinePath(LEAD)}
        fill="none"
        stroke="var(--color-accent-bright)"
        strokeWidth="6"
        strokeOpacity="0.35"
        strokeLinecap="round"
        strokeLinejoin="round"
        filter="url(#hw-soft)"
      />
      <path
        d={sinePath(LEAD)}
        fill="none"
        stroke="var(--color-accent-bright)"
        strokeWidth="2.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Particle nodes on the crest */}
      {nodes.map((n, i) => (
        <circle
          key={i}
          cx={n.x}
          cy={n.y}
          r={i === 3 ? 3.5 : 2.25}
          fill="var(--color-accent-bright)"
        >
          {/* static poster: no animation here; the R3F scene animates */}
        </circle>
      ))}
    </svg>
  );
}
