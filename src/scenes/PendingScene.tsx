import React from "react";
import { AbsoluteFill } from "remotion";
import type { SceneTiming } from "../config";
import { colors, eyebrowStyle, fonts } from "../theme";

/** Temporary holding slate for footage scenes that haven't been built yet. */
export const PendingScene: React.FC<{ scene: SceneTiming }> = ({ scene }) => (
  <AbsoluteFill style={{ backgroundColor: colors.navyNight, alignItems: "center", justifyContent: "center", gap: 20 }}>
    <div style={{ ...eyebrowStyle, color: colors.aqua }}>Scene in progress</div>
    <div style={{ fontFamily: fonts.heading, fontWeight: 700, fontSize: 72, color: colors.white }}>{scene.title}</div>
    <div style={{ fontFamily: fonts.body, fontSize: 28, color: "rgba(255,255,255,0.6)" }}>
      {scene.durationSec}s · footage montage to follow
    </div>
  </AbsoluteFill>
);
