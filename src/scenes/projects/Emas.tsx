import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { PROJECTS, SHOTS } from "../../config";
import { clamp, prog, rand } from "../../lib/anim";
import { FootageSlot } from "../../components/Footage";
import { Vignette } from "../../components/Typography";
import { IllustrativeTag, ProjectLockup, lineStyle } from "./ProjectLockup";
import { annotationStyle, colors, ease, fonts } from "../../theme";

export const EMAS_DURATION = 160;

// Project management & coordination, not construction: an abstract site plan
// with interface links, a programme and document control. Generic by design —
// no invented facility, dates, values or scope.
const HUB = { x: 1240, y: 480 };
const NODES = [
  { x: 1000, y: 290, label: "Engineering interfaces" },
  { x: 1470, y: 280, label: "Programme management" },
  { x: 1450, y: 680, label: "Technical documentation" },
  { x: 990, y: 690, label: "Site coordination" },
];

const SitePlan: React.FC<{ p: number }> = ({ p }) => (
  <g opacity={0.35 * p} stroke="rgba(200,230,236,0.7)" fill="none" strokeWidth={1.2}>
    {Array.from({ length: 14 }).map((_, i) => {
      const x = 760 + rand(`bx${i}`, 0, 1100);
      const y = 160 + rand(`by${i}`, 0, 700);
      const w = rand(`bw${i}`, 60, 180);
      const h = rand(`bh${i}`, 40, 120);
      return <rect key={i} x={x} y={y} width={w} height={h} rx={4} pathLength={1} strokeDasharray={1} strokeDashoffset={1 - p} />;
    })}
    {[260, 540, 820].map((y) => (
      <line key={y} x1={700} y1={y} x2={1900} y2={y} strokeDasharray="10 8" strokeOpacity={0.6} />
    ))}
    {[900, 1250, 1600].map((x) => (
      <line key={x} x1={x} y1={120} x2={x} y2={960} strokeDasharray="10 8" strokeOpacity={0.6} />
    ))}
  </g>
);

const Programme: React.FC<{ frame: number }> = ({ frame }) => {
  const a = interpolate(frame, [40, 56], [0, 1], clamp);
  return (
    <g opacity={a} transform="translate(1060 830)">
      <text x={0} y={-16} fill={colors.aqua} style={{ ...annotationStyle, fontSize: 13 } as React.CSSProperties}>
        PROGRAMME
      </text>
      {Array.from({ length: 5 }).map((_, i) => {
        const start = rand(`gs${i}`, 0, 140);
        const len = rand(`gl${i}`, 80, 200);
        const grow = prog(frame, 46 + i * 6, 90 + i * 6, ease.out);
        return (
          <g key={i}>
            <line x1={0} y1={i * 18 + 6} x2={360} y2={i * 18 + 6} stroke="rgba(255,255,255,0.08)" />
            <rect x={start} y={i * 18} width={len * grow} height={10} rx={2} fill={i === 2 ? colors.seaGreen : "rgba(22,177,196,0.55)"} />
          </g>
        );
      })}
    </g>
  );
};

const Coordination: React.FC = () => {
  const frame = useCurrentFrame();
  const plan = prog(frame, 0, 40, ease.inOut);
  const push = interpolate(frame, [0, EMAS_DURATION], [1.04, 1]);
  return (
    <AbsoluteFill style={{ background: `radial-gradient(ellipse at 66% 50%, #0F2D48 0%, ${colors.deepNavy} 55%, #050D16 100%)` }}>
      <svg width="1920" height="1080" style={{ position: "absolute", inset: 0, transform: `scale(${push})`, transformOrigin: "66% 50%" }}>
        <SitePlan p={plan} />
        {NODES.map((n, i) => {
          const link = prog(frame, 22 + i * 8, 52 + i * 8, ease.inOut);
          // Pulses travelling hub ↔ node: information flowing both ways.
          const t = ((frame - 50 - i * 9) % 45) / 45;
          const px = HUB.x + (n.x - HUB.x) * t;
          const py = HUB.y + (n.y - HUB.y) * t;
          return (
            <g key={n.label}>
              <line x1={HUB.x} y1={HUB.y} x2={HUB.x + (n.x - HUB.x) * link} y2={HUB.y + (n.y - HUB.y) * link} stroke={colors.aqua} strokeWidth={1.5} strokeOpacity={0.8} />
              {frame > 52 + i * 8 && <circle cx={px} cy={py} r={3.5} fill="#DDF6F9" opacity={0.8} />}
              <circle cx={n.x} cy={n.y} r={14} fill={colors.deepNavy} stroke={colors.aqua} strokeWidth={1.5} opacity={link} />
              <circle cx={n.x} cy={n.y} r={4} fill={colors.aqua} opacity={link} />
            </g>
          );
        })}
        <circle cx={HUB.x} cy={HUB.y} r={34} fill={colors.deepNavy} stroke={colors.seaGreen} strokeWidth={2} opacity={interpolate(frame, [16, 30], [0, 1], clamp)} />
        <Programme frame={frame} />
      </svg>
      {NODES.map((n, i) => {
        const a = interpolate(frame, [48 + i * 8, 62 + i * 8], [0, 1], clamp);
        const right = n.x > HUB.x;
        return (
          <div
            key={n.label}
            style={{
              ...annotationStyle,
              fontSize: 15,
              position: "absolute",
              top: n.y - 9,
              left: right ? n.x + 26 : undefined,
              right: right ? undefined : 1920 - n.x + 26,
              color: "rgba(255,255,255,0.85)",
              opacity: a,
              whiteSpace: "nowrap",
            }}
          >
            {n.label}
          </div>
        );
      })}
      <div
        style={{
          position: "absolute",
          left: HUB.x - 40,
          top: HUB.y - 12,
          width: 80,
          textAlign: "center",
          fontFamily: fonts.heading,
          fontWeight: 700,
          fontSize: 20,
          color: colors.white,
          opacity: interpolate(frame, [24, 36], [0, 1], clamp),
        }}
      >
        PMC
      </div>
    </AbsoluteFill>
  );
};

export const Emas: React.FC = () => {
  const frame = useCurrentFrame();
  const p = PROJECTS.emas;
  return (
    <AbsoluteFill style={{ backgroundColor: colors.deepNavy }}>
      <FootageSlot
        shot={SHOTS.emas}
        fallback={
          <>
            <Coordination />
            <IllustrativeTag text="Illustrative diagram" />
          </>
        }
      />
      <AbsoluteFill style={{ background: "linear-gradient(90deg, rgba(5,13,22,0.85) 0%, rgba(5,13,22,0.3) 42%, transparent 65%)" }} />
      <ProjectLockup
        frame={frame}
        start={12}
        eyebrow={p.eyebrow}
        name={p.name}
        lines={[
          <div
            key="role"
            style={{
              display: "inline-block",
              padding: "10px 22px",
              border: `2px solid ${colors.seaGreen}`,
              borderRadius: 6,
              fontFamily: fonts.heading,
              fontWeight: 700,
              fontSize: 56,
              letterSpacing: "0.12em",
              color: colors.white,
            }}
          >
            {p.role}
          </div>,
          <div key="client" style={lineStyle}>{p.client}</div>,
        ]}
      />
      <Vignette />
    </AbsoluteFill>
  );
};
