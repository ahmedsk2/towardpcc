/**
 * The night → porcelain transition (ADR-design-direction §5.3): the boundary of
 * the hero's night band is itself the respiratory waveform, drawn once as a
 * porcelain wave rising over the night with a faint rose crest tracing it. This
 * is the single "design moment" of the dark→light handoff. Purely decorative.
 */

const VW = 1440;
const VH = 96;
const BASE = 48; // mean height of the wave crest within the viewbox
const AMP = 20;
const PERIODS = 2.4;

function crest(samples = 120): { d: string; fill: string } {
  const pts: string[] = [];
  for (let i = 0; i <= samples; i++) {
    const t = i / samples;
    const x = t * VW;
    const y = BASE - Math.sin(t * PERIODS * Math.PI * 2) * AMP;
    pts.push(`${x.toFixed(1)},${y.toFixed(1)}`);
  }
  const line = `M ${pts.join(" L ")}`;
  // Fill: the crest, then down and around to close over the bottom (porcelain).
  const fill = `${line} L ${VW},${VH} L 0,${VH} Z`;
  return { d: line, fill };
}

export function WaveformEdge({ className }: { className?: string }) {
  const { d, fill } = crest();
  return (
    <svg
      viewBox={`0 0 ${VW} ${VH}`}
      preserveAspectRatio="none"
      aria-hidden="true"
      className={className}
    >
      <path d={fill} fill="var(--color-surface-page)" />
      <path
        d={d}
        fill="none"
        stroke="var(--color-coral)"
        strokeOpacity="0.4"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
