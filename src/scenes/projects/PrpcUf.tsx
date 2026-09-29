import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { PROJECTS, SHOTS } from "../../config";
import { clamp } from "../../lib/anim";
import { FootageSlot } from "../../components/Footage";
import { Vignette } from "../../components/Typography";
import { IllustrativeTag } from "./ProjectLockup";
import { PrpcPfd } from "./PrpcPfd";
import { annotationStyle, colors, ease, fonts } from "../../theme";

export const PRPC_DURATION = 160;

type Stat = { value: number; decimals: number; unit: string; label: string };

/** Delivered-performance figures, counting up one after another. */
const StatRow: React.FC<{ stats: readonly Stat[]; frame: number; start: number }> = ({ stats, frame, start }) => (
  <div style={{ position: "absolute", left: 120, right: 120, bottom: 88, display: "grid", gridTemplateColumns: "1.3fr 1fr 1fr 0.8fr", columnGap: 48 }}>
    {stats.map((st, i) => {
      const s0 = start + i * 12;
      const a = interpolate(frame, [s0, s0 + 14], [0, 1], { ...clamp, easing: ease.out });
      const v = interpolate(frame, [s0, s0 + 40], [0, st.value], { ...clamp, easing: ease.out });
      return (
        <div key={st.label} style={{ opacity: a, transform: `translateY(${(1 - a) * 12}px)`, borderTop: `2px solid ${i === 0 ? colors.seaGreen : "rgba(22,177,196,0.5)"}`, paddingTop: 16 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8, whiteSpace: "nowrap" }}>
            <span style={{ fontFamily: fonts.heading, fontWeight: 800, fontSize: 64, color: colors.white, letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums" }}>
              {v.toFixed(st.decimals)}
            </span>
            <span style={{ fontFamily: fonts.heading, fontWeight: 600, fontSize: 24, color: colors.aqua }}>{st.unit}</span>
          </div>
          <div style={{ ...annotationStyle, fontSize: 13, letterSpacing: "0.18em", color: "rgba(255,255,255,0.75)", marginTop: 8, lineHeight: 1.5 }}>{st.label}</div>
        </div>
      );
    })}
  </div>
);

/** Title block, top-left: the project and what it delivers. */
const Header: React.FC<{ frame: number }> = ({ frame }) => {
  const p = PROJECTS.prpcUf;
  const a = (d: number) => interpolate(frame, [8 + d, 26 + d], [0, 1], { ...clamp, easing: ease.out });
  const rule = interpolate(frame, [6, 26], [0, 1], { ...clamp, easing: ease.out });
  const line: React.CSSProperties = { ...annotationStyle, letterSpacing: "0.2em" };
  return (
    <div style={{ position: "absolute", left: 120, top: 92 }}>
      <div style={{ ...line, fontSize: 17, color: colors.aqua, opacity: a(0) }}>{p.eyebrow}</div>
      <div style={{ width: 72 * rule, height: 2, background: colors.seaGreen, margin: "16px 0 18px" }} />
      <div style={{ display: "flex", alignItems: "baseline", gap: 36, opacity: a(4), transform: `translateY(${(1 - a(4)) * 12}px)` }}>
        <div style={{ fontFamily: fonts.heading, fontWeight: 700, fontSize: 92, lineHeight: 1, color: colors.white }}>{p.name}</div>
        <div>
          <div style={{ ...line, fontSize: 24, color: "rgba(255,255,255,0.9)" }}>{p.location}</div>
          <div style={{ ...line, fontSize: 19, color: colors.aqua, marginTop: 8 }}>{p.scope}</div>
        </div>
      </div>
      <div style={{ ...line, fontSize: 15, color: "rgba(255,255,255,0.62)", marginTop: 20, opacity: a(16) }}>
        {p.quality} &nbsp;·&nbsp; {p.delivery}
      </div>
    </div>
  );
};

export const PrpcUf: React.FC = () => {
  const frame = useCurrentFrame();
  const p = PROJECTS.prpcUf;
  return (
    <AbsoluteFill style={{ backgroundColor: colors.deepNavy }}>
      <FootageSlot
        shot={SHOTS.prpcUf}
        fallback={
          <>
            <PrpcPfd />
            <IllustrativeTag text="Simplified process flow" />
          </>
        }
      />
      <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(5,13,22,0.55) 0%, transparent 26%, transparent 70%, rgba(5,13,22,0.75) 100%)" }} />
      <Header frame={frame} />
      <StatRow stats={p.stats} frame={frame} start={40} />
      <Vignette />
    </AbsoluteFill>
  );
};
