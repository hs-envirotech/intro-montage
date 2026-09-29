import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { clamp, prog, rand } from "../../lib/anim";
import { ProcessLabel, Vignette } from "../../components/Typography";
import { COPY } from "../../config";
import { annotationStyle, colors, ease } from "../../theme";

// 51 frames in scene + 10 frames running on under the next scene.
export const RECLAMATION_DURATION = 61;

const Y = 560;
const X0 = 220;
const X1 = 1700;

// Each stage is visibly cleaner than the last — but treated water is never
// shown as "perfect": the final stage stays a natural, slightly tinted clear.
const STAGES = [
  { x: 400, label: "Raw water", water: "#6B6550", turbidity: 1 },
  { x: 800, label: "Treatment", water: "#56706F", turbidity: 0.55 },
  { x: 1200, label: "Purified water", water: "#5F9BA4", turbidity: 0.12 },
  { x: 1580, label: "Reuse", water: "#79B6BF", turbidity: 0.05 },
];

const Symbol: React.FC<{ i: number; x: number; stroke: string }> = ({ i, x, stroke }) => {
  const common = { fill: "none", stroke, strokeWidth: 2 };
  if (i === 0)
    return (
      <g>
        <path d={`M${x - 60} ${Y - 90} V${Y + 50} H${x + 60} V${Y - 90}`} {...common} />
        <line x1={x - 60} y1={Y - 40} x2={x + 60} y2={Y - 40} stroke={stroke} strokeWidth={1} strokeDasharray="6 6" />
      </g>
    );
  if (i === 1)
    return (
      <g>
        <circle cx={x} cy={Y} r={66} {...common} />
        <circle cx={x} cy={Y} r={22} {...common} />
        <line x1={x - 66} y1={Y} x2={x - 22} y2={Y} stroke={stroke} strokeWidth={1} />
      </g>
    );
  if (i === 2)
    return (
      <g>
        <rect x={x - 80} y={Y - 42} width={160} height={84} {...common} />
        <line x1={x - 80} y1={Y + 42} x2={x + 80} y2={Y - 42} stroke={stroke} strokeWidth={2} />
      </g>
    );
  return (
    <g>
      <path d={`M${x - 36} ${Y - 26} L${x} ${Y} L${x - 36} ${Y + 26} Z M${x + 36} ${Y - 26} L${x} ${Y} L${x + 36} ${Y + 26} Z`} {...common} />
      <line x1={x} y1={Y} x2={x} y2={Y - 48} stroke={stroke} strokeWidth={2} />
      <line x1={x - 16} y1={Y - 48} x2={x + 16} y2={Y - 48} stroke={stroke} strokeWidth={2} />
    </g>
  );
};

/** Sample vial: the colour and suspended particles show the water quality at each stage. */
const Vial: React.FC<{ x: number; water: string; turbidity: number; a: number }> = ({ x, water, turbidity, a }) => {
  const top = Y + 130;
  return (
    <g opacity={a}>
      <rect x={x - 22} y={top} width={44} height={110} rx={10} fill="rgba(255,255,255,0.03)" stroke="rgba(255,255,255,0.5)" strokeWidth={1.2} />
      <rect x={x - 19} y={top + 26} width={38} height={81} rx={8} fill={water} opacity={0.85} />
      {Array.from({ length: Math.round(28 * turbidity) }).map((_, k) => (
        <circle key={k} cx={x + rand(`vx${x}${k}`, -15, 15)} cy={top + rand(`vy${x}${k}`, 32, 100)} r={rand(`vr${x}${k}`, 0.8, 2.2)} fill="#C9BFA0" opacity={0.7} />
      ))}
    </g>
  );
};

export const Reclamation: React.FC = () => {
  const frame = useCurrentFrame();
  const draw = prog(frame, 2, 34, ease.inOut);
  const head = X0 + (X1 - X0) * draw;
  const gridA = interpolate(frame, [0, 12], [0, 1], clamp);

  return (
    <AbsoluteFill style={{ background: `radial-gradient(ellipse at 50% 55%, #0F2C47 0%, ${colors.deepNavy} 60%, #060F1A 100%)` }}>
      <AbsoluteFill
        style={{
          opacity: 0.5 * gridA,
          backgroundImage: `linear-gradient(rgba(22,177,196,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(22,177,196,0.07) 1px, transparent 1px)`,
          backgroundSize: "40px 40px",
        }}
      />
      <svg width="1920" height="1080" style={{ position: "absolute", inset: 0 }}>
        <defs>
          <linearGradient id="waterLine" x1={X0} x2={X1} gradientUnits="userSpaceOnUse">
            {STAGES.map((s) => (
              <stop key={s.x} offset={(s.x - X0) / (X1 - X0)} stopColor={s.water} />
            ))}
          </linearGradient>
          <clipPath id="reveal">
            <rect x={0} y={0} width={head} height={1080} />
          </clipPath>
        </defs>
        <g clipPath="url(#reveal)">
          <line x1={X0} y1={Y} x2={X1} y2={Y} stroke="url(#waterLine)" strokeWidth={10} strokeLinecap="round" />
          <line x1={X0} y1={Y} x2={X1} y2={Y} stroke="rgba(255,255,255,0.25)" strokeWidth={1} />
          {/* Flow direction arrows between stages */}
          {STAGES.slice(0, -1).map((s, i) => {
            const mx = (s.x + STAGES[i + 1].x) / 2;
            return <path key={i} d={`M${mx - 10} ${Y - 22} L${mx + 6} ${Y - 14} L${mx - 10} ${Y - 6}`} fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth={1.5} />;
          })}
        </g>
        {STAGES.map((s, i) => {
          const a = interpolate(head, [s.x - 120, s.x], [0, 1], clamp);
          return (
            <g key={s.x} opacity={a}>
              <rect x={s.x - 100} y={Y - 110} width={200} height={220} fill={colors.deepNavy} opacity={0.9} />
              <Symbol i={i} x={s.x} stroke="rgba(230,245,248,0.9)" />
              <Vial x={s.x} water={s.water} turbidity={s.turbidity} a={a} />
            </g>
          );
        })}
        {/* Travelling pulse at the flow front */}
        <circle cx={head} cy={Y} r={7} fill="#DFF5F8" opacity={draw < 1 ? 0.9 : 0} />
      </svg>
      {STAGES.map((s) => {
        const a = interpolate(head, [s.x - 60, s.x + 20], [0, 1], clamp);
        return (
          <div key={s.x} style={{ ...annotationStyle, fontSize: 18, position: "absolute", left: s.x - 150, width: 300, top: Y - 160, textAlign: "center", color: colors.white, opacity: a }}>
            {s.label}
          </div>
        );
      })}
      <ProcessLabel long={COPY.technology[3].long} frame={frame} start={2} end={RECLAMATION_DURATION + 30} />
      <Vignette />
    </AbsoluteFill>
  );
};
