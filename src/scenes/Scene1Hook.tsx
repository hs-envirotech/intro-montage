import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { Ripple } from "../components/Ripple";
import { colors, ease } from "../theme";

// Beat sheet (frames @30fps, relative to scene start)
const DROP_APPEAR = 18;
const DROP_FALL_START = 30;
const IMPACT = 66;
const REBOUND_END = 100;
const SURFACE_Y = 660;
const CX = 960;

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

const DROP_PATH = "M0,-44 C9,-28 24,-10 24,8 A24,24 0 1 1 -24,8 C-24,-10 -9,-28 0,-44 Z";

const Droplet: React.FC<{ x: number; y: number; scale: number; stretch: number; opacity: number }> = ({
  x,
  y,
  scale,
  stretch,
  opacity,
}) => (
  <g transform={`translate(${x} ${y}) scale(${scale / Math.sqrt(stretch)} ${scale * stretch})`} opacity={opacity}>
    <path d={DROP_PATH} fill="url(#dropFill)" filter="url(#dropGlow)" />
    <ellipse cx={-8} cy={2} rx={5} ry={9} fill="white" opacity={0.7} />
  </g>
);

export const Scene1Hook: React.FC = () => {
  const frame = useCurrentFrame();

  // Main droplet: fades in, hangs, then falls under gravity (ease-in).
  const fall = interpolate(frame, [DROP_FALL_START, IMPACT], [0, 1], { ...clamp, easing: ease.in });
  const dropY = interpolate(fall, [0, 1], [230, SURFACE_Y]);
  const dropOpacity =
    interpolate(frame, [DROP_APPEAR, DROP_APPEAR + 12], [0, 1], clamp) * (frame < IMPACT ? 1 : 0);
  const stretch = 1 + fall * 0.35;

  // Small rebound droplet (the jet that follows an impact).
  const rb = interpolate(frame, [IMPACT + 4, REBOUND_END], [0, 1], clamp);
  const rbY = SURFACE_Y - Math.sin(rb * Math.PI) * 130;
  const rbOpacity = frame > IMPACT + 4 && frame < REBOUND_END ? 1 : 0;

  // Light bloom on the water surface at impact.
  const bloom = interpolate(frame, [IMPACT - 2, IMPACT + 8, IMPACT + 70], [0, 1, 0], clamp);

  // Surface reference line fades up just before impact, like light catching water.
  const surface = interpolate(frame, [DROP_FALL_START, IMPACT, 170, 180], [0, 0.35, 0.25, 0], clamp);

  // Whole scene eases out to black on the last beat.
  const out = interpolate(frame, [165, 180], [1, 0], clamp);

  return (
    <AbsoluteFill style={{ backgroundColor: colors.black }}>
      <AbsoluteFill style={{ opacity: out }}>
        {/* Surface glow */}
        <AbsoluteFill
          style={{
            opacity: bloom,
            background: `radial-gradient(ellipse 520px 130px at ${CX}px ${SURFACE_Y}px, ${colors.aqua}88, transparent 70%)`,
          }}
        />
        <AbsoluteFill
          style={{
            opacity: surface,
            background: `radial-gradient(ellipse 900px 60px at ${CX}px ${SURFACE_Y}px, ${colors.aqua}40, transparent 70%)`,
          }}
        />

        <Ripple t={frame - IMPACT} cx={CX} cy={SURFACE_Y} squash={0.26} rings={5} spacing={11} life={120} maxRadius={900} />
        <Ripple
          t={frame - REBOUND_END}
          cx={CX}
          cy={SURFACE_Y}
          squash={0.26}
          rings={2}
          spacing={12}
          life={80}
          maxRadius={420}
          strokeWidth={2}
          opacity={0.6}
        />

        <svg width="100%" height="100%" viewBox="0 0 1920 1080" style={{ position: "absolute", inset: 0 }}>
          <defs>
            <radialGradient id="dropFill" cx="40%" cy="60%" r="65%">
              <stop offset="0%" stopColor="#E6FBFD" />
              <stop offset="45%" stopColor={colors.aqua} />
              <stop offset="100%" stopColor={colors.navy} />
            </radialGradient>
            <filter id="dropGlow" x="-200%" y="-200%" width="500%" height="500%">
              <feGaussianBlur stdDeviation="10" result="b" />
              <feMerge>
                <feMergeNode in="b" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <Droplet x={CX} y={dropY} scale={1} stretch={stretch} opacity={dropOpacity} />
          <Droplet x={CX} y={rbY} scale={0.38} stretch={1.15} opacity={rbOpacity} />
        </svg>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
