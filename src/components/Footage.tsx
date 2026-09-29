import React, { createContext, useContext } from "react";
import { AbsoluteFill, Img, OffthreadVideo, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import type { Shot } from "../config";
import { resolveMedia } from "../assets";
import { annotationStyle, colors, fonts } from "../theme";

/** Draft mode: show small tags marking where real footage still needs to go. */
export const DraftContext = createContext({ showPlaceholderLabels: true });

/**
 * A footage slot. Plays /assets/<shot.file> if it exists; otherwise renders the
 * procedural `fallback` and, in draft mode, a small tag naming the missing shot.
 */
export const FootageSlot: React.FC<{ shot: Shot; fallback: React.ReactNode; zoom?: [number, number] }> = ({
  shot,
  fallback,
  zoom = [1.02, 1.08],
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const { showPlaceholderLabels } = useContext(DraftContext);
  const media = resolveMedia(shot.file);
  const scale = interpolate(frame, [0, durationInFrames], zoom);
  const fill: React.CSSProperties = { width: "100%", height: "100%", objectFit: "cover", transform: `scale(${scale})` };

  if (media?.kind === "video") return <AbsoluteFill><OffthreadVideo src={media.src} muted style={fill} /></AbsoluteFill>;
  if (media?.kind === "image") return <AbsoluteFill><Img src={media.src} style={fill} /></AbsoluteFill>;

  return (
    <AbsoluteFill>
      {fallback}
      {showPlaceholderLabels && <PlaceholderTag shot={shot} />}
    </AbsoluteFill>
  );
};

export const PlaceholderTag: React.FC<{ shot: Shot }> = ({ shot }) => (
  <div
    style={{
      position: "absolute",
      top: 40,
      right: 48,
      padding: "10px 16px",
      border: `1px dashed ${colors.aqua}99`,
      borderRadius: 6,
      background: "rgba(11,34,57,0.7)",
      textAlign: "right",
    }}
  >
    <div style={{ ...annotationStyle, fontSize: 14, color: colors.aqua }}>Footage placeholder</div>
    <div style={{ fontFamily: fonts.body, fontSize: 18, color: "rgba(255,255,255,0.85)", marginTop: 4 }}>{shot.label}</div>
    <div style={{ fontFamily: fonts.body, fontSize: 15, color: "rgba(255,255,255,0.5)" }}>/assets/{shot.file}</div>
  </div>
);
