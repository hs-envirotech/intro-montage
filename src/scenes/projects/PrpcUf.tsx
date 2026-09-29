import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { PROJECTS, SHOTS } from "../../config";
import { clamp, prog } from "../../lib/anim";
import { FootageSlot } from "../../components/Footage";
import { Vignette } from "../../components/Typography";
import { IllustrativeTag, ProjectLockup, lineStyle } from "./ProjectLockup";
import { colors, ease } from "../../theme";

export const PRPC_DURATION = 160;

// ── Isometric engineering line drawing (fallback until site footage arrives) ──
// Modestly sized, containerised portable treatment units in an industrial
// setting. Deliberately a drawing, not a photoreal "fake" of the site.
const S = 36;
const CX = 1230;
const CY = 600;
const iso = (x: number, y: number, z: number) => [CX + (x - z) * 0.866 * S, CY + (x + z) * 0.5 * S - y * S] as const;
const pts = (list: (readonly [number, number])[]) => list.map((p) => p.join(",")).join(" ");

const LINE = "rgba(214,238,242,0.9)";
const FACE = "#0E2740";

type DrawProps = { p: number };

const IsoBox: React.FC<{ x: number; y?: number; z: number; w: number; h: number; d: number; p: number; ribs?: boolean }> = ({
  x,
  y = 0,
  z,
  w,
  h,
  d,
  p,
  ribs,
}) => {
  const c = (dx: number, dy: number, dz: number) => iso(x + dx, y + dy, z + dz);
  const top = [c(0, h, 0), c(w, h, 0), c(w, h, d), c(0, h, d)];
  const fx = [c(w, 0, 0), c(w, h, 0), c(w, h, d), c(w, 0, d)];
  const fz = [c(0, 0, d), c(w, 0, d), c(w, h, d), c(0, h, d)];
  const common = { stroke: LINE, strokeWidth: 1.4, pathLength: 1, strokeDasharray: 1, strokeDashoffset: 1 - p };
  return (
    <g>
      <polygon points={pts(fz)} fill={FACE} fillOpacity={p} {...common} />
      <polygon points={pts(fx)} fill="#0B2138" fillOpacity={p} {...common} />
      <polygon points={pts(top)} fill="#12314D" fillOpacity={p} {...common} />
      {ribs &&
        Array.from({ length: Math.floor(w / 0.5) - 1 }).map((_, i) => {
          const a = c(0.5 + i * 0.5, 0.15, d);
          const b = c(0.5 + i * 0.5, h - 0.15, d);
          return <line key={i} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke={LINE} strokeOpacity={0.35 * p} strokeWidth={1} />;
        })}
    </g>
  );
};

const IsoTank: React.FC<{ x: number; z: number; r: number; h: number; p: number }> = ({ x, z, r, h, p }) => {
  const [bx, by] = iso(x, 0, z);
  const [tx, ty] = iso(x, h, z);
  const rx = r * S * 1.22;
  const ry = r * S * 0.7;
  const common = { stroke: LINE, strokeWidth: 1.4, pathLength: 1, strokeDasharray: 1, strokeDashoffset: 1 - p };
  return (
    <g>
      <path d={`M${bx - rx} ${by} A${rx} ${ry} 0 0 0 ${bx + rx} ${by} L${tx + rx} ${ty} L${tx - rx} ${ty} Z`} fill={FACE} fillOpacity={p} {...common} />
      <ellipse cx={tx} cy={ty} rx={rx} ry={ry} fill="#12314D" fillOpacity={p} {...common} />
      <path d={`M${bx - rx} ${(by + ty) / 2} A${rx} ${ry} 0 0 0 ${bx + rx} ${(by + ty) / 2}`} fill="none" stroke={LINE} strokeOpacity={0.4 * p} />
    </g>
  );
};

/** Open skid frame with horizontal membrane vessels. */
const IsoSkid: React.FC<{ x: number; z: number; p: number }> = ({ x, z, p }) => {
  const w = 5;
  const d = 2;
  const h = 2.2;
  const c = (dx: number, dy: number, dz: number) => iso(x + dx, dy, z + dz);
  const edges: [number, number, number, number, number, number][] = [
    [0, 0, 0, w, 0, 0], [0, 0, d, w, 0, d], [0, 0, 0, 0, 0, d], [w, 0, 0, w, 0, d],
    [0, h, 0, w, h, 0], [0, h, d, w, h, d], [0, 0, d, 0, h, d], [w, 0, d, w, h, d], [w, 0, 0, w, h, 0], [0, 0, 0, 0, h, 0],
  ];
  return (
    <g>
      {edges.map((e, i) => {
        const a = c(e[0], e[1], e[2]);
        const b = c(e[3], e[4], e[5]);
        return <line key={i} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke={colors.navy} strokeWidth={3} strokeDasharray="1" pathLength={1} strokeDashoffset={1 - p} />;
      })}
      {[0.6, 1.2, 1.8].map((yy) =>
        [0.55, 1.45].map((zz) => {
          const a = c(0.2, yy, zz);
          const b = c(w - 0.2, yy, zz);
          return (
            <g key={`${yy}${zz}`}>
              <line x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke={LINE} strokeWidth={9} strokeLinecap="round" strokeOpacity={0.85 * p} />
              <line x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke={FACE} strokeWidth={6} strokeLinecap="round" strokeOpacity={p} />
            </g>
          );
        }),
      )}
    </g>
  );
};

const IsoPipe: React.FC<{ path: [number, number, number][]; p: number; color?: string; width?: number }> = ({ path, p, color = colors.aqua, width = 3 }) => (
  <polyline
    points={pts(path.map(([x, y, z]) => iso(x, y, z)))}
    fill="none"
    stroke={color}
    strokeWidth={width}
    strokeLinejoin="round"
    pathLength={1}
    strokeDasharray={1}
    strokeDashoffset={1 - p}
  />
);

/** Faint generic industrial backdrop: columns and a pipe rack in the distance. */
const Backdrop: React.FC<DrawProps> = ({ p }) => (
  <g opacity={0.22 * p}>
    {[-12, -9, -4, 2, 6].map((x, i) => {
      const [bx, by] = iso(x, 0, -14);
      const [, ty] = iso(x, 7 + (i % 3) * 3, -14);
      return <rect key={x} x={bx - 10} y={ty} width={20} height={by - ty} fill="none" stroke={LINE} strokeWidth={1} />;
    })}
    {Array.from({ length: 9 }).map((_, i) => {
      const a = iso(-14 + i * 3.4, 0, -9);
      const b = iso(-14 + i * 3.4, 4, -9);
      return <line key={i} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke={LINE} strokeWidth={1} />;
    })}
    <IsoPipe path={[[-14, 4, -9], [14, 4, -9]]} p={1} color={LINE} width={1.5} />
    <IsoPipe path={[[-14, 3.6, -9], [14, 3.6, -9]]} p={1} color={LINE} width={1.5} />
  </g>
);

const Drawing: React.FC = () => {
  const frame = useCurrentFrame();
  const k = (a: number, b: number) => prog(frame, a, b, ease.inOut);
  const push = interpolate(frame, [0, PRPC_DURATION], [1, 1.06]);
  const grid = interpolate(frame, [0, 20], [0, 1], clamp);
  return (
    <AbsoluteFill style={{ background: `radial-gradient(ellipse at 62% 50%, #10304C 0%, ${colors.deepNavy} 55%, #050D16 100%)` }}>
      <svg width="1920" height="1080" style={{ position: "absolute", inset: 0, transform: `scale(${push})`, transformOrigin: "62% 50%" }}>
        {/* Isometric ground grid */}
        <g opacity={0.12 * grid}>
          {Array.from({ length: 31 }).map((_, i) => {
            const a = iso(-15 + i, 0, -15);
            const b = iso(-15 + i, 0, 15);
            const c = iso(-15, 0, -15 + i);
            const d = iso(15, 0, -15 + i);
            return (
              <g key={i}>
                <line x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke={colors.aqua} />
                <line x1={c[0]} y1={c[1]} x2={d[0]} y2={d[1]} stroke={colors.aqua} />
              </g>
            );
          })}
        </g>
        <Backdrop p={k(10, 50)} />
        {/* Painter's order: far → near */}
        <IsoBox x={-5} z={-4.5} w={6.1} h={2.6} d={2.4} p={k(8, 40)} ribs />
        <IsoSkid x={2.5} z={-4.2} p={k(24, 60)} />
        <IsoTank x={10.5} z={-2.5} r={1.3} h={3.8} p={k(30, 62)} />
        <IsoBox x={-5} z={-0.6} w={6.1} h={2.6} d={2.4} p={k(14, 46)} ribs />
        <IsoPipe path={[[1.1, 1, 0.6], [2.5, 1, 0.6], [2.5, 1, -2.6], [7.5, 1, -2.6], [9.2, 1, -2.6]]} p={k(44, 80)} />
        <IsoTank x={10.5} z={1.8} r={1.3} h={3.8} p={k(36, 68)} />
        <IsoPipe path={[[9.2, 1, -2.6], [9.2, 1, 1.8], [9.4, 1, 1.8]]} p={k(62, 90)} />
      </svg>
    </AbsoluteFill>
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
            <Drawing />
            <IllustrativeTag text="Illustrative drawing" />
          </>
        }
      />
      <AbsoluteFill style={{ background: "linear-gradient(90deg, rgba(5,13,22,0.85) 0%, rgba(5,13,22,0.35) 45%, transparent 70%)" }} />
      <ProjectLockup
        frame={frame}
        start={14}
        eyebrow={p.eyebrow}
        name={p.name}
        lines={[
          <div key="loc" style={lineStyle}>{p.location}</div>,
          <div key="scope" style={{ ...lineStyle, fontSize: 20, color: colors.aqua }}>{p.scope}</div>,
        ]}
      />
      <Vignette />
    </AbsoluteFill>
  );
};
