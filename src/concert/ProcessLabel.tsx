import React from "react";
import { useVideoConfig } from "remotion";
import { SHOTS } from "./timeline";
import { fonts } from "../theme";

export type LabelMode = "off" | "names" | "descriptors";

const HOLD = 4.6; // seconds fully visible
const FADE = 0.8;

/**
 * Process label, low in the frame: the process name in widely tracked
 * capitals, a hairline, and (in "descriptors" mode) one plain-English line on
 * what the process does. Appears once per labelled shot, after the image has
 * had a moment on its own, and keeps well inside the safe area.
 */
export const ProcessLabel: React.FC<{ g: number; only: string; mode: LabelMode }> = ({ g, only, mode }) => {
  const { height } = useVideoConfig();
  if (mode === "off") return null;
  const shot = SHOTS.find((s) => s.label && (only ? s.id === only : g >= s.start && g < s.end));
  if (!shot?.label) return null;
  const { name, text, at } = shot.label;
  const t = (only ? g : g - shot.start) - at;
  if (t < 0 || t > HOLD + 2 * FADE) return null;
  const a = Math.min(t / FADE, 1, (HOLD + 2 * FADE - t) / FADE);
  const e = a * a * (3 - 2 * a);
  const line = Math.min(t / (FADE * 1.6), 1);
  // the descriptor follows the name by a beat
  const td = Math.min(Math.max((t - 0.35) / FADE, 0), 1, (HOLD + 2 * FADE - t) / FADE);
  const ed = td * td * (3 - 2 * td);
  const u = height / 1080;
  const withText = mode === "descriptors";

  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: height * 0.1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      }}
    >
      {/* soft shadow so the text holds up over bright moments */}
      <div
        style={{
          position: "absolute",
          width: 1100 * u,
          height: (withText ? 190 : 120) * u,
          top: -40 * u,
          background: "radial-gradient(ellipse at center, rgba(3,12,22,0.55) 0%, rgba(3,12,22,0) 70%)",
          opacity: e,
        }}
      />
      <div
        style={{
          position: "relative",
          fontFamily: fonts.heading,
          fontWeight: 600,
          fontSize: 28 * u,
          letterSpacing: "0.5em",
          paddingLeft: "0.5em",
          color: "#CFF3F7",
          opacity: e * 0.92,
          transform: `translateY(${(1 - e) * 8 * u}px)`,
        }}
      >
        {name}
      </div>
      <div
        style={{
          position: "relative",
          marginTop: 14 * u,
          height: Math.max(1, 1.5 * u),
          width: 240 * u * (1 - Math.pow(1 - line, 3)),
          background: "linear-gradient(90deg, transparent, #16B1C4, transparent)",
          opacity: e,
        }}
      />
      {withText && (
        <div
          style={{
            position: "relative",
            marginTop: 16 * u,
            maxWidth: 1300 * u,
            textAlign: "center",
            fontFamily: fonts.body,
            fontWeight: 400,
            fontSize: 36 * u,
            letterSpacing: "0.02em",
            color: "#E8F6F8",
            opacity: ed * 0.86,
            transform: `translateY(${(1 - ed) * 6 * u}px)`,
          }}
        >
          {text}
        </div>
      )}
    </div>
  );
};
