import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { Logo } from "../components/Logo";
import { COPY } from "../config";
import { colors, ease, fonts } from "../theme";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

// Layout
const W = 1920;
const CY = 480; // optical centre of the lockup
const LOGO_W = 780;
const LOGO_H = LOGO_W / (1004 / 384);
const HALF_SPAN = LOGO_W / 2 + 30;
const OPEN = LOGO_H / 2 + 18; // how far the lines part to reveal the logo
const LINE = 4;

// Beats (frames, relative to scene start)
const SWEEP = [6, 44] as const; // line head crosses the frame
const CONVERGE = [44, 78] as const; // ends pull in to the logo width
const REVEAL = [80, 116] as const; // line splits and parts vertically
const SETTLE = [118, 150] as const; // top line retires, bottom becomes a short rule
const TAGLINE = [140, 172] as const;
const OUT = [284, 300] as const;

const Line: React.FC<{ x1: number; x2: number; y: number; opacity?: number; head?: boolean }> = ({
  x1,
  x2,
  y,
  opacity = 1,
  head,
}) => (
  <>
    <div
      style={{
        position: "absolute",
        left: x1,
        top: y - LINE / 2,
        width: Math.max(0, x2 - x1),
        height: LINE,
        borderRadius: LINE,
        background: colors.seaGreen,
        boxShadow: `0 0 18px ${colors.seaGreen}99`,
        opacity,
      }}
    />
    {head && (
      <div
        style={{
          position: "absolute",
          left: x2 - 90,
          top: y - 40,
          width: 180,
          height: 80,
          background: `radial-gradient(ellipse at center, ${colors.seaGreen}aa, transparent 65%)`,
          opacity,
        }}
      />
    )}
  </>
);

export const Scene3WhoWeAre: React.FC = () => {
  const frame = useCurrentFrame();

  // 1. Sweep: head travels left → right, tail anchored at the left edge.
  const sweep = interpolate(frame, [...SWEEP], [0, 1], { ...clamp, easing: ease.inOut });
  // 2. Converge: both ends ease inwards to the logo span.
  const conv = interpolate(frame, [...CONVERGE], [0, 1], { ...clamp, easing: ease.inOut });
  const x1 = interpolate(conv, [0, 1], [0, W / 2 - HALF_SPAN]);
  const x2 = frame < CONVERGE[0] ? sweep * (W + 40) : interpolate(conv, [0, 1], [W + 40, W / 2 + HALF_SPAN]);

  // 3. Reveal: line splits into two that part vertically, unmasking the logo.
  const rev = interpolate(frame, [...REVEAL], [0, 1], { ...clamp, easing: ease.inOut });
  const gap = rev * OPEN;

  // 4. Settle: top line fades; bottom line shortens into a rule under the logo.
  const settle = interpolate(frame, [...SETTLE], [0, 1], { ...clamp, easing: ease.inOut });
  const ruleHalf = interpolate(settle, [0, 1], [HALF_SPAN, 60]);
  const ruleY = CY + gap + settle * 26;
  const topOpacity = 1 - settle;

  // Logo gently grows into place as it is revealed.
  const logoScale = interpolate(rev, [0, 1], [0.97, 1]);

  const tag = interpolate(frame, [...TAGLINE], [0, 1], { ...clamp, easing: ease.out });
  const out = interpolate(frame, [...OUT], [1, 0], clamp);

  // Slow drifting light across the navy field, for depth.
  const drift = interpolate(frame, [0, 300], [35, 60]);

  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(ellipse 1400px 900px at ${drift}% 40%, ${colors.navy} 0%, ${colors.navyDeep} 70%, ${colors.navyNight} 100%)`,
      }}
    >
      <AbsoluteFill style={{ opacity: out }}>
        {/* Logo, clipped to the band between the two parting lines */}
        <div
          style={{
            position: "absolute",
            left: W / 2 - LOGO_W / 2,
            top: CY - LOGO_H / 2,
            clipPath: `inset(${LOGO_H / 2 - gap}px -40px ${LOGO_H / 2 - gap}px -40px)`,
            transform: `scale(${logoScale})`,
          }}
        >
          <Logo width={LOGO_W} color={colors.white} />
        </div>

        {frame < REVEAL[0] ? (
          <Line x1={x1} x2={x2} y={CY} head={frame < CONVERGE[0]} />
        ) : (
          <>
            <Line x1={W / 2 - HALF_SPAN} x2={W / 2 + HALF_SPAN} y={CY - gap} opacity={topOpacity} />
            <Line x1={W / 2 - ruleHalf} x2={W / 2 + ruleHalf} y={ruleY} />
          </>
        )}

        {/* Descriptor */}
        <div
          style={{
            position: "absolute",
            top: CY + OPEN + 70,
            width: "100%",
            textAlign: "center",
            fontFamily: fonts.heading,
            fontWeight: 600,
            fontSize: 48,
            letterSpacing: "-0.01em",
            color: colors.white,
            opacity: tag,
            transform: `translateY(${(1 - tag) * 18}px)`,
          }}
        >
          {COPY.whoWeAre}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
