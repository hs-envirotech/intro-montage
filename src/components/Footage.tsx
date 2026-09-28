import React from "react";
import { AbsoluteFill, Img, OffthreadVideo, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import type { Shot } from "../config";
import { resolveMedia } from "../assets";
import { colors, eyebrowStyle, fonts } from "../theme";

/**
 * A footage slot. Plays /assets/<shot.file> if it exists, otherwise renders a
 * clearly labelled placeholder frame. A slow push-in keeps stills alive.
 */
type LabelPosition = "center" | "top";

export const Footage: React.FC<{ shot: Shot; zoom?: [number, number]; labelPosition?: LabelPosition }> = ({
  shot,
  zoom = [1.04, 1.1],
  labelPosition = "center",
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const media = resolveMedia(shot.file);
  const scale = interpolate(frame, [0, durationInFrames], zoom);

  const fill: React.CSSProperties = { width: "100%", height: "100%", objectFit: "cover", transform: `scale(${scale})` };

  if (media?.kind === "video") return <AbsoluteFill><OffthreadVideo src={media.src} muted style={fill} /></AbsoluteFill>;
  if (media?.kind === "image") return <AbsoluteFill><Img src={media.src} style={fill} /></AbsoluteFill>;
  return <FootagePlaceholder shot={shot} scale={scale} labelPosition={labelPosition} />;
};

const FootagePlaceholder: React.FC<{ shot: Shot; scale: number; labelPosition: LabelPosition }> = ({
  shot,
  scale,
  labelPosition,
}) => (
  <AbsoluteFill style={{ backgroundColor: colors.slate, overflow: "hidden" }}>
    {/* Engineering grid, gently pushing in so motion reads in the cut. */}
    <AbsoluteFill
      style={{
        transform: `scale(${scale})`,
        backgroundImage: `linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px)`,
        backgroundSize: "80px 80px",
        backgroundPosition: "center",
      }}
    />
    <AbsoluteFill style={{ background: `radial-gradient(ellipse at center, transparent 30%, ${colors.navyDeep}cc 100%)` }} />
    {/* Frame corners */}
    {[
      { top: 60, left: 60, borderTop: 2, borderLeft: 2 },
      { top: 60, right: 60, borderTop: 2, borderRight: 2 },
      { bottom: 60, left: 60, borderBottom: 2, borderLeft: 2 },
      { bottom: 60, right: 60, borderBottom: 2, borderRight: 2 },
    ].map(({ borderTop, borderLeft, borderRight, borderBottom, ...pos }, i) => (
      <div
        key={i}
        style={{
          position: "absolute",
          width: 60,
          height: 60,
          ...pos,
          borderColor: "rgba(255,255,255,0.45)",
          borderStyle: "solid",
          borderWidth: `${borderTop ?? 0}px ${borderRight ?? 0}px ${borderBottom ?? 0}px ${borderLeft ?? 0}px`,
        }}
      />
    ))}
    <AbsoluteFill
      style={{
        alignItems: "center",
        justifyContent: labelPosition === "top" ? "flex-start" : "center",
        paddingTop: labelPosition === "top" ? 150 : 0,
        textAlign: "center",
        gap: 18,
      }}
    >
      <div style={{ ...eyebrowStyle, color: colors.aqua }}>Footage placeholder</div>
      <div style={{ fontFamily: fonts.heading, fontWeight: 700, fontSize: 64, color: colors.white, letterSpacing: "-0.02em" }}>
        FOOTAGE: {shot.label}
      </div>
      <div style={{ fontFamily: fonts.body, fontSize: 26, color: "rgba(255,255,255,0.6)" }}>
        Drop clip at /assets/{shot.file}
      </div>
    </AbsoluteFill>
  </AbsoluteFill>
);
