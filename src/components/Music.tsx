import React from "react";
import { Html5Audio, interpolate, useVideoConfig } from "remotion";
import { ASSETS, sec } from "../config";
import { resolveAudioIn } from "../assets";

/** Your track in /assets/music (or the generated score), faded out on the final beat; silent if none. */
export const Music: React.FC = () => {
  const { durationInFrames } = useVideoConfig();
  const src = resolveAudioIn(ASSETS.musicFolder, ASSETS.generatedScore);
  if (!src) return null;
  const fadeStart = durationInFrames - sec(ASSETS.musicFadeOutSec);
  return (
    <Html5Audio
      src={src}
      trimBefore={sec(ASSETS.musicStartSec)}
      volume={(f) =>
        interpolate(f, [0, 10, fadeStart, durationInFrames], [0, ASSETS.musicVolume, ASSETS.musicVolume, 0], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        })
      }
    />
  );
};
