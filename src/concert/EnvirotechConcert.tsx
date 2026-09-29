import React from "react";
import { AbsoluteFill, Html5Audio, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { z } from "zod";
import { ShaderCanvas } from "./gl/ShaderCanvas";
import { CONCERT, LOOP_SEC, RAW_TAIL_SEC, SHOTS, beatAt, type ShotId } from "./timeline";
import { SHOT_RENDER, rawUniforms } from "./shots";
import { BrandReveal } from "./BrandReveal";
import { ProcessLabel } from "./ProcessLabel";

export const concertSchema = z.object({
  /** Shader resolution as a fraction of the output (1 = full; 0.5 for fast previews). */
  shaderScale: z.number().min(0.25).max(1),
  /** Process labels: off, names only, or names with a one-line descriptor. */
  labels: z.enum(["off", "names", "descriptors"]),
  /** Render a single shot on its own (for review); empty = the full loop. */
  only: z.string(),
  /** Include an original score (assets/concert_music/). */
  music: z.boolean(),
  /** Which score: cinematic electronic, or arena rock. */
  score: z.enum(["electronic", "rock"]),
});

// Written for this loop by tools/compose_concert_score*.py: same length, same 120 BPM grid.
const SCORES = {
  electronic: "concert_music/envirotech_concert_score.mp3",
  rock: "concert_music/envirotech_concert_score_rock.mp3",
} as const;
export type ConcertProps = z.infer<typeof concertSchema>;

type Layer = { key: string; id: ShotId; t: number; p: number; opacity: number };

const smoothFade = (x: number) => {
  const u = Math.min(Math.max(x, 0), 1);
  return u * u * (3 - 2 * u);
};

/** Which shots are visible at global time g, bottom to top. */
const layersAt = (g: number, only: string): Layer[] => {
  if (only) {
    const s = SHOTS.find((x) => x.id === only)!;
    return [{ key: s.id, id: s.id, t: g, p: g / s.durationSec, opacity: 1 }];
  }
  const out: Layer[] = [];
  SHOTS.forEach((s, i) => {
    const next = SHOTS[i + 1];
    const visibleUntil = next ? next.start : s.end;
    if (g >= s.start - s.fadeIn && g < visibleUntil) {
      const t = g - s.start;
      const opacity = s.fadeIn > 0 ? smoothFade((t + s.fadeIn) / s.fadeIn) : 1;
      out.push({ key: s.id, id: s.id, t, p: t / s.durationSec, opacity });
    }
  });
  // Raw water returns over the last seconds, so the last frame flows into the first.
  if (g >= LOOP_SEC - RAW_TAIL_SEC) {
    const t = g - LOOP_SEC;
    out.push({ key: "rawTail", id: "raw", t, p: 0, opacity: smoothFade((t + RAW_TAIL_SEC) / RAW_TAIL_SEC) });
  }
  return out;
};

export const EnvirotechConcert: React.FC<ConcertProps> = ({ shaderScale, labels, only, music, score }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const g = frame / fps;
  const { beat, bar, energy } = beatAt(only ? (SHOTS.find((s) => s.id === only)?.start ?? 0) + g : g);
  const layers = layersAt(g, only);

  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      {layers.map((l) => {
        const r = SHOT_RENDER[l.id];
        if (!r) return null;
        const extra = l.key === "rawTail" ? rawUniforms(l.t) : r.uniforms(l.t, l.p);
        return (
          <AbsoluteFill key={l.key} style={{ opacity: l.opacity }}>
            <ShaderCanvas
              frag={r.frag}
              scale={shaderScale}
              uniforms={{
                uT: l.t,
                uP: l.p,
                uGT: g,
                uBeat: beat,
                uBar: bar,
                uEnergy: energy,
                uFlash: 0,
                uExposure: r.exposure ? r.exposure(l.t, l.p) : 1,
                uCamPos: [0, 0, 0],
                uCamTgt: [0, 0, 1],
                uCamRoll: 0,
                uFocal: 1.5,
                ...extra,
              }}
            />
            {l.id === "brand" && <BrandReveal t={l.t} />}
          </AbsoluteFill>
        );
      })}
      <ProcessLabel g={g} only={only} mode={labels} />
      {music && !only && <Html5Audio src={staticFile(SCORES[score])} />}
    </AbsoluteFill>
  );
};

export const CONCERT_DEFAULTS: ConcertProps = { shaderScale: 1, labels: "descriptors", only: "", music: true, score: "electronic" };
export { CONCERT };
