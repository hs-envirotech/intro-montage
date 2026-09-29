import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { COPY } from "../config";
import { cameraAt, clamp, lerp, prog, rand, type CamKey } from "../lib/anim";
import { Stage } from "../three/Stage";
import { Plant } from "../three/Plant";
import { PlantLights } from "./Scene3Engineering";
import { Vignette } from "../components/Typography";
import { annotationStyle, colors, ease, fonts } from "../theme";

// One continuous tracking shot along the process direction. The plant itself
// moves through the delivery lifecycle as the camera travels.
const PHASES = [
  { word: COPY.lifecycle[0], start: 0, end: 66 }, // Design: blueprint wireframe
  { word: COPY.lifecycle[1], start: 66, end: 132 }, // Engineer: equipment becomes real
  { word: COPY.lifecycle[2], start: 132, end: 198 }, // Build: pipework and structure installed
  { word: COPY.lifecycle[3], start: 198, end: 300 }, // Operate: lit, monitored, flowing
];
const MODELS_IN = 244;

const CAMERA: CamKey[] = [
  { f: 0, pos: [-26, 8, 15], target: [-15, 1, 0], fov: 34 },
  { f: 110, pos: [-10, 6.5, 15.5], target: [-1, 1.4, 0], fov: 34 },
  { f: 210, pos: [5, 7, 16], target: [8, 1.3, 0], fov: 34 },
  { f: 300, pos: [18, 10, 20], target: [11, 0.8, 0], fov: 36 },
];

const LifecycleRow: React.FC<{ frame: number }> = ({ frame }) => {
  const rowOut = interpolate(frame, [MODELS_IN - 6, MODELS_IN + 10], [1, 0], clamp);
  const rowIn = interpolate(frame, [4, 18], [0, 1], clamp);
  const modelsIn = interpolate(frame, [MODELS_IN + 4, MODELS_IN + 22], [0, 1], { ...clamp, easing: ease.out });
  return (
    <>
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 830,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          gap: 36,
          opacity: rowIn * rowOut,
        }}
      >
        {PHASES.map((p, i) => {
          const active = interpolate(frame, [p.start, p.start + 10, p.end - 4, p.end + 6], [0, 1, 1, i === PHASES.length - 1 ? 1 : 0], clamp);
          const reached = frame >= p.start ? 1 : 0;
          return (
            <React.Fragment key={p.word}>
              {i > 0 && <div style={{ width: 70, height: 1, background: `rgba(22,177,196,${0.25 + 0.6 * reached})` }} />}
              <div
                style={{
                  ...annotationStyle,
                  fontSize: 30,
                  letterSpacing: "0.32em",
                  color: `rgba(255,255,255,${0.28 + 0.72 * active})`,
                  textShadow: active > 0.5 ? "0 0 24px rgba(22,177,196,0.35)" : undefined,
                }}
              >
                {p.word}
              </div>
            </React.Fragment>
          );
        })}
      </div>
      {/* Delivery models: the same lifecycle, packaged as integrated contracts */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 790,
          display: "flex",
          justifyContent: "center",
          gap: 60,
          opacity: modelsIn,
          transform: `translateY(${(1 - modelsIn) * 16}px)`,
        }}
      >
        {COPY.deliveryModels.map((m, i) => (
          <React.Fragment key={m}>
            {i > 0 && <div style={{ fontFamily: fonts.heading, fontSize: 64, color: colors.seaGreen, lineHeight: "84px" }}>·</div>}
            <div style={{ fontFamily: fonts.heading, fontWeight: 700, fontSize: 72, letterSpacing: "0.06em", color: colors.white }}>{m}</div>
          </React.Fragment>
        ))}
      </div>
    </>
  );
};

/** Minimal monitoring overlay for the OPERATE phase — status and trend, no figures. */
const MonitorHud: React.FC<{ frame: number }> = ({ frame }) => {
  const a = interpolate(frame, [206, 222, 286, 300], [0, 1, 1, 0.6], clamp);
  const draw = prog(frame, 210, 290, ease.inOut);
  const pts = Array.from({ length: 60 })
    .map((_, i) => {
      const x = (i / 59) * 300;
      const y = 44 - 18 * Math.sin(i * 0.19 + 1) * 0.5 - rand(`hud${i}`, -4, 4) - (i / 59) * 6;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  return (
    <div
      style={{
        position: "absolute",
        right: 110,
        top: 110,
        width: 340,
        padding: "18px 20px",
        border: "1px solid rgba(22,177,196,0.35)",
        borderRadius: 6,
        background: "rgba(6,18,30,0.55)",
        opacity: a,
      }}
    >
      <div style={{ ...annotationStyle, fontSize: 14, color: colors.aqua, marginBottom: 12 }}>System monitoring</div>
      {["Pretreatment", "UF", "RO", "Product water"].map((l, i) => {
        const on = frame > 214 + i * 8 ? 1 : 0.25;
        return (
          <div key={l} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 7 }}>
            <div style={{ width: 8, height: 8, borderRadius: 4, background: colors.seaGreen, opacity: on, boxShadow: on > 0.5 ? `0 0 8px ${colors.seaGreen}` : undefined }} />
            <div style={{ fontFamily: fonts.body, fontSize: 18, color: "rgba(255,255,255,0.82)" }}>{l}</div>
          </div>
        );
      })}
      <svg width="300" height="56" style={{ marginTop: 8 }}>
        <line x1="0" y1="55" x2="300" y2="55" stroke="rgba(255,255,255,0.2)" />
        <polyline points={pts} fill="none" stroke={colors.aqua} strokeWidth="1.6" strokeDasharray="600" strokeDashoffset={600 * (1 - draw)} />
      </svg>
    </div>
  );
};

export const Scene4Lifecycle: React.FC = () => {
  const frame = useCurrentFrame();
  const cam = cameraAt(frame, CAMERA, (t) => t * t * (3 - 2 * t));

  const engineer = prog(frame, 66, 118, ease.inOut);
  const build = prog(frame, 132, 196, (t) => t);
  const operate = prog(frame, 198, 240, ease.inOut);

  const wire = lerp(1, 0.12, engineer) * (1 - operate);
  const grid = 1 - prog(frame, 100, 170);

  return (
    <AbsoluteFill style={{ backgroundColor: colors.deepNavy }}>
      <Stage camera={cam} fog={{ near: 25, far: 90 }} envIntensity={0.4 + 0.1 * operate}>
        <PlantLights led={operate} />
        <Plant
          frame={frame}
          equipment={{ solid: engineer, wire, wireColor: colors.aqua }}
          pipes={{ solid: 1, wire: 0, assemble: build, explode: 4 }}
          pipeGuides={(1 - build) * 0.9}
          building={{ solid: 1, assemble: build * 0.85 + operate * 0.15, explode: 5 }}
          flow={operate}
          led={operate}
          grid={grid}
          context={Math.max(build * 0.7, operate)}
        />
      </Stage>
      <MonitorHud frame={frame} />
      <LifecycleRow frame={frame} />
      <Vignette />
    </AbsoluteFill>
  );
};
