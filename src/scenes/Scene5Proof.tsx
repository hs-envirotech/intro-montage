import React from "react";
import { AbsoluteFill, Sequence, interpolate, useCurrentFrame } from "remotion";
import { Footage } from "../components/Footage";
import { COPY, SHOTS } from "../config";
import { colors, ease, eyebrowStyle, fonts } from "../theme";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

const BACKGROUNDS = [SHOTS.proofDemin, SHOTS.proofSwro, SHOTS.proofOperations];
const SHOT_LEN = 100;
const XFADE = 14;

const STAT_START = 18;
const STAT_STAGGER = 80;
const COUNT_LEN = 54;
const OUT = [286, 300] as const;

const format = (n: number) => n.toLocaleString("en-GB");

const Stat: React.FC<{ index: number; value: number; unit: string; label: string }> = ({ index, value, unit, label }) => {
  const frame = useCurrentFrame();
  const start = STAT_START + index * STAT_STAGGER;
  const inP = interpolate(frame, [start, start + 18], [0, 1], { ...clamp, easing: ease.out });
  const count = interpolate(frame, [start, start + COUNT_LEN], [0, value], { ...clamp, easing: ease.out });
  const rule = interpolate(frame, [start + 6, start + 40], [0, 1], { ...clamp, easing: ease.inOut });
  const labelIn = interpolate(frame, [start + 24, start + 44], [0, 1], { ...clamp, easing: ease.out });

  return (
    <div style={{ opacity: inP, transform: `translateY(${(1 - inP) * 24}px)` }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: unit.startsWith("-") ? 2 : 12, color: colors.white, whiteSpace: "nowrap" }}>
        <span
          style={{
            fontFamily: fonts.heading,
            fontWeight: 800,
            fontSize: 128,
            letterSpacing: "-0.03em",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {format(Math.round(count))}
        </span>
        <span style={{ fontFamily: fonts.heading, fontWeight: 600, fontSize: 44, color: colors.aqua }}>{unit}</span>
      </div>
      <div
        style={{
          height: 4,
          width: 140 * rule,
          marginTop: 14,
          borderRadius: 4,
          background: colors.seaGreen,
          boxShadow: `0 0 14px ${colors.seaGreen}88`,
        }}
      />
      <div
        style={{
          marginTop: 22,
          fontFamily: fonts.body,
          fontWeight: 600,
          fontSize: 34,
          color: "rgba(255,255,255,0.88)",
          opacity: labelIn,
        }}
      >
        {label}
      </div>
    </div>
  );
};

export const Scene5Proof: React.FC = () => {
  const frame = useCurrentFrame();
  const out = interpolate(frame, [...OUT], [1, 0], clamp);
  const eyebrow = interpolate(frame, [4, 24], [0, 1], { ...clamp, easing: ease.out });

  return (
    <AbsoluteFill style={{ backgroundColor: colors.navyNight }}>
      {/* Background footage, cross-dissolving shot to shot */}
      {BACKGROUNDS.map((shot, i) => {
        const from = i * SHOT_LEN;
        const len = i === BACKGROUNDS.length - 1 ? 300 - from : SHOT_LEN + XFADE;
        const fadeIn = i === 0 ? 1 : interpolate(frame, [from, from + XFADE], [0, 1], clamp);
        return (
          <Sequence key={shot.id} from={from} durationInFrames={len} layout="none">
            <AbsoluteFill style={{ opacity: fadeIn }}>
              <Footage shot={shot} labelPosition="top" />
            </AbsoluteFill>
          </Sequence>
        );
      })}

      {/* Navy protection gradient for legible stats */}
      <AbsoluteFill
        style={{
          background: `linear-gradient(180deg, ${colors.navyNight}66 0%, ${colors.navyDeep}cc 55%, ${colors.navyNight}f2 100%)`,
        }}
      />

      <AbsoluteFill style={{ opacity: out, padding: "0 150px", justifyContent: "flex-end", paddingBottom: 230 }}>
        <div style={{ ...eyebrowStyle, color: colors.aqua, opacity: eyebrow, marginBottom: 40 }}>
          Delivered capacity
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", columnGap: 80 }}>
          {COPY.proof.map((s, i) => (
            <Stat key={s.label} index={i} value={s.value} unit={s.unit} label={s.label} />
          ))}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
