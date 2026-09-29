import React from "react";
import { interpolate } from "remotion";
import { clamp } from "../../lib/anim";
import { annotationStyle, colors, ease, fonts } from "../../theme";

/** Lower-left project title block: eyebrow, name, then supporting lines. */
export const ProjectLockup: React.FC<{
  frame: number;
  start: number;
  eyebrow: string;
  name: string;
  lines: React.ReactNode[];
}> = ({ frame, start, eyebrow, name, lines }) => {
  const rule = interpolate(frame, [start, start + 20], [0, 1], { ...clamp, easing: ease.out });
  const title = interpolate(frame, [start + 6, start + 24], [0, 1], { ...clamp, easing: ease.out });
  return (
    <div style={{ position: "absolute", left: 120, bottom: 190 }}>
      {eyebrow && <div style={{ ...annotationStyle, fontSize: 18, color: colors.aqua, opacity: title, marginBottom: 18 }}>{eyebrow}</div>}
      <div style={{ width: 72 * rule, height: 2, background: colors.seaGreen, marginBottom: 22 }} />
      <div
        style={{
          fontFamily: fonts.heading,
          fontWeight: 700,
          fontSize: 104,
          lineHeight: 1,
          letterSpacing: "0.01em",
          textTransform: "uppercase",
          color: colors.white,
          opacity: title,
          transform: `translateY(${(1 - title) * 14}px)`,
        }}
      >
        {name}
      </div>
      <div style={{ marginTop: 26, display: "flex", flexDirection: "column", gap: 12 }}>
        {lines.map((l, i) => {
          const a = interpolate(frame, [start + 22 + i * 10, start + 38 + i * 10], [0, 1], { ...clamp, easing: ease.out });
          return (
            <div key={i} style={{ opacity: a, transform: `translateY(${(1 - a) * 10}px)` }}>
              {l}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export const lineStyle: React.CSSProperties = {
  ...annotationStyle,
  fontSize: 26,
  letterSpacing: "0.22em",
  color: "rgba(255,255,255,0.88)",
};

/** Honest caption for procedural or illustrative imagery. */
export const IllustrativeTag: React.FC<{ text: string }> = ({ text }) => (
  <div style={{ ...annotationStyle, fontSize: 13, position: "absolute", right: 48, bottom: 40, color: "rgba(255,255,255,0.45)" }}>
    {text}
  </div>
);
