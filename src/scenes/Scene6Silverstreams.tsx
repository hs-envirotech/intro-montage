import React, { useMemo } from "react";
import * as THREE from "three";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { PROJECTS, SHOTS } from "../config";
import { cameraAt, prog, rand, type CamKey, type Vec3 } from "../lib/anim";
import { Stage } from "../three/Stage";
import { Flow, Part, Pipe, Tank, VesselRack, box, cyl } from "../three/Equipment";
import { Callout, Vignette } from "../components/Typography";
import { FootageSlot } from "../components/Footage";
import { project } from "../lib/project";
import { IllustrativeTag, ProjectLockup, lineStyle } from "./projects/ProjectLockup";
import { colors, ease } from "../theme";

// SILVERSTREAMS: 4 MLD SWRO desalination plant (DAF → UF → RO), 20+10-year
// BOT concession — AWARDED, not built, not operating. A concept visualisation
// modelled on the project's own concept renders: a fenced treatment compound
// inside a data-centre campus. The product-water route is drawn as a planned
// alignment (a line that draws on, with no moving flow).

// Plant first, then a crane up and back that reveals the data-centre campus it serves.
const CAMERA: CamKey[] = [
  { f: 0, pos: [-34, 30, 58], target: [-16, 1, -4], fov: 36 },
  { f: 95, pos: [-24, 36, 66], target: [-14, 0, -8], fov: 37 },
  { f: 220, pos: [-4, 112, 150], target: [-12, 0, -76], fov: 40 },
];

// Data halls laid out on a campus grid behind the water compound.
const HALLS: { p: Vec3; w: number }[] = [-62, -100, -138].flatMap((z) =>
  [-30, 34, 98].map((x) => ({ p: [x, 0, z] as Vec3, w: 52 })),
);
const CAMPUS_AT: Vec3 = [34, 10, -100];

// ── Campus context: grey data halls with the triangular façade ──────────────
let facadeTex: THREE.Texture | null = null;
const getFacade = () => {
  if (facadeTex) return facadeTex;
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 128;
  const g = c.getContext("2d")!;
  g.fillStyle = "#5E6A74";
  g.fillRect(0, 0, 512, 128);
  for (let i = 0; i < 8; i++) {
    const x = i * 64;
    g.fillStyle = "#3A444D";
    g.beginPath();
    g.moveTo(x, 128);
    g.lineTo(x + 32, 0);
    g.lineTo(x + 64, 128);
    g.closePath();
    g.fill();
  }
  facadeTex = new THREE.CanvasTexture(c);
  facadeTex.wrapS = THREE.RepeatWrapping;
  return facadeTex;
};

const DataHall: React.FC<{ position: Vec3; w: number; lit: number }> = ({ position, w, lit }) => (
  <group position={position}>
    <mesh position={[0, 5, 0]}>
      <boxGeometry args={[w, 10, 16]} />
      <meshStandardMaterial map={getFacade()} color="#AEB8C0" roughness={0.7} metalness={0.2} />
    </mesh>
    <mesh position={[0, 10.05, 0]}>
      <boxGeometry args={[w, 0.1, 16]} />
      <meshStandardMaterial color="#6C7780" roughness={0.8} />
    </mesh>
    {/* Rooftop chillers: the signature of a data hall from the air */}
    {[-4, 0, 4].map((z) =>
      Array.from({ length: Math.floor((w - 4) / 3.2) }).map((_, i) => (
        <group key={`${z}-${i}`} position={[-w / 2 + 3.6 + i * 3.2, 10.1, z]}>
          <Part geometry={box(2.6, 1.1, 2.8)} finish="steel" position={[0, 0.55, 0]} />
          <Part geometry={cyl(0.9, 0.08, 16)} finish="dark" position={[0, 1.15, 0]} />
        </group>
      )),
    )}
    {/* Warm-white façade uplights */}
    {Array.from({ length: Math.floor(w / 8) }).map((_, i) => (
      <pointLight key={i} position={[-w / 2 + 4 + i * 8, 2, 8.6]} intensity={6 * lit} distance={8} color="#EAF2F4" />
    ))}
  </group>
);

const Palm: React.FC<{ position: Vec3; s: number; seed: number }> = ({ position, s, seed }) => (
  <group position={position} scale={s}>
    <mesh position={[0, 2.2, 0]} rotation={[rand(`pl${seed}`, -0.1, 0.1), 0, rand(`pr${seed}`, -0.1, 0.1)]}>
      <cylinderGeometry args={[0.1, 0.16, 4.4, 6]} />
      <meshStandardMaterial color="#4A4034" roughness={1} />
    </mesh>
    {Array.from({ length: 7 }).map((_, i) => {
      const a = (i / 7) * Math.PI * 2 + seed;
      return (
        <mesh key={i} position={[Math.cos(a) * 0.9, 4.3, Math.sin(a) * 0.9]} rotation={[Math.sin(a) * 0.9, -a, Math.cos(a) * 0.9]} scale={[0.35, 1, 2.2]}>
          <coneGeometry args={[0.5, 0.12, 4]} />
          <meshStandardMaterial color="#1F4A33" roughness={1} />
        </mesh>
      );
    })}
  </group>
);

const Shrubs: React.FC<{ from: Vec3; to: Vec3; n: number; seed: string }> = ({ from, to, n, seed }) => (
  <group>
    {Array.from({ length: n }).map((_, i) => {
      const t = i / (n - 1);
      const s = rand(`${seed}s${i}`, 0.9, 1.7);
      return (
        <mesh
          key={i}
          position={[from[0] + (to[0] - from[0]) * t + rand(`${seed}x${i}`, -1, 1), s * 0.5, from[2] + (to[2] - from[2]) * t + rand(`${seed}z${i}`, -1, 1)]}
          scale={[s, s * 0.7, s]}
        >
          <icosahedronGeometry args={[1, 1]} />
          <meshStandardMaterial color="#1C4430" roughness={1} />
        </mesh>
      );
    })}
  </group>
);

// ── The compound ─────────────────────────────────────────────────────────────
const W = 64;
const D = 40;

const Fence: React.FC = () => {
  const posts: Vec3[] = [];
  for (let x = -W / 2; x <= W / 2; x += 4) posts.push([x, 0, -D / 2], [x, 0, D / 2]);
  for (let z = -D / 2 + 4; z < D / 2; z += 4) posts.push([-W / 2, 0, z], [W / 2, 0, z]);
  return (
    <group>
      {posts.map((p, i) => (
        <Part key={i} geometry={cyl(0.07, 2.4, 6)} finish="steel" position={[p[0], 1.2, p[2]]} />
      ))}
      {[
        { p: [0, 1.2, -D / 2] as Vec3, r: 0, l: W },
        { p: [0, 1.2, D / 2] as Vec3, r: 0, l: W },
        { p: [-W / 2, 1.2, 0] as Vec3, r: Math.PI / 2, l: D },
        { p: [W / 2, 1.2, 0] as Vec3, r: Math.PI / 2, l: D },
      ].map((f, i) => (
        <mesh key={i} position={f.p} rotation={[0, f.r, 0]}>
          <planeGeometry args={[f.l, 2.4]} />
          <meshStandardMaterial color="#9AA6AE" transparent opacity={0.18} side={THREE.DoubleSide} depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
};

/** Yellow kerb/lane markings as thin strips on the ground. */
const Marking: React.FC<{ p: Vec3; l: number; along: "x" | "z" }> = ({ p, l, along }) => (
  <mesh position={[p[0], 0.06, p[2]]}>
    <boxGeometry args={along === "x" ? [l, 0.02, 0.25] : [0.25, 0.02, l]} />
    <meshBasicMaterial color="#C9A93A" toneMapped={false} />
  </mesh>
);

// Blue product/process lines and stainless feed lines on the pipe rack.
const PIPE_Z = [-2.2, -1.5, -0.8];
const PIPE_Y = [3.6, 4.3];

// Positions of the three process stages, for the callouts.
const DAF_AT: Vec3 = [-26, 2.5, -6];
const UF_AT: Vec3 = [-8, 3.2, 3.5];
const RO_AT: Vec3 = [0, 4.5, -11];

const Compound: React.FC<{ lit: number }> = ({ lit }) => (
  <group>
    {/* Hardstanding inside the fence */}
    <Part geometry={box(W, 0.12, D)} finish="concrete" position={[0, 0.02, 0]} />
    <Fence />
    {/* Internal road loop + yellow markings */}
    <Marking p={[0, 0, 12]} l={W - 8} along="x" />
    <Marking p={[0, 0, 15.5]} l={W - 8} along="x" />
    <Marking p={[-W / 2 + 4, 0, 0]} l={D - 8} along="z" />

    {/* DAF: open tanks with yellow grating walkways (left edge) */}
    {[-11, -6, -1].map((z) => (
      <group key={z} position={[-26, 0, z]}>
        <Part geometry={box(5, 2.2, 4.2)} finish="concrete" position={[0, 1.1, 0]} />
        <mesh position={[0, 2.23, 0]}>
          <boxGeometry args={[4.6, 0.04, 3.8]} />
          <meshStandardMaterial color="#B89A2E" roughness={0.8} />
        </mesh>
      </group>
    ))}

    {/* Main process building: two white blocks with an open RO bay between them */}
    <Part geometry={box(16, 7, 12)} finish="frp" position={[-13, 3.5, -12]} />
    <Part geometry={box(14, 6, 12)} finish="frp" position={[14, 3, -12]} />
    <Part geometry={box(10, 3, 8)} finish="frp" position={[-13, 8.5, -12]} />
    {/* RO trains in the open bay (horizontal pressure vessels on frames) */}
    <VesselRack position={[0, 0.2, -14.5]} rows={4} cols={5} length={9} radius={0.32} pitch={0.8} />
    <VesselRack position={[0, 0.2, -9]} rows={4} cols={5} length={9} radius={0.32} pitch={0.8} />

    {/* Pipe rack across the front of the building: blue and stainless runs */}
    {PIPE_Z.flatMap((z, i) =>
      PIPE_Y.map((y, j) => (
        <Pipe key={`${i}${j}`} points={[[-22, y, z], [24, y, z]]} radius={0.22} finish={(i + j) % 2 ? "steel" : "blue"} />
      )),
    )}
    {Array.from({ length: 12 }).map((_, i) => {
      const x = -20 + i * 3.8;
      return (
        <group key={i}>
          <Pipe points={[[x, 4.3, -2.2], [x, 4.3, 0.8], [x, 2.6, 0.8]]} radius={0.14} finish={i % 2 ? "blue" : "steel"} />
          <Part geometry={box(0.18, 4.8, 0.18)} finish="steel" position={[x + 1.9, 2.4, -1.5]} />
        </group>
      );
    })}

    {/* UF: a row of white skid enclosures along the front */}
    {Array.from({ length: 10 }).map((_, i) => (
      <Part key={i} geometry={box(2.5, 3.2, 2.6)} finish="frp" position={[-19 + i * 2.8 + (i > 4 ? 2 : 0), 1.6, 2.5]} />
    ))}
    {/* Electrical / chemical annex */}
    <Part geometry={box(8, 3.8, 7)} finish="frp" position={[16, 1.9, 3]} />

    {/* Stainless process and product tanks (right) with a road tanker */}
    {[
      [24, -8, 1.6, 7],
      [28, -9, 1.6, 8],
      [24, -3, 1.4, 5.5],
      [28, -2.5, 1.8, 9],
    ].map(([x, z, r, h], i) => (
      <Tank key={i} position={[x, 0, z]} radius={r} height={h} finish="steel" />
    ))}
    <group position={[28, 0, 5]}>
      <Part geometry={cyl(1.1, 7, 24)} finish="steel" position={[0, 2, -1]} rotation={[Math.PI / 2, 0, 0]} />
      <Part geometry={box(2.4, 2.6, 2.4)} finish="frp" position={[0, 1.7, 3.6]} />
    </group>
    {/* Low tank at the left, like the reference */}
    <Tank position={[-21, 0, 4]} radius={1.8} height={2.6} finish="steel" />

    {/* Gatehouse and gate at the front */}
    <group position={[-12, 0, D / 2 + 3]}>
      <Part geometry={box(6, 3, 4)} finish="frp" position={[0, 1.5, 0]} />
      <Part geometry={box(7, 0.25, 5)} finish="frp" position={[0, 3.1, 0]} />
      <mesh position={[0, 1.6, 2.02]}>
        <planeGeometry args={[3, 1]} />
        <meshBasicMaterial color="#DDEFF3" toneMapped={false} transparent opacity={0.4 + 0.5 * lit} />
      </mesh>
    </group>
    <Part geometry={box(8, 1.8, 0.2)} finish="dark" position={[-20, 0.9, D / 2]} />

    {/* Site lighting */}
    {[-24, -8, 8, 24].map((x) => (
      <group key={x}>
        <Part geometry={cyl(0.08, 7, 6)} finish="steel" position={[x, 3.5, 9]} />
        <pointLight position={[x, 7, 9]} intensity={30 * lit} distance={22} color="#EEF5F6" />
      </group>
    ))}
  </group>
);

// Planned product-water alignment: compound → campus spine → every data hall.
const ROUTE: Vec3[] = [[30, 0.35, 12], [66, 0.35, 12], [66, 0.35, -160]];
const BRANCHES: Vec3[][] = HALLS.map(({ p: [x, , z] }) => [[66, 0.35, z + 12], [x, 0.35, z + 12], [x, 0.35, z + 8.2]]);

const Visualisation: React.FC = () => {
  const frame = useCurrentFrame();
  const cam = cameraAt(frame, CAMERA, (t) => t);
  const route = prog(frame, 90, 205, ease.inOut);
  const lit = prog(frame, 0, 60);
  const p = PROJECTS.silverstreams;
  const at = (v: Vec3) => project(v, cam);
  const daf = at(DAF_AT);
  const uf = at(UF_AT);
  const ro = at(RO_AT);
  const campus = at(CAMPUS_AT);

  const palms = useMemo(
    () =>
      Array.from({ length: 70 }).map((_, i) => {
        const side = i % 4;
        const t = rand(`pt${i}`, -1, 1);
        const pos: Vec3 =
          side === 0 ? [t * 60, 0, D / 2 + rand(`pz${i}`, 3, 14)]
          : side === 1 ? [t * 60, 0, -D / 2 - rand(`pz${i}`, 3, 10)]
          : side === 2 ? [-W / 2 - rand(`px${i}`, 3, 16), 0, t * 30]
          : [W / 2 + rand(`px${i}`, 3, 12), 0, t * 30];
        return { pos, s: rand(`ps${i}`, 1.4, 2.1) };
      }),
    [],
  );

  return (
    <AbsoluteFill>
      <Stage camera={cam} fog={{ near: 160, far: 520, color: "#14324C" }} envIntensity={0.55}>
        {/* Blue hour: cool sky light, a low warm-neutral key, site lights coming on */}
        <hemisphereLight args={["#A9CBE0", "#1C2A22", 1.2]} />
        <directionalLight position={[-60, 40, -40]} intensity={1.1} color="#E8EEF0" />
        <directionalLight position={[50, 60, 60]} intensity={0.6} color="#BFD6E2" />

        {/* Landscape */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]}>
          <planeGeometry args={[600, 600]} />
          <meshStandardMaterial color="#1B3526" roughness={1} />
        </mesh>
        {/* Campus roads */}
        {[
          { p: [0, 0.01, D / 2 + 20] as Vec3, s: [300, 0.02, 7] as Vec3 },
          { p: [-W / 2 - 22, 0.01, 0] as Vec3, s: [8, 0.02, 300] as Vec3 },
          { p: [66, 0.01, -80] as Vec3, s: [7, 0.02, 200] as Vec3 },
          ...[-62, -100, -138].map((z) => ({ p: [34, 0.01, z + 12] as Vec3, s: [200, 0.02, 5] as Vec3 })),
        ].map((r, i) => (
          <mesh key={i} position={r.p}>
            <boxGeometry args={r.s} />
            <meshStandardMaterial color="#232C33" roughness={0.9} />
          </mesh>
        ))}
        {HALLS.map((h, i) => (
          <DataHall key={i} position={h.p} w={h.w} lit={lit} />
        ))}

        <Compound lit={lit} />
        {palms.map((pl, i) => (
          <Palm key={i} position={pl.pos} s={pl.s} seed={i} />
        ))}
        <Shrubs from={[-W / 2, 0, D / 2 + 2]} to={[W / 2, 0, D / 2 + 2]} n={40} seed="front" />
        <Shrubs from={[-W / 2 - 2, 0, -D / 2]} to={[-W / 2 - 2, 0, D / 2]} n={24} seed="left" />

        <Flow points={ROUTE} frame={frame} radius={0.7} reach={route * 1.3} solid opacity={0.6} />
        {BRANCHES.map((b, i) => (
          <Flow key={i} points={b} frame={frame} radius={0.5} reach={route * 2.4 - 1 - i * 0.08} solid opacity={0.5} />
        ))}
      </Stage>
      <Callout x={daf.x} y={daf.y} label={p.process[0]} frame={frame} start={30} end={120} dx={-60} dy={-90} />
      <Callout x={uf.x} y={uf.y} label={p.process[1]} frame={frame} start={40} end={120} dx={-20} dy={-150} />
      <Callout x={ro.x} y={ro.y} label={p.process[2]} frame={frame} start={50} end={120} dx={70} dy={-90} />
      <Callout x={campus.x} y={campus.y} label="Data-centre campus" frame={frame} start={140} end={225} dx={90} dy={-90} />
    </AbsoluteFill>
  );
};

export const Scene6Silverstreams: React.FC = () => {
  const frame = useCurrentFrame();
  const p = PROJECTS.silverstreams;
  return (
    <AbsoluteFill style={{ backgroundColor: colors.deepNavy }}>
      <FootageSlot shot={SHOTS.silverstreams} fallback={<Visualisation />} zoom={[1.0, 1.06]} />
      <AbsoluteFill style={{ background: "linear-gradient(90deg, rgba(5,13,22,0.82) 0%, rgba(5,13,22,0.3) 42%, transparent 62%)" }} />
      <ProjectLockup
        frame={frame}
        start={16}
        eyebrow=""
        name={p.name}
        lines={[
          <div key="status" style={{ ...lineStyle, fontSize: 30, color: colors.aqua }}>{p.status}</div>,
          <div key="plant" style={{ ...lineStyle, fontSize: 22 }}>{p.plant}</div>,
          <div key="model" style={{ ...lineStyle, fontSize: 22 }}>{p.model}</div>,
          <div key="process" style={{ ...lineStyle, fontSize: 20, color: colors.aqua }}>{p.process.join("  →  ")}</div>,
        ]}
      />
      {/* Stays on even when the client's concept render is dropped in — it is a render, not a built plant. */}
      <IllustrativeTag text="Concept visualisation" />
      <Vignette />
    </AbsoluteFill>
  );
};
