import React, { useMemo } from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import * as THREE from "three";
import { cameraAt, prog, rand, type CamKey, type Vec3 } from "../../lib/anim";
import { project } from "../../lib/project";
import { Stage } from "../../three/Stage";
import { Particles } from "../../three/Particles";
import { BUNDLE_Y, CUT_CAMERA, FIBRE_CENTRES, FIBRE_RADIUS, FIBRE_Z } from "../../three/fibres";
import { Callout, ProcessLabel, Vignette } from "../../components/Typography";
import { COPY } from "../../config";
import { colors } from "../../theme";

export const UF_DURATION = 92;

// The hero fibre is on the outside of the bundle, cut away on the side facing camera.
const HERO = 7;
const [CX, CY0] = FIBRE_CENTRES[HERO];
const CY = BUNDLE_Y + CY0;
const HL = Math.hypot(CX, CY0);
const VIEW_DIR: [number, number] = [CX / HL, CY0 / HL];
const side = (d: number, z: number): Vec3 => [CX + VIEW_DIR[0] * d, CY + VIEW_DIR[1] * d + 0.25, z];
const CAMERA: CamKey[] = [
  { f: 0, ...CUT_CAMERA },
  { f: 50, pos: side(1.5, -12.2), target: [CX, CY, -17.2], fov: 34 },
  { f: UF_DURATION, pos: side(1.25, -13.4), target: [CX, CY - 0.02, -17.8], fov: 32 },
];

const LEN = FIBRE_Z[1] - FIBRE_Z[0];
const MID_Z = (FIBRE_Z[0] + FIBRE_Z[1]) / 2;

/** Micro-porous membrane surface: fine speckle used as a bump map. */
let poreTex: THREE.Texture | null = null;
const getPores = () => {
  if (poreTex) return poreTex;
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const g = c.getContext("2d")!;
  g.fillStyle = "#808080";
  g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 5000; i++) {
    const v = Math.floor(rand(`pore${i}`, 40, 200));
    g.fillStyle = `rgb(${v},${v},${v})`;
    g.fillRect(rand(`porx${i}`, 0, 256), rand(`pory${i}`, 0, 256), 1.5, 1.5);
  }
  poreTex = new THREE.CanvasTexture(c);
  poreTex.wrapS = poreTex.wrapT = THREE.RepeatWrapping;
  poreTex.repeat.set(6, 40);
  return poreTex;
};

const Fibre: React.FC<{ x: number; y: number; cut?: boolean; opacity: number }> = ({ x, y, cut, opacity }) => {
  const geometry = useMemo(() => {
    // Cut-away: leave the side facing the camera open so the lumen is visible.
    const open = cut ? Math.PI * 0.9 : 0;
    const g = new THREE.CylinderGeometry(FIBRE_RADIUS, FIBRE_RADIUS, LEN, 72, 1, true, open / 2, Math.PI * 2 - open);
    g.rotateX(Math.PI / 2);
    return g;
  }, [cut]);
  // Rotate so the opening faces the camera direction.
  const rotZ = cut ? Math.atan2(VIEW_DIR[1], VIEW_DIR[0]) - Math.PI / 2 : 0;
  return (
    <mesh geometry={geometry} position={[x, y, MID_Z]} rotation={[0, 0, rotZ]}>
      <meshPhysicalMaterial
        color={cut ? "#C9D5DD" : "#8FA4B3"}
        roughness={0.6}
        metalness={0}
        bumpMap={getPores()}
        bumpScale={0.6}
        transparent
        opacity={opacity * (cut ? 0.5 : 0.16)}
        side={THREE.DoubleSide}
        depthWrite={false}
      />
    </mesh>
  );
};

const N_WALL = 5000;
const writeWall = (out: Float32Array) => {
  for (let i = 0; i < N_WALL; i++) {
    const k = i % FIBRE_CENTRES.length;
    const a = rand(`pa${i}`, 0, Math.PI * 2);
    out[i * 3] = FIBRE_CENTRES[k][0] + Math.cos(a) * FIBRE_RADIUS;
    out[i * 3 + 1] = BUNDLE_Y + FIBRE_CENTRES[k][1] + Math.sin(a) * FIBRE_RADIUS;
    out[i * 3 + 2] = rand(`ptz${i}`, -28, -5);
  }
};

// Flow inside the centre fibre (inside-out UF): water passes the wall, solids are held back.
const WINDOW: [number, number] = [-24, -11];
const flowZ = (seed: string, frame: number, speed: number) => {
  const span = WINDOW[1] - WINDOW[0];
  const p = (rand(seed, 0, span) + frame * speed) % span;
  return WINDOW[1] - p;
};

const N_WATER = 900;
const writeWater = (frame: number) => (out: Float32Array) => {
  for (let i = 0; i < N_WATER; i++) {
    const a = rand(`wa${i}`, 0, Math.PI * 2);
    const r0 = rand(`wr${i}`, 0, FIBRE_RADIUS * 0.8);
    const age = (frame + rand(`wd${i}`, 0, 90)) % 90;
    // Radial drift outward under transmembrane pressure; passes through the wall.
    const r = r0 + age * 0.0075;
    out[i * 3] = CX + Math.cos(a) * r;
    out[i * 3 + 1] = CY + Math.sin(a) * r;
    out[i * 3 + 2] = flowZ(`wz${i}`, frame, 0.06);
  }
};

const N_SOLID = 240;
const writeSolids = (frame: number) => (out: Float32Array) => {
  for (let i = 0; i < N_SOLID; i++) {
    const a = rand(`sa${i}`, 0, Math.PI * 2);
    const r0 = rand(`sr${i}`, 0, FIBRE_RADIUS * 0.7);
    // Solids migrate to the wall and stop there: retained on the membrane surface.
    const r = Math.min(FIBRE_RADIUS - 0.03, r0 + frame * rand(`sv${i}`, 0.002, 0.006));
    out[i * 3] = CX + Math.cos(a) * r;
    out[i * 3 + 1] = CY + Math.sin(a) * r;
    out[i * 3 + 2] = flowZ(`sz${i}`, frame, 0.03);
  }
};

export const UF: React.FC = () => {
  const frame = useCurrentFrame();
  const cam = cameraAt(frame, CAMERA);
  const fibreIn = prog(frame, 0, 22);
  const flowIn = prog(frame, 18, 40);

  const at = (p: Vec3) => project(p, cam);
  const feed = at([CX, CY - 0.05, -19.2]);
  const wall = at([CX - VIEW_DIR[1] * FIBRE_RADIUS, CY + VIEW_DIR[0] * FIBRE_RADIUS, -16.8]);
  const perm = at([CX + VIEW_DIR[1] * 0.6, CY - VIEW_DIR[0] * 0.6, -16.2]);

  return (
    <AbsoluteFill>
      <Stage camera={cam} fog={{ near: 1.5, far: 9 }} envIntensity={0.18}>
        <ambientLight intensity={0.12} color="#9FD3DD" />
        <spotLight position={[CX + 1.5, CY + 3, -12]} angle={0.5} penumbra={1} intensity={16} color="#E6F7FA" distance={16} />
        <pointLight position={[CX, CY, -17]} intensity={0.8} color={colors.aqua} distance={3} />

        {FIBRE_CENTRES.map(([x, y], i) => (
          <Fibre key={i} x={x} y={BUNDLE_Y + y} cut={i === HERO} opacity={fibreIn} />
        ))}
        <Particles count={N_WALL} write={writeWall} size={0.032} opacity={0.8 * (1 - fibreIn)} />
        <Particles count={N_WATER} write={writeWater(frame)} size={0.028} color="#BFEFF5" opacity={0.85 * flowIn} />
        <Particles count={N_SOLID} write={writeSolids(frame)} size={0.07} color="#A39A80" opacity={0.95 * flowIn} additive={false} />
      </Stage>

      <ProcessLabel short={COPY.technology[0].short} long={COPY.technology[0].long} frame={frame} start={10} end={UF_DURATION} />
      <Callout x={feed.x} y={feed.y} label="Feed" frame={frame} start={34} end={UF_DURATION} dx={-90} dy={60} />
      <Callout x={wall.x} y={wall.y} label="Retained solids" frame={frame} start={44} end={UF_DURATION} dx={-110} dy={-80} />
      <Callout x={perm.x} y={perm.y} label="Permeate" frame={frame} start={54} end={UF_DURATION} dx={100} dy={-70} />
      <Vignette />
    </AbsoluteFill>
  );
};

