import React from "react";
import { Img } from "remotion";
import { ASSETS } from "../config";
import { resolveFirst } from "../assets";
import { colors, fonts } from "../theme";

const LOGO_ASPECT = 1004 / 384;

/**
 * Envirotech logo lockup. Uses the first logo file found in /assets/logo and
 * recolours it with a CSS mask, so one (white/transparent) file serves both the
 * navy and the paper backgrounds. Falls back to a Manrope wordmark.
 */
export const Logo: React.FC<{ width: number; color?: string; style?: React.CSSProperties }> = ({
  width,
  color = colors.white,
  style,
}) => {
  const src = resolveFirst(ASSETS.logoCandidates);
  const height = width / LOGO_ASPECT;

  if (!src) {
    return (
      <div
        style={{
          width,
          height,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: fonts.heading,
          fontWeight: 800,
          fontSize: width * 0.14,
          letterSpacing: "0.04em",
          color,
          ...style,
        }}
      >
        ENVIROTECH
      </div>
    );
  }

  return (
    <div style={{ width, height, position: "relative", ...style }}>
      {/* Hidden <Img> makes Remotion wait until the file has loaded. */}
      <Img src={src} style={{ position: "absolute", width: 1, height: 1, opacity: 0 }} />
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundColor: color,
          WebkitMaskImage: `url(${src})`,
          maskImage: `url(${src})`,
          WebkitMaskSize: "contain",
          maskSize: "contain",
          WebkitMaskRepeat: "no-repeat",
          maskRepeat: "no-repeat",
          WebkitMaskPosition: "center",
          maskPosition: "center",
        }}
      />
    </div>
  );
};
