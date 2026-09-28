import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { SCENE_TIMINGS, sec } from "../config";
import { colors, fonts } from "../theme";

/** Review-only VO subtitles, driven by the timings in config.ts. */
export const Subtitles: React.FC = () => {
  const frame = useCurrentFrame();
  const active = SCENE_TIMINGS.map((s) => ({ text: s.vo, start: s.from + sec(s.voInSec), end: s.from + sec(s.voOutSec) })).find(
    (l) => frame >= l.start && frame < l.end,
  );
  if (!active) return null;

  const opacity = interpolate(frame, [active.start, active.start + 6, active.end - 6, active.end], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", paddingBottom: 56, pointerEvents: "none" }}>
      <div
        style={{
          opacity,
          maxWidth: 1400,
          padding: "14px 28px",
          borderRadius: 8,
          background: "rgba(10, 31, 56, 0.78)",
          color: colors.white,
          fontFamily: fonts.body,
          fontSize: 34,
          lineHeight: 1.35,
          textAlign: "center",
        }}
      >
        <span style={{ color: colors.aqua, fontWeight: 600, fontSize: 22, letterSpacing: "0.18em", marginRight: 14 }}>VO</span>
        {active.text}
      </div>
    </AbsoluteFill>
  );
};
