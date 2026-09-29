import React from "react";
import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame } from "remotion";
import { clamp, lerp, prog, rand } from "../lib/anim";
import { COPY } from "../config";
import { annotationStyle, colors, ease } from "../theme";

// Everything connects, pulls back to maximum scale, falls into darkness —
// then one controlled aqua light traces the official logo; a subtle slogan follows.
const NETWORK = [0, 44] as const;
const CONVERGE = [34, 56] as const;
const TRACE = [62, 104] as const;
const FILL = [96, 116] as const;
const FADE = [168, 180] as const;

const C = { x: 960, y: 540 };
// Hubs = the systems seen in the film (treatment, desalination, industry,
// campus, municipal…), each with its own local network, all interconnected.
type Node = { x: number; y: number; size: number };
const HUBS: Node[] = [
  { x: C.x, y: C.y, size: 7 },
  ...Array.from({ length: 6 }).map((_, i) => {
    const a = (i / 6) * Math.PI * 2 + 0.3;
    return { x: C.x + Math.cos(a) * 470, y: C.y + Math.sin(a) * 260, size: 6 };
  }),
  ...Array.from({ length: 8 }).map((_, i) => {
    const a = (i / 8) * Math.PI * 2 + 0.1;
    return { x: C.x + Math.cos(a) * 1050, y: C.y + Math.sin(a) * 600, size: 5 };
  }),
];
const SATS: (Node & { hub: number })[] = HUBS.flatMap((h, hi) =>
  Array.from({ length: hi === 0 ? 0 : 7 }).map((_, k) => ({
    x: h.x + rand(`sx${hi}-${k}`, -95, 95),
    y: h.y + rand(`sy${hi}-${k}`, -60, 60),
    size: 2,
    hub: hi,
  })),
);
const NODES: Node[] = [...HUBS, ...SATS];
const EDGES: { a: number; b: number; trunk: boolean }[] = [
  ...[1, 2, 3, 4, 5, 6].flatMap((i) => [
    { a: 0, b: i, trunk: true },
    { a: i, b: i === 6 ? 1 : i + 1, trunk: true },
  ]),
  ...[7, 8, 9, 10, 11, 12, 13, 14].flatMap((i) => [
    { a: i, b: 1 + ((i - 7) % 6), trunk: true },
    { a: i, b: i === 14 ? 7 : i + 1, trunk: false },
  ]),
  ...SATS.map((sat, k) => ({ a: HUBS.length + k, b: sat.hub, trunk: false })),
];

export const Scene7Reveal: React.FC = () => {
  const frame = useCurrentFrame();

  // Pull back: the network shrinks as outer rings come into view.
  const pull = interpolate(frame, [0, CONVERGE[0]], [1.9, 0.62], { ...clamp, easing: ease.out });
  const conv = prog(frame, CONVERGE[0], CONVERGE[1], ease.inOut);
  const netA = interpolate(frame, [0, 8, CONVERGE[1] - 8, CONVERGE[1]], [0, 1, 1, 0], clamp);
  const point = interpolate(frame, [CONVERGE[1] - 6, CONVERGE[1], TRACE[0], TRACE[0] + 8], [0, 1, 1, 0], clamp);

  const trace = prog(frame, TRACE[0], TRACE[1], ease.inOut);
  const fill = prog(frame, FILL[0], FILL[1], ease.out);
  const glow = interpolate(frame, [TRACE[0], TRACE[1], FADE[0]], [0, 1, 0.7], clamp);
  const fade = interpolate(frame, [...FADE], [1, 0], clamp);
  const slogan = interpolate(frame, [FILL[1] + 6, FILL[1] + 26], [0, 1], { ...clamp, easing: ease.out });

  const pos = (n: { x: number; y: number }) => ({
    x: lerp(C.x + (n.x - C.x) * pull, C.x, conv),
    y: lerp(C.y + (n.y - C.y) * pull, C.y, conv),
  });

  return (
    <AbsoluteFill style={{ backgroundColor: "#020609" }}>
      <AbsoluteFill style={{ opacity: fade }}>
        <svg width="1920" height="1080" style={{ position: "absolute", inset: 0 }}>
          <g opacity={netA}>
            {EDGES.map((e, k) => {
              const a = pos(NODES[e.a]);
              const b = pos(NODES[e.b]);
              const t = ((frame * 1.4 + rand(`pt${k}`, 0, 60)) % 60) / 60;
              return (
                <g key={k}>
                  <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={colors.aqua} strokeOpacity={e.trunk ? 0.55 : 0.22} strokeWidth={e.trunk ? 1.8 : 1} />
                  {e.trunk && <circle cx={lerp(a.x, b.x, t)} cy={lerp(a.y, b.y, t)} r={2.6} fill="#CFF3F8" opacity={0.85} />}
                </g>
              );
            })}
            {NODES.map((n, i) => {
              const p = pos(n);
              return <rect key={i} x={p.x - n.size} y={p.y - n.size} width={n.size * 2} height={n.size * 2} fill={colors.deepNavy} stroke={colors.aqua} strokeWidth={1.2} />;
            })}
          </g>
          <circle cx={C.x} cy={C.y} r={4} fill="#E6FAFC" opacity={point} />
          <circle cx={C.x} cy={C.y} r={26} fill={colors.aqua} opacity={point * 0.18} />
        </svg>

        {/* Controlled aqua illumination behind the logo */}
        <AbsoluteFill style={{ opacity: glow * 0.55, background: `radial-gradient(ellipse 700px 180px at 50% 50%, rgba(22,177,196,0.22), transparent 70%)` }} />

        <LogoReveal trace={trace} fill={fill} />
        {/* Subtle slogan, arriving after the logo has settled */}
        <div
          style={{
            ...annotationStyle,
            position: "absolute",
            left: 0,
            right: 0,
            top: LY + LOGO_H + 44,
            textAlign: "center",
            fontSize: 22,
            letterSpacing: "0.34em",
            paddingLeft: "0.34em",
            color: "rgba(214,238,242,0.78)",
            opacity: slogan,
            transform: `translateY(${(1 - slogan) * 8}px)`,
          }}
        >
          {COPY.slogan}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// Official Envirotech logo (white version, for dark backgrounds).
const LOGO = staticFile("logo/envirotech_logo_white.png");
const LOGO_W = 960;
const LOGO_H = LOGO_W * (384 / 1004);
const LX = C.x - LOGO_W / 2;
const LY = C.y - LOGO_H / 2;

/**
 * An aqua light travels across the logo, drawing its outline (an edge
 * extracted from the logo's own alpha), then the white logo fills in.
 */
const LogoReveal: React.FC<{ trace: number; fill: number }> = ({ trace, fill }) => {
  const head = LX - 40 + (LOGO_W + 80) * trace;
  const tracing = trace > 0 && trace < 1;
  return (
    <>
      {/* Preload so the frame waits for the logo file */}
      <Img src={LOGO} style={{ position: "absolute", width: 1, height: 1, opacity: 0 }} />
      <svg width="1920" height="1080" style={{ position: "absolute", inset: 0 }}>
        <defs>
          <filter id="logoOutline" x="-5%" y="-10%" width="110%" height="120%">
            <feMorphology in="SourceAlpha" operator="dilate" radius="2.2" result="grown" />
            <feComposite in="grown" in2="SourceAlpha" operator="out" result="edge" />
            <feFlood floodColor={colors.aqua} />
            <feComposite in2="edge" operator="in" result="line" />
            <feGaussianBlur in="line" stdDeviation="4" result="glow" />
            <feMerge>
              <feMergeNode in="glow" />
              <feMergeNode in="line" />
            </feMerge>
          </filter>
          <clipPath id="traced">
            <rect x={0} y={0} width={Math.max(0, head)} height={1080} />
          </clipPath>
          <linearGradient id="headGlow" x1="0" x2="1">
            <stop offset="0" stopColor={colors.aqua} stopOpacity="0" />
            <stop offset="0.8" stopColor="#CFF5FA" stopOpacity="0.9" />
            <stop offset="1" stopColor={colors.aqua} stopOpacity="0" />
          </linearGradient>
        </defs>
        {/* Outline, drawn behind the travelling light */}
        <g clipPath="url(#traced)" opacity={1 - fill * 0.8}>
          <image href={LOGO} x={LX} y={LY} width={LOGO_W} height={LOGO_H} filter="url(#logoOutline)" />
        </g>
        {/* The light itself: a soft vertical band at the tracing edge */}
        {tracing && <rect x={head - 90} y={LY - 30} width={100} height={LOGO_H + 60} fill="url(#headGlow)" opacity={0.35} />}
        {/* Solid logo */}
        <image href={LOGO} x={LX} y={LY} width={LOGO_W} height={LOGO_H} opacity={fill} />
      </svg>
    </>
  );
};
