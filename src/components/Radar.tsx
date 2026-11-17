// Hexagon (or any polygon) radar chart. One shape, plus an optional "compare" shape drawn
// under it (e.g. your scores now vs. with a race). Shapes morph smoothly (CSS `d` transition).
// Safari has no CSS `d`, so each shape also carries the plain `d` attribute (drawn, just not animated).
import type { CSSProperties, ReactNode } from "react";

export interface RadarProps {
  axes: string[];
  values: number[];
  /** Drawn underneath, e.g. the current values while `values` is a preview. */
  compare?: number[];
  min?: number;
  max: number;
  color: string;
  compareColor?: string;
  width?: number;
  height?: number;
  /** Content placed at each axis tip (value + label). */
  label: (i: number) => ReactNode;
  ariaLabel: string;
}

export function Radar({ axes, values, compare, min = 0, max, color, compareColor = "var(--accent)", width = 400, height = 320, label, ariaLabel }: RadarProps) {
  const n = axes.length;
  const cx = width / 2;
  const cy = height / 2;
  const R = Math.min(width, height) / 2 - 46;
  // Flat-top hexagon: first axis at the top-left, clockwise.
  const ang = axes.map((_, i) => ((-120 + (360 / n) * i) * Math.PI) / 180);
  const pt = (r: number, i: number) => [cx + r * Math.cos(ang[i]), cy + r * Math.sin(ang[i])];
  const path = (radius: (i: number) => number) => "M" + axes.map((_, i) => pt(radius(i), i).map((x) => x.toFixed(1)).join(",")).join(" L") + " Z";
  const r = (v: number) => 10 + ((Math.max(min, Math.min(max, v)) - min) / (max - min)) * (R - 10);
  const ring = (f: number) => path(() => R * f);
  const shape = (vals: number[], c: string, glow: boolean): CSSProperties =>
    ({ d: `path('${path((i) => r(vals[i]))}')`, fill: `color-mix(in srgb, ${c} 18%, transparent)`, stroke: c, filter: glow ? `drop-shadow(0 0 8px color-mix(in srgb, ${c} 55%, transparent))` : undefined }) as CSSProperties;

  return (
    <div className="radar" style={{ width, height }} role="img" aria-label={ariaLabel}>
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
        {[1, 0.75, 0.5, 0.25].map((f) => (
          <path key={f} d={ring(f)} className="radar-ring" />
        ))}
        {compare && <path className="radar-shape" d={path((i) => r(compare[i]))} style={shape(compare, compareColor, false)} strokeWidth={2.5} strokeLinejoin="round" />}
        <path className="radar-shape" d={path((i) => r(values[i]))} style={shape(values, color, true)} strokeWidth={3.5} strokeLinejoin="round" />
      </svg>
      {axes.map((a, i) => {
        const [x, y] = pt(R + 30, i);
        return (
          <div key={a} className="radar-label" style={{ left: x, top: y }}>
            {label(i)}
          </div>
        );
      })}
    </div>
  );
}
