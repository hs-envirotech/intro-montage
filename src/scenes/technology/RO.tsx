import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { cameraAt, clamp, prog, type CamKey, type Vec3 } from "../../lib/anim";
import { project } from "../../lib/project";
import { Stage } from "../../three/Stage";
import { Flow, Part, Pipe, Pump, VesselRack, box } from "../../three/Equipment";
import { Callout, ProcessLabel, Vignette } from "../../components/Typography";
import { COPY } from "../../config";
import { annotationStyle, colors, ease } from "../../theme";

export const RO_DURATION = 125;

const CAMERA: CamKey[] = [
  // Macro on a pressure-vessel end cap, then a long crane move along the rack.
  { f: 0, pos: [0.2, 2.6, 2.35], target: [0.9, 2.02, 1.375], fov: 26 },
  { f: 42, pos: [6.8, 2.6, 5.2], target: [0.6, 1.2, 0], fov: 34 },
  { f: RO_DURATION, pos: [-5.2, 2.3, 8.2], target: [-0.3, 1.0, 0], fov: 36 },
];

const FEED: Vec3[] = [[-5.1, 1.15, 0], [-5.1, 1.55, 0], [-3.9, 1.55, 0], [-3.9, 0.25, 0], [-3.4, 0.25, 0], [-3.4, 0.25, -1.45]];
const FEED_B: Vec3[] = [[-3.4, 0.25, 0], [-3.4, 0.25, 1.45]];
const PERMEATE: Vec3[] = [[3.3, 2.4, -1.45], [3.3, 2.4, 1.9], [5.6, 2.4, 1.9], [5.6, 0.2, 1.9], [9, 0.2, 1.9]];
const CONCENTRATE: Vec3[] = [[3.4, 0.25, 1.45], [3.4, 0.25, -1.9], [7, 0.25, -1.9]];
const COLS_Z = Array.from({ length: 6 }).map((_, c) => -1.375 + c * 0.55);

/** Dial gauge without figures: a needle rising as the pump comes up to pressure. */
const Gauge: React.FC<{ x: number; y: number; frame: number; start: number }> = ({ x, y, frame, start }) => {
  const a = interpolate(frame, [start, start + 10], [0, 1], clamp);
  const needle = interpolate(frame, [start + 4, start + 36], [-120, 35], { ...clamp, easing: ease.out });
  return (
    <div style={{ position: "absolute", left: x - 36, top: y - 36, opacity: a }}>
      <svg width="72" height="72" viewBox="-36 -36 72 72">
        <circle r="30" fill="rgba(11,34,57,0.6)" stroke={colors.aqua} strokeWidth="1.2" />
        {Array.from({ length: 11 }).map((_, i) => {
          const ang = ((-120 + i * 24) * Math.PI) / 180;
          return <line key={i} x1={Math.sin(ang) * 22} y1={-Math.cos(ang) * 22} x2={Math.sin(ang) * 27} y2={-Math.cos(ang) * 27} stroke="white" strokeOpacity="0.6" strokeWidth="1" />;
        })}
        <line x1="0" y1="0" x2={Math.sin((needle * Math.PI) / 180) * 20} y2={-Math.cos((needle * Math.PI) / 180) * 20} stroke={colors.seaGreen} strokeWidth="2" strokeLinecap="round" />
        <circle r="2.5" fill="white" />
      </svg>
      <div style={{ ...annotationStyle, fontSize: 13, color: "rgba(255,255,255,0.7)", textAlign: "center", marginTop: 4 }}>Pressure</div>
    </div>
  );
};

export const RO: React.FC = () => {
  const frame = useCurrentFrame();
  const cam = cameraAt(frame, CAMERA);
  const flowOn = prog(frame, 20, 70);
  const at = (p: Vec3) => project(p, cam);

  const pump = at([-5.4, 1.0, 0]);
  const feed = at([-3.9, 1.55, 0]);
  const perm = at([3.3, 2.4, 0.9]);
  const conc = at([3.4, 0.25, -1.2]);
  const vessel = at([0.5, 2.25, 1.375]);

  return (
    <AbsoluteFill>
      <Stage camera={cam} fog={{ near: 6, far: 24 }} envIntensity={0.45}>
        <ambientLight intensity={0.08} />
        {/* Overhead linear luminaires */}
        {[-3, 0, 3].map((x) => (
          <group key={x}>
            <mesh position={[x, 6, 0]}>
              <boxGeometry args={[2.4, 0.05, 0.12]} />
              <meshBasicMaterial color="#E9F6F8" toneMapped={false} />
            </mesh>
            <spotLight position={[x, 5.9, 0]} target-position={[x, 0, 0]} angle={0.9} penumbra={1} intensity={22} distance={12} color="#EAF6F8" />
          </group>
        ))}
        <pointLight position={[0, 0.6, 3.2]} intensity={1.5} color={colors.aqua} distance={5} />

        <Part geometry={box(40, 0.1, 30)} finish="concrete" position={[0, -0.05, 0]} />
        <VesselRack />
        <Pump position={[-5.6, 0, 0]} rotationY={Math.PI} scale={1.3} />
        <Pipe points={FEED} radius={0.09} />
        <Pipe points={FEED_B} radius={0.09} />
        <Pipe points={PERMEATE} radius={0.07} />
        <Pipe points={CONCENTRATE} radius={0.08} />

        <Flow points={FEED} frame={frame} radius={0.1} color="#7EA6C4" reach={flowOn * 1.4} opacity={0.6} />
        <Flow points={FEED_B} frame={frame} radius={0.1} color="#7EA6C4" reach={flowOn * 1.4 - 0.4} opacity={0.6} />
        {COLS_Z.map((z, i) => (
          <Flow key={i} points={[[-3.4, 0.25, z], [-3.4, 2.1, z]]} frame={frame} radius={0.06} color="#7EA6C4" reach={flowOn * 2 - 0.6 - i * 0.05} opacity={0.7} />
        ))}
        <Flow points={PERMEATE} frame={frame} radius={0.078} color={colors.aqua} reach={flowOn * 1.6 - 0.5} opacity={0.6} />
        <Flow points={CONCENTRATE} frame={frame} radius={0.09} color="#93A3AF" reach={flowOn * 1.6 - 0.55} opacity={0.55} />
      </Stage>

      <ProcessLabel short={COPY.technology[1].short} long={COPY.technology[1].long} frame={frame} start={6} end={RO_DURATION} />
      <Callout x={vessel.x} y={vessel.y} label="Pressure vessels" frame={frame} start={30} end={RO_DURATION} dx={80} dy={-80} />
      <Callout x={feed.x} y={feed.y} label="Feed" frame={frame} start={62} end={RO_DURATION} dx={-80} dy={-70} />
      <Callout x={conc.x} y={conc.y} label="Concentrate" frame={frame} start={70} end={RO_DURATION} dx={90} dy={60} color="#9FB0BC" />
      <Callout x={perm.x} y={perm.y} label="Permeate" frame={frame} start={52} end={RO_DURATION} dx={90} dy={-60} />
      <Callout x={pump.x} y={pump.y} label="High-pressure pump" frame={frame} start={78} end={RO_DURATION} dx={-100} dy={70} />
      {frame > 82 && <Gauge x={pump.x - 60} y={pump.y - 150} frame={frame} start={82} />}
      <Vignette />
    </AbsoluteFill>
  );
};
