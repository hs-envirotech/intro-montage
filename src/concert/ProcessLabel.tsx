import React from "react";
import { useVideoConfig } from "remotion";
import { SHOTS } from "./timeline";
import { fonts } from "../theme";

const IN = 1.4; // seconds into the shot before the label appears
const HOLD = 3.2;
const FADE = 0.9;

/**
 * A restrained process label: small, widely tracked capitals low in the
 * frame, with a hairline that draws out beneath. Appears once per labelled
 * shot and never competes with the image.
 */
export const ProcessLabel: React.FC<{ g: number; only: string }> = ({ g, only }) => {
  const { height } = useVideoConfig();
  const shot = SHOTS.find((s) => s.label && (only ? s.id === only : g >= s.start && g < s.end));
  if (!shot?.label) return null;
  const t = (only ? g : g - shot.start) - IN;
  if (t < 0 || t > HOLD + 2 * FADE) return null;
  const a = Math.min(t / FADE, 1, (HOLD + 2 * FADE - t) / FADE);
  const e = a * a * (3 - 2 * a);
  const line = Math.min(t / (FADE * 1.6), 1);
  const u = height / 1080;

  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: height * 0.12,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        opacity: e * 0.78,
        transform: `translateY(${(1 - e) * 8 * u}px)`,
      }}
    >
      <div
        style={{
          fontFamily: fonts.heading,
          fontWeight: 500,
          fontSize: 21 * u,
          letterSpacing: "0.62em",
          paddingLeft: "0.62em",
          color: "#BFEFF4",
        }}
      >
        {shot.label}
      </div>
      <div
        style={{
          marginTop: 14 * u,
          height: Math.max(1, u),
          width: 220 * u * (1 - Math.pow(1 - line, 3)),
          background: "linear-gradient(90deg, transparent, #16B1C4, transparent)",
        }}
      />
    </div>
  );
};
