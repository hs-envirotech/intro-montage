import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { Logo } from "../components/Logo";
import { Ripple } from "../components/Ripple";
import { COPY } from "../config";
import { colors, ease, fonts } from "../theme";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

const LOGO_W = 820;
const LOGO_H = LOGO_W / (1004 / 384);
const CY = 470;
// Ripple centre sits on the droplet mark of the lockup (left ~14% of the logo).
const MARK_X = 960 - LOGO_W / 2 + LOGO_W * 0.14;

export const Scene7Close: React.FC = () => {
  const frame = useCurrentFrame();

  const logoIn = interpolate(frame, [8, 40], [0, 1], { ...clamp, easing: ease.out });
  const rule = interpolate(frame, [30, 62], [0, 1], { ...clamp, easing: ease.inOut });
  const urlIn = interpolate(frame, [44, 74], [0, 1], { ...clamp, easing: ease.out });

  return (
    <AbsoluteFill style={{ backgroundColor: colors.paper }}>
      {/* Aqua ripple, echoing the hook */}
      <Ripple
        t={frame}
        cx={MARK_X}
        cy={CY}
        squash={1}
        rings={4}
        spacing={16}
        life={150}
        maxRadius={1100}
        strokeWidth={2.5}
        glow={false}
        opacity={0.55}
      />

      <div
        style={{
          position: "absolute",
          left: 960 - LOGO_W / 2,
          top: CY - LOGO_H / 2,
          opacity: logoIn,
          transform: `translateY(${(1 - logoIn) * 20}px)`,
        }}
      >
        <Logo width={LOGO_W} color={colors.navy} />
      </div>

      <div
        style={{
          position: "absolute",
          top: CY + LOGO_H / 2 + 40,
          left: 960 - 60 * rule,
          width: 120 * rule,
          height: 4,
          borderRadius: 4,
          background: colors.seaGreen,
        }}
      />

      <div
        style={{
          position: "absolute",
          top: CY + LOGO_H / 2 + 80,
          width: "100%",
          textAlign: "center",
          fontFamily: fonts.heading,
          fontWeight: 600,
          fontSize: 40,
          letterSpacing: "0.02em",
          color: colors.slate,
          opacity: urlIn,
          transform: `translateY(${(1 - urlIn) * 14}px)`,
        }}
      >
        {COPY.closeUrl}
      </div>
    </AbsoluteFill>
  );
};
