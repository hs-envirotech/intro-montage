import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { PROJECTS } from "../config";
import { cameraAt, prog, rand, type CamKey, type Vec3 } from "../lib/anim";
import { Stage } from "../three/Stage";
import { Flow, Part, Tank, box, cyl } from "../three/Equipment";
import { Vignette } from "../components/Typography";
import { IllustrativeTag, ProjectLockup, lineStyle } from "./projects/ProjectLockup";
import { colors, ease } from "../theme";

// SILVERSTREAMS is an AWARDED CONCESSION — not built, not operating. The
// campus is a concept visualisation, and the water routes are drawn as
// planned alignments (luminous lines that draw on, with no moving flow).

const CAMERA: CamKey[] = [
  { f: 0, pos: [-70, 46, 86], target: [4, 0, -4], fov: 32 },
  { f: 220, pos: [-34, 92, 128], target: [12, 0, -12], fov: 34 },
];

const HALLS: Vec3[] = Array.from({ length: 8 }).map((_, i) => [18 + (i % 4) * 30, 0, i < 4 ? -22 : 4]);

const DataHall: React.FC<{ position: Vec3; lit: number }> = ({ position, lit }) => (
  <group position={position}>
    <Part geometry={box(26, 6, 12)} finish="slate" position={[0, 3, 0]} />
    {/* Rooftop plant: rows of cooling units */}
    {Array.from({ length: 10 }).map((_, i) => (
      <Part key={i} geometry={box(1.8, 0.9, 2.4)} finish="dark" position={[-10.8 + i * 2.4, 6.45, -2.6]} />
    ))}
    {Array.from({ length: 10 }).map((_, i) => (
      <Part key={`b${i}`} geometry={box(1.8, 0.9, 2.4)} finish="dark" position={[-10.8 + i * 2.4, 6.45, 2.6]} />
    ))}
    {/* Façade light line */}
    <mesh position={[0, 5.2, 6.02]}>
      <boxGeometry args={[25.6, 0.12, 0.05]} />
      <meshBasicMaterial color="#CFEFF4" toneMapped={false} transparent opacity={0.45 + 0.55 * lit} />
    </mesh>
  </group>
);

const WaterFacility: React.FC = () => (
  <group position={[-38, 0, -8]}>
    {/* Clarifier-type circular basins */}
    {[
      [0, 0],
      [13, 0],
      [0, 13],
      [13, 13],
    ].map(([x, z]) => (
      <group key={`${x}${z}`} position={[x, 0, z]}>
        <Part geometry={cyl(5, 1.6, 64)} finish="concrete" position={[0, 0.8, 0]} />
        <mesh position={[0, 1.62, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[4.6, 64]} />
          <meshPhysicalMaterial color="#082030" roughness={0.1} clearcoat={1} />
        </mesh>
        <Part geometry={box(9.2, 0.2, 0.4)} finish="steel" position={[0, 1.9, 0]} />
      </group>
    ))}
    {/* Rectangular process basins */}
    <Part geometry={box(22, 1.8, 7)} finish="concrete" position={[6.5, 0.9, 25]} />
    <mesh position={[6.5, 1.82, 25]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[21, 6]} />
      <meshPhysicalMaterial color="#082030" roughness={0.1} clearcoat={1} />
    </mesh>
    {/* Treatment building and storage */}
    <Part geometry={box(16, 7, 10)} finish="slate" position={[30, 3.5, 4]} />
    <Tank position={[26, 0, 20]} radius={3} height={7} finish="frp" />
    <Tank position={[34, 0, 20]} radius={3} height={7} finish="frp" />
  </group>
);

const Vegetation: React.FC = () => (
  <group>
    {Array.from({ length: 60 }).map((_, c) => {
      const edge = c % 4;
      const t = rand(`vt${c}`, -1, 1);
      const cx = edge < 2 ? t * 150 + 30 : edge === 2 ? -95 : 150;
      const cz = edge === 0 ? -60 : edge === 1 ? 50 : t * 55 - 5;
      return Array.from({ length: 7 }).map((_, i) => {
        const s = rand(`vs${c}-${i}`, 2, 4);
        return (
          <mesh key={`${c}-${i}`} position={[cx + rand(`vx${c}-${i}`, -6, 6), s * 0.6, cz + rand(`vz${c}-${i}`, -6, 6)]} scale={[s, s * 0.75, s]}>
            <icosahedronGeometry args={[1, 2]} />
            <meshStandardMaterial color="#143628" roughness={1} />
          </mesh>
        );
      });
    })}
  </group>
);

// Planned water routes: facility → campus spine → each hall.
const MAIN: Vec3[] = [[-2, 0.4, -2], [6, 0.4, -2], [6, 0.4, -9], [128, 0.4, -9]];
const BRANCHES: Vec3[][] = HALLS.map(([x, , z]) => [[x, 0.4, -9], [x, 0.4, z < 0 ? z + 6.5 : z - 6.5]]);

export const Scene6Silverstreams: React.FC = () => {
  const frame = useCurrentFrame();
  const cam = cameraAt(frame, CAMERA, (t) => t);
  const route = prog(frame, 20, 150, ease.inOut);
  const lit = prog(frame, 0, 60);
  const p = PROJECTS.silverstreams;

  return (
    <AbsoluteFill style={{ backgroundColor: colors.deepNavy }}>
      <Stage camera={cam} fog={{ near: 90, far: 300, color: "#0C2336" }} envIntensity={0.35}>
        <ambientLight intensity={0.34} color="#9CC3D2" />
        <directionalLight position={[-60, 80, 40]} intensity={1.05} color="#CFE3EA" />
        <directionalLight position={[80, 30, -60]} intensity={0.3} color={colors.aqua} />
        <Part geometry={box(600, 0.1, 400)} finish="concrete" position={[0, -0.06, 0]} />
        {/* Campus roads */}
        {[
          { p: [30, 0.03, -9] as Vec3, s: [260, 0.02, 4] as Vec3 },
          { p: [30, 0.03, 30] as Vec3, s: [260, 0.02, 3] as Vec3 },
          { p: [4, 0.03, 10] as Vec3, s: [3, 0.02, 120] as Vec3 },
        ].map((r, i) => (
          <mesh key={i} position={r.p}>
            <boxGeometry args={r.s} />
            <meshStandardMaterial color="#1B2A37" roughness={0.9} />
          </mesh>
        ))}
        {HALLS.map((h, i) => (
          <DataHall key={i} position={h} lit={lit} />
        ))}
        <WaterFacility />
        <Vegetation />
        <Flow points={MAIN} frame={frame} radius={0.7} reach={route * 1.2} solid opacity={0.55} />
        {BRANCHES.map((b, i) => (
          <Flow key={i} points={b} frame={frame} radius={0.5} reach={route * 3 - 1.2 - i * 0.12} solid opacity={0.45} />
        ))}
      </Stage>
      <AbsoluteFill style={{ background: "linear-gradient(90deg, rgba(5,13,22,0.8) 0%, rgba(5,13,22,0.25) 40%, transparent 60%)" }} />
      <ProjectLockup
        frame={frame}
        start={16}
        eyebrow=""
        name={p.name}
        lines={[
          <div key="status" style={{ ...lineStyle, fontSize: 30, color: colors.aqua }}>{p.status}</div>,
          <div key="desc" style={{ ...lineStyle, fontSize: 20 }}>{p.descriptor}</div>,
        ]}
      />
      <IllustrativeTag text="Concept visualisation" />
      <Vignette />
    </AbsoluteFill>
  );
};
