import React from "react";
import { Html5Audio, interpolate, useVideoConfig } from "remotion";
import { ASSETS, sec } from "../config";
import { resolveAudioIn } from "../assets";

/** Uses the first track in /assets/music with a fade-out on the final beat; silent otherwise. */
export const Music: React.FC = () => {
  const { durationInFrames } = useVideoConfig();
  const src = resolveAudioIn(ASSETS.musicFolder);
  if (!src) return null;
  const fadeStart = durationInFrames - sec(ASSETS.musicFadeOutSec);
  return (
    <Html5Audio
      src={src}
      volume={(f) =>
        interpolate(f, [0, 10, fadeStart, durationInFrames], [0, ASSETS.musicVolume, ASSETS.musicVolume, 0], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        })
      }
    />
  );
};
