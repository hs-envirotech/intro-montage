import React from "react";
import { Easing, interpolate } from "remotion";
import { colors, ease } from "../theme";

type RippleProps = {
  /** Frames since the droplet hit the surface. Negative = nothing shown. */
  t: number;
  cx: number;
  cy: number;
  /** Vertical squash: 1 = top-down circles, ~0.3 = water surface in perspective. */
  squash?: number;
  rings?: number;
  /** Frames between successive rings. */
  spacing?: number;
  /** Frames for one ring to fully expand. */
  life?: number;
  maxRadius?: number;
  color?: string;
  strokeWidth?: number;
  glow?: boolean;
  opacity?: number;
};

/** Concentric expanding rings — the brand's water ripple, generated in SVG. */
export const Ripple: React.FC<RippleProps> = ({
  t,
  cx,
  cy,
  squash = 1,
  rings = 4,
  spacing = 12,
  life = 110,
  maxRadius = 700,
  color = colors.aqua,
  strokeWidth = 3,
  glow = true,
  opacity = 1,
}) => {
  const id = `ripple-glow-${cx}-${cy}`;
  return (
    <svg width="100%" height="100%" viewBox="0 0 1920 1080" style={{ position: "absolute", inset: 0 }}>
      <defs>
        <filter id={id} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="6" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      {Array.from({ length: rings }).map((_, i) => {
        const local = t - i * spacing;
        if (local < 0 || local > life) return null;
        const p = local / life;
        const r = interpolate(p, [0, 1], [8, maxRadius * (1 - i * 0.12)], { easing: Easing.bezier(0.25, 0.6, 0.35, 1) });
        const a =
          interpolate(p, [0, 0.08, 1], [0, 1, 0], { easing: ease.standard }) * (1 - i * 0.18) * opacity;
        const w = interpolate(p, [0, 1], [strokeWidth * 1.6, strokeWidth * 0.5]);
        return (
          <ellipse
            key={i}
            cx={cx}
            cy={cy}
            rx={r}
            ry={r * squash}
            fill="none"
            stroke={color}
            strokeWidth={w}
            opacity={a}
            filter={glow ? `url(#${id})` : undefined}
          />
        );
      })}
    </svg>
  );
};
