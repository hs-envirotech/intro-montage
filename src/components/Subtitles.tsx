import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { VO, sec } from "../config";
import { colors, fonts } from "../theme";

/** Review-only VO subtitles, driven by the VO cue list in config.ts. */
export const Subtitles: React.FC = () => {
  const frame = useCurrentFrame();
  const active = VO.map((l) => ({ text: l.text, start: sec(l.inSec), end: sec(l.outSec) })).find(
    (l) => frame >= l.start && frame < l.end,
  );
  if (!active) return null;

  const opacity = interpolate(frame, [active.start, active.start + 6, active.end - 6, active.end], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", paddingBottom: 48, pointerEvents: "none" }}>
      <div
        style={{
          opacity,
          maxWidth: 1400,
          padding: "12px 26px",
          borderRadius: 6,
          background: "rgba(5, 14, 24, 0.72)",
          color: colors.white,
          fontFamily: fonts.body,
          fontSize: 32,
          lineHeight: 1.35,
          textAlign: "center",
        }}
      >
        <span style={{ color: colors.aqua, fontWeight: 600, fontSize: 20, letterSpacing: "0.18em", marginRight: 14 }}>VO</span>
        {active.text}
      </div>
    </AbsoluteFill>
  );
};
