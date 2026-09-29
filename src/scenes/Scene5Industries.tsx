import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import type { IconDefinition } from "@fortawesome/fontawesome-common-types";
import { faCity, faIndustry, faOilWell, faRecycle, faServer, faWater } from "@fortawesome/free-solid-svg-icons";
import { COPY } from "../config";
import { clamp } from "../lib/anim";
import { Vignette } from "../components/Typography";
import { annotationStyle, colors, ease, fonts } from "../theme";

// A quick glance of the sectors Envirotech serves: six icon chips arriving on
// 16th notes (one bar = 75 frames, a 16th ≈ 4.7 frames), then a short hold.
const ICONS: IconDefinition[] = [faServer, faOilWell, faIndustry, faCity, faWater, faRecycle];
const STEP = 75 / 16;
const FIRST = STEP; // first chip lands on the second 16th of the bar

/** Brand icon chip: a white Font Awesome glyph in a solid navy circle, aqua ring for the film. */
const IconChip: React.FC<{ icon: IconDefinition; size: number; ring: number }> = ({ icon, size, ring }) => {
  const [w, h, , , path] = icon.icon;
  const glyph = size * 0.5;
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        background: colors.navy,
        boxShadow: `0 0 0 ${2 + ring * 2}px rgba(22,177,196,${0.25 + 0.55 * ring}), 0 0 ${24 * ring}px rgba(22,177,196,${0.35 * ring})`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <svg width={glyph} height={glyph} viewBox={`0 0 ${w} ${h}`}>
        <path d={typeof path === "string" ? path : path.join(" ")} fill="#FFFFFF" />
      </svg>
    </div>
  );
};

export const Scene5Industries: React.FC = () => {
  const frame = useCurrentFrame();
  const { title, list } = COPY.industries;
  const titleIn = interpolate(frame, [0, 10], [0, 1], { ...clamp, easing: ease.out });
  const rule = interpolate(frame, [2, 18], [0, 1], { ...clamp, easing: ease.out });
  const push = interpolate(frame, [0, 85], [1.03, 1]);

  return (
    <AbsoluteFill style={{ background: `radial-gradient(ellipse at 50% 55%, #11304D 0%, ${colors.deepNavy} 55%, #050D16 100%)` }}>
      <AbsoluteFill
        style={{
          opacity: 0.35,
          backgroundImage: `linear-gradient(rgba(22,177,196,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(22,177,196,0.06) 1px, transparent 1px)`,
          backgroundSize: "40px 40px",
        }}
      />
      <AbsoluteFill style={{ transform: `scale(${push})`, alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center", marginBottom: 70, opacity: titleIn }}>
          <div style={{ ...annotationStyle, fontSize: 22, letterSpacing: "0.34em", paddingLeft: "0.34em", color: colors.aqua }}>{title}</div>
          <div style={{ width: 90 * rule, height: 2, background: colors.seaGreen, margin: "22px auto 0" }} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 420px)", rowGap: 64 }}>
          {list.map((name, i) => {
            const t0 = FIRST + i * STEP;
            const a = interpolate(frame, [t0, t0 + 8], [0, 1], { ...clamp, easing: ease.out });
            const ring = interpolate(frame, [t0, t0 + 4, t0 + 22], [0, 1, 0.25], clamp);
            return (
              <div key={name} style={{ display: "flex", alignItems: "center", gap: 26, opacity: a, transform: `translateY(${(1 - a) * 18}px)` }}>
                <IconChip icon={ICONS[i]} size={84} ring={ring} />
                <div style={{ fontFamily: fonts.heading, fontWeight: 700, fontSize: 32, lineHeight: 1.15, color: colors.white, maxWidth: 280 }}>{name}</div>
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
      <Vignette />
    </AbsoluteFill>
  );
};
