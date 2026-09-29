import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { clamp, prog } from "../../lib/anim";
import { annotationStyle, colors, ease, fonts } from "../../theme";

// ─────────────────────────────────────────────────────────────────────────────
// PRPC portable demin plant: simplified process flow, drawn from the project's
// own P&ID (HSE-PRPC-PRO-PID-001C) and plant layout (HSE-PRPC-PRO-LYT-001B).
//
// Treated feed water → MMF booster pump → multimedia filters (×8) → SMBS
// dosing → 1st-pass RO (×3) → RO break tanks (×2) → NaOH dosing → 2nd-pass
// RO (×3) → mixed-bed feed tank → mixed-bed polishers (×5) → resin trap →
// supply pump → demin water supply.
//
// Vendor-neutral on purpose: no contractor or technology-partner names.
// ─────────────────────────────────────────────────────────────────────────────

const Y = 590; // main process line
const X_IN = 110;
const X_OUT = 1810;

const LINE = "rgba(214,238,242,0.92)";
const FAINT = "rgba(214,238,242,0.35)";
const FACE = "rgba(16,48,76,0.92)";

// Water quality along the train: turbid feed → clear → ultrapure.
const WATER = [
  { x: X_IN, c: "#8C9A8E" },
  { x: 470, c: "#7DA7AE" },
  { x: 760, c: "#3FB7C7" },
  { x: 1150, c: "#86DCE6" },
  { x: 1600, c: "#E9FCFF" },
  { x: X_OUT, c: "#FFFFFF" },
];

type Stage = { from: number; to: number; label: string; count?: string };
const STAGES: Stage[] = [
  { from: 250, to: 450, label: "Multimedia filtration", count: "×8" },
  { from: 560, to: 730, label: "1st-pass RO", count: "×3" },
  { from: 770, to: 890, label: "Break tanks", count: "×2" },
  { from: 950, to: 1120, label: "2nd-pass RO", count: "×3" },
  { from: 1330, to: 1570, label: "Mixed-bed polishing", count: "×5" },
];

/** 0→1 as the flow front passes x (with a short draw-on window). */
const useReveal = (head: number) => (x: number, w = 60) => interpolate(head, [x - w, x + 10], [0, 1], clamp);

const Pump: React.FC<{ x: number; a: number; label: string }> = ({ x, a, label }) => (
  <g opacity={a}>
    <circle cx={x} cy={Y} r={17} fill={FACE} stroke={LINE} strokeWidth={1.6} />
    <path d={`M${x - 9} ${Y - 10} L${x + 12} ${Y} L${x - 9} ${Y + 10} Z`} fill="none" stroke={LINE} strokeWidth={1.4} />
    <text x={x} y={Y + 42} textAnchor="middle" fill={FAINT} style={{ ...annotationStyle, fontSize: 12, letterSpacing: "0.14em" } as React.CSSProperties}>
      {label}
    </text>
  </g>
);

/** Vertical pressure vessel: `kind` sets the internals (media layers or mixed resin). */
const Vessel: React.FC<{ x: number; y: number; w: number; h: number; a: number; kind: "mmf" | "mb" }> = ({ x, y, w, h, a, kind }) => (
  <g opacity={a} transform={`translate(0 ${(1 - a) * 8})`}>
    <rect x={x} y={y} width={w} height={h} rx={w / 2.4} fill={FACE} stroke={LINE} strokeWidth={1.5} />
    {kind === "mmf" ? (
      [0.35, 0.55, 0.75].map((f, i) => (
        <line key={i} x1={x + 4} x2={x + w - 4} y1={y + h * f} y2={y + h * f} stroke={LINE} strokeOpacity={0.5} strokeWidth={1} strokeDasharray={i === 1 ? "3 3" : undefined} />
      ))
    ) : (
      <>
        <line x1={x + 5} y1={y + h * 0.28} x2={x + w - 5} y2={y + h * 0.72} stroke={LINE} strokeOpacity={0.55} />
        <line x1={x + w - 5} y1={y + h * 0.28} x2={x + 5} y2={y + h * 0.72} stroke={LINE} strokeOpacity={0.55} />
      </>
    )}
  </g>
);

/** RO skid: a frame of horizontal pressure vessels, with its reject going to drain. */
const RoSkid: React.FC<{ x: number; y: number; w: number; a: number; reject: number }> = ({ x, y, w, a, reject }) => (
  <g opacity={a}>
    <rect x={x} y={y} width={w} height={36} rx={3} fill={FACE} stroke={LINE} strokeWidth={1.5} />
    {[9, 18, 27].map((dy) => (
      <line key={dy} x1={x + 10} x2={x + w - 10} y1={y + dy} y2={y + dy} stroke={colors.aqua} strokeOpacity={0.55} strokeWidth={2} strokeLinecap="round" />
    ))}
    {/* Reject → drain */}
    <g opacity={reject}>
      <line x1={x + w - 16} y1={y + 36} x2={x + w - 16} y2={y + 52} stroke="#8FA0AB" strokeWidth={1.2} strokeDasharray="3 3" />
      <path d={`M${x + w - 20} ${y + 48} L${x + w - 16} ${y + 54} L${x + w - 12} ${y + 48}`} fill="none" stroke="#8FA0AB" strokeWidth={1.2} />
    </g>
  </g>
);

const Tank: React.FC<{ x: number; w: number; h: number; a: number; label?: string }> = ({ x, w, h, a, label }) => {
  const top = Y - h / 2;
  return (
    <g opacity={a} transform={`translate(0 ${(1 - a) * 8})`}>
      <path d={`M${x} ${top + 8} V${top + h} H${x + w} V${top + 8}`} fill={FACE} stroke={LINE} strokeWidth={1.5} />
      <ellipse cx={x + w / 2} cy={top + 8} rx={w / 2} ry={8} fill={FACE} stroke={LINE} strokeWidth={1.5} />
      {/* water level */}
      <line x1={x + 5} x2={x + w - 5} y1={top + h * 0.35} y2={top + h * 0.35} stroke={colors.aqua} strokeOpacity={0.6} strokeWidth={1.2} />
      {label && (
        <text x={x + w / 2} y={top + h + 22} textAnchor="middle" fill={FAINT} style={{ ...annotationStyle, fontSize: 12, letterSpacing: "0.14em" } as React.CSSProperties}>
          {label}
        </text>
      )}
    </g>
  );
};

/** Chemical dosing: a small day tank and a dashed injection line into the main line. */
const Dosing: React.FC<{ x: number; a: number; label: string }> = ({ x, a, label }) => (
  <g opacity={a}>
    <rect x={x - 14} y={Y - 150} width={28} height={34} rx={3} fill={FACE} stroke={colors.seaGreen} strokeWidth={1.3} />
    <line x1={x} y1={Y - 116} x2={x} y2={Y - 6} stroke={colors.seaGreen} strokeWidth={1.2} strokeDasharray="4 4" />
    <path d={`M${x - 4} ${Y - 14} L${x} ${Y - 6} L${x + 4} ${Y - 14}`} fill="none" stroke={colors.seaGreen} strokeWidth={1.2} />
    <text x={x} y={Y - 162} textAnchor="middle" fill={colors.seaGreen} style={{ ...annotationStyle, fontSize: 12, letterSpacing: "0.16em" } as React.CSSProperties}>
      {label}
    </text>
  </g>
);

export const PrpcPfd: React.FC = () => {
  const frame = useCurrentFrame();
  const draw = prog(frame, 6, 78, ease.inOut);
  const head = X_IN + (X_OUT - X_IN) * draw;
  const at = useReveal(head);
  const flowOn = interpolate(frame, [60, 80], [0, 1], clamp);
  const grid = interpolate(frame, [0, 16], [0, 1], clamp);
  const push = interpolate(frame, [0, 160], [1, 1.035]);

  const mmfX = [262, 310, 358, 406];
  const mbX = [1336, 1384, 1432, 1480, 1528];
  const roY = [Y - 62, Y - 18, Y + 26];

  return (
    <AbsoluteFill style={{ background: `radial-gradient(ellipse at 55% 55%, #10304C 0%, ${colors.deepNavy} 58%, #050D16 100%)` }}>
      <AbsoluteFill
        style={{
          opacity: 0.45 * grid,
          backgroundImage: `linear-gradient(rgba(22,177,196,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(22,177,196,0.06) 1px, transparent 1px)`,
          backgroundSize: "40px 40px",
        }}
      />
      <svg width="1920" height="1080" style={{ position: "absolute", inset: 0, transform: `scale(${push})`, transformOrigin: "50% 55%" }}>
        <defs>
          <linearGradient id="pfdWater" x1={X_IN} x2={X_OUT} gradientUnits="userSpaceOnUse">
            {WATER.map((w) => (
              <stop key={w.x} offset={(w.x - X_IN) / (X_OUT - X_IN)} stopColor={w.c} />
            ))}
          </linearGradient>
          <clipPath id="pfdReveal">
            <rect x={0} y={0} width={head} height={1080} />
          </clipPath>
          <filter id="pfdGlow" x="-5%" y="-50%" width="110%" height="200%">
            <feGaussianBlur stdDeviation="5" />
          </filter>
        </defs>

        {/* Stage brackets and labels */}
        {STAGES.map((s) => {
          const a = at(s.from, 80);
          return (
            <g key={s.label} opacity={a}>
              <path d={`M${s.from} ${Y + 108} V${Y + 116} H${s.to} V${Y + 108}`} fill="none" stroke={FAINT} strokeWidth={1} />
              <text x={(s.from + s.to) / 2} y={Y + 142} textAnchor="middle" fill={colors.white} style={{ ...annotationStyle, fontSize: 15, letterSpacing: "0.2em" } as React.CSSProperties}>
                {s.label}
              </text>
              {s.count && (
                <text x={(s.from + s.to) / 2} y={Y - 118} textAnchor="middle" fill={colors.aqua} style={{ fontFamily: fonts.heading, fontWeight: 700, fontSize: 20 } as React.CSSProperties}>
                  {s.count}
                </text>
              )}
            </g>
          );
        })}

        {/* Main process line — drawn as the water travels, colour clearing along the train */}
        <g clipPath="url(#pfdReveal)">
          <line x1={X_IN} y1={Y} x2={X_OUT - 16} y2={Y} stroke="url(#pfdWater)" strokeWidth={12} strokeOpacity={0.35} filter="url(#pfdGlow)" />
          <line x1={X_IN} y1={Y} x2={X_OUT - 16} y2={Y} stroke="url(#pfdWater)" strokeWidth={5} strokeLinecap="round" />
          {/* Headers feeding the parallel units */}
          {[
            [250, 452],
            [548, 742],
            [940, 1132],
            [1324, 1574],
          ].map(([x0, x1]) => (
            <g key={x0}>
              <line x1={x0} y1={Y - 100} x2={x0} y2={Y + 100} stroke="url(#pfdWater)" strokeWidth={3} />
              <line x1={x1} y1={Y - 100} x2={x1} y2={Y + 100} stroke="url(#pfdWater)" strokeWidth={3} />
            </g>
          ))}
          {/* Moving flow along the line once it is running */}
          <line
            x1={X_IN}
            y1={Y}
            x2={X_OUT - 16}
            y2={Y}
            stroke="#FFFFFF"
            strokeOpacity={0.55 * flowOn}
            strokeWidth={2}
            strokeDasharray="10 34"
            strokeDashoffset={-frame * 4}
          />
        </g>
        {/* Flow front */}
        {draw > 0 && draw < 1 && <circle cx={head} cy={Y} r={8} fill="#E6FAFD" opacity={0.9} />}
        <path d={`M${X_OUT - 22} ${Y - 12} L${X_OUT} ${Y} L${X_OUT - 22} ${Y + 12}`} fill="none" stroke="#FFFFFF" strokeWidth={2.5} opacity={at(X_OUT - 30)} />

        {/* Feed */}
        <Pump x={196} a={at(196)} label="Feed pump" />
        {/* Multimedia filters, two banks of four */}
        {mmfX.map((x) => (
          <g key={x}>
            <Vessel x={x} y={Y - 100} w={34} h={78} a={at(x)} kind="mmf" />
            <Vessel x={x} y={Y + 22} w={34} h={78} a={at(x + 20)} kind="mmf" />
          </g>
        ))}
        <Dosing x={500} a={at(500)} label="SMBS" />
        {/* 1st-pass RO */}
        {roY.map((y, i) => (
          <RoSkid key={y} x={570} y={y} w={150} a={at(570 + i * 20)} reject={at(720)} />
        ))}
        {/* Break tanks */}
        <Tank x={778} w={44} h={96} a={at(778)} />
        <Tank x={838} w={44} h={96} a={at(838)} />
        <Dosing x={912} a={at(912)} label="NaOH" />
        {/* 2nd-pass RO */}
        {roY.map((y, i) => (
          <RoSkid key={y} x={962} y={y} w={150} a={at(962 + i * 20)} reject={at(1112)} />
        ))}
        {/* Mixed-bed feed tank and pump */}
        <Tank x={1176} w={60} h={110} a={at(1176)} label="MB feed tank" />
        <Pump x={1284} a={at(1284)} label="MB pump" />
        {/* Mixed-bed polishers */}
        {mbX.map((x) => (
          <Vessel key={x} x={x} y={Y - 48} w={34} h={96} a={at(x)} kind="mb" />
        ))}
        {/* Resin trap and supply pump */}
        <g opacity={at(1612)}>
          <rect x={1600} y={Y - 16} width={26} height={32} fill={FACE} stroke={LINE} strokeWidth={1.4} />
          <line x1={1600} y1={Y + 16} x2={1626} y2={Y - 16} stroke={LINE} strokeWidth={1} />
          <text x={1613} y={Y - 30} textAnchor="middle" fill={FAINT} style={{ ...annotationStyle, fontSize: 12, letterSpacing: "0.14em" } as React.CSSProperties}>
            Resin trap
          </text>
        </g>
        <Pump x={1690} a={at(1690)} label="Supply pump" />
      </svg>

      {/* In / out */}
      <div style={{ ...annotationStyle, fontSize: 13, letterSpacing: "0.16em", lineHeight: 1.5, position: "absolute", left: X_IN - 20, top: Y - 70, color: "rgba(255,255,255,0.7)", opacity: at(X_IN + 40) }}>
        Treated
        <br />
        water in
      </div>
      <div
        style={{
          ...annotationStyle,
          fontSize: 15,
          letterSpacing: "0.18em",
          position: "absolute",
          right: 1920 - X_OUT,
          top: Y - 76,
          lineHeight: 1.5,
          textAlign: "right",
          color: colors.white,
          opacity: at(X_OUT - 20),
        }}
      >
        Demin water
        <br />
        supply
      </div>
    </AbsoluteFill>
  );
};
