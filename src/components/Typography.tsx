import React from "react";
import { interpolate } from "remotion";
import { clamp } from "../lib/anim";
import { annotationStyle, colors, ease, fonts } from "../theme";

/**
 * Engineering annotation: a tracked label with a hairline leader and a tick
 * mark at the point it refers to. Reads like a drawing callout, not an ad.
 */
export const Callout: React.FC<{
  x: number;
  y: number;
  label: string;
  frame: number;
  start: number;
  end: number;
  dx?: number;
  dy?: number;
  color?: string;
}> = ({ x, y, label, frame, start, end, dx = 90, dy = -70, color = colors.aqua }) => {
  const draw = interpolate(frame, [start, start + 14], [0, 1], { ...clamp, easing: ease.out });
  const text = interpolate(frame, [start + 8, start + 20], [0, 1], clamp);
  const out = interpolate(frame, [end - 10, end], [1, 0], clamp);
  if (frame < start || frame > end) return null;
  const ex = x + dx * draw;
  const ey = y + dy * draw;
  const right = dx >= 0;
  return (
    <div style={{ position: "absolute", inset: 0, opacity: out }}>
      <svg width="1920" height="1080" style={{ position: "absolute", inset: 0 }}>
        <circle cx={x} cy={y} r={5} fill="none" stroke={color} strokeWidth={1.5} opacity={draw} />
        <line x1={x} y1={y} x2={ex} y2={ey} stroke={color} strokeWidth={1.2} opacity={0.9} />
        <line x1={ex} y1={ey} x2={ex + (right ? 1 : -1) * 40 * draw} y2={ey} stroke={color} strokeWidth={1.2} />
      </svg>
      <div
        style={{
          ...annotationStyle,
          fontSize: 17,
          position: "absolute",
          left: right ? ex + 50 : undefined,
          right: right ? undefined : 1920 - ex + 50,
          top: ey - 12,
          color: colors.white,
          opacity: text,
          whiteSpace: "nowrap",
        }}
      >
        {label}
      </div>
    </div>
  );
};

/** Section annotation: short code + long name, top-left, like a drawing title. */
export const ProcessLabel: React.FC<{ short?: string; long: string; frame: number; start: number; end: number }> = ({
  short,
  long,
  frame,
  start,
  end,
}) => {
  const a = interpolate(frame, [start, start + 12, end - 10, end], [0, 1, 1, 0], clamp);
  const rule = interpolate(frame, [start, start + 18], [0, 1], { ...clamp, easing: ease.out });
  return (
    <div style={{ position: "absolute", left: 120, top: 110, opacity: a }}>
      <div style={{ width: 56 * rule, height: 2, background: colors.seaGreen, marginBottom: 18 }} />
      <div style={{ display: "flex", alignItems: "baseline", gap: 22 }}>
        {short && (
          <span style={{ fontFamily: fonts.heading, fontWeight: 700, fontSize: 64, color: colors.white, letterSpacing: "0.02em" }}>
            {short}
          </span>
        )}
        <span style={{ ...annotationStyle, fontSize: short ? 20 : 30, color: short ? colors.aqua : colors.white }}>{long}</span>
      </div>
    </div>
  );
};

/** One large, tracked word — used for the sequential ENGINEER / INTEGRATE / DELIVER beats. */
export const BeatWord: React.FC<{ word: string; frame: number; start: number; end: number; size?: number }> = ({
  word,
  frame,
  start,
  end,
  size = 120,
}) => {
  if (frame < start - 1 || frame > end + 1) return null;
  const a = interpolate(frame, [start, start + 10, end - 10, end], [0, 1, 1, 0], clamp);
  const track = interpolate(frame, [start, end], [0.34, 0.42]);
  const blur = interpolate(frame, [start, start + 10, end - 10, end], [8, 0, 0, 8], clamp);
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: fonts.heading,
        fontWeight: 700,
        fontSize: size,
        letterSpacing: `${track}em`,
        paddingLeft: `${track}em`,
        textTransform: "uppercase",
        color: colors.white,
        opacity: a,
        filter: `blur(${blur}px)`,
        textShadow: "0 0 40px rgba(11,34,57,0.9)",
      }}
    >
      {word}
    </div>
  );
};

/** Cinematic letterbox-free vignette + fine grain feel, shared by all scenes. */
export const Vignette: React.FC<{ strength?: number }> = ({ strength = 0.75 }) => (
  <div
    style={{
      position: "absolute",
      inset: 0,
      pointerEvents: "none",
      background: `radial-gradient(ellipse 75% 70% at 50% 50%, transparent 55%, rgba(2,8,14,${strength}) 100%)`,
    }}
  />
);
