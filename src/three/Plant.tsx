import React from "react";
import type { Vec3 } from "../lib/anim";
import { rand } from "../lib/anim";
import {
  Building,
  FilterBank,
  Flow,
  Panels,
  Part,
  Pipe,
  Pump,
  RenderModeProvider,
  Tank,
  VesselRack,
  box,
  type RenderMode,
} from "./Equipment";
import { colors } from "../theme";

// ─────────────────────────────────────────────────────────────────────────────
// A generic, procedurally laid-out water treatment plant. It is a concept
// visualisation of how technologies integrate — not a depiction of any
// specific Envirotech project. Process runs along +x:
// raw water → pretreatment → UF → HP pumps → RO → product water → distribution.
// ─────────────────────────────────────────────────────────────────────────────

const SPINE_Y = 2.8;
export const SPINE: Vec3[] = [[-20.5, 0.8, 0], [-18.5, 0.8, 0], [-18.5, SPINE_Y, 0], [15, SPINE_Y, 0], [15, 0.8, 0], [17.5, 0.8, 0]];
export const DISTRIBUTION: Vec3[] = [[17.5, 0.5, 0], [22, 0.5, 0], [22, 0.5, 9], [90, 0.5, 9]];
const DROP_X = [-15, -9, -3.5, 4];
const drops = (x: number): Vec3[][] => [
  [[x, SPINE_Y, 0], [x, SPINE_Y, -1.4], [x, 1.1, -1.4]],
  [[x, SPINE_Y, 0], [x, SPINE_Y, 1.4], [x, 1.1, 1.4]],
];
export const DROPS = DROP_X.flatMap(drops);

/** Assembly spreads outward from the RO trains — the technology at the heart of the system. */
const ord = (x: number, base = 0) => Math.min(0.95, base + (Math.abs(x - 4.2) / 27) * 0.85);

const Equipment: React.FC<{ led: number }> = ({ led }) => (
  <group>
    <Tank position={[-22, 0, -4.2]} radius={2} height={4.2} order={ord(-22)} />
    <Tank position={[-22, 0, 4.2]} radius={2} height={4.2} order={ord(-22)} />
    <FilterBank position={[-15, 0, -3.2]} count={5} order={ord(-15)} />
    <FilterBank position={[-15, 0, 3.2]} count={5} order={ord(-15)} />
    <FilterBank position={[-9, 0, -3.2]} count={7} order={ord(-9)} />
    <FilterBank position={[-9, 0, 3.2]} count={7} order={ord(-9)} />
    {[-3.8, -2.3, 2.3, 3.8].map((z) => (
      <Pump key={z} position={[-3.5, 0, z]} order={ord(-3.5)} />
    ))}
    <VesselRack position={[4.2, 0, -3.4]} rows={3} cols={4} length={5} order={ord(4)} />
    <VesselRack position={[4.2, 0, 3.4]} rows={3} cols={4} length={5} order={ord(4)} />
    <Tank position={[14, 0, -4.6]} radius={1.8} height={3.6} finish="frp" order={ord(14)} />
    <Tank position={[14, 0, 4.6]} radius={1.8} height={3.6} finish="frp" order={ord(14)} />
    {[-6.5, -5.4, -4.3].map((x) => (
      <Tank key={x} position={[x, 0, 7]} radius={0.42} height={1.3} finish="frp" order={ord(x, 0.1)} />
    ))}
    <Panels position={[-1.2, 0, 7.6]} count={6} order={ord(0, 0.1)} led={led} />
  </group>
);

const Pipework: React.FC = () => (
  <group>
    <Pipe points={SPINE} radius={0.14} order={0.1} />
    {DROPS.map((d, i) => (
      <Pipe key={i} points={d} radius={0.08} order={ord(d[0][0], 0.1)} />
    ))}
    <Pipe points={DISTRIBUTION} radius={0.2} finish="slate" order={0.85} />
    {/* Pipe rack supports along the spine */}
    {Array.from({ length: 12 }).map((_, i) => {
      const x = -17.5 + i * 3;
      return (
        <group key={i}>
          {[-0.6, 0.6].map((z) => (
            <Part key={z} geometry={box(0.12, SPINE_Y, 0.12)} finish="blue" position={[x, SPINE_Y / 2 - 0.15, z]} order={ord(x, 0.05)} from={[0, 1, 0]} />
          ))}
          <Part geometry={box(0.12, 0.12, 1.5)} finish="blue" position={[x, SPINE_Y - 0.2, 0]} order={ord(x, 0.05)} />
        </group>
      );
    })}
  </group>
);

/** Surroundings that place the plant in a wider infrastructure setting. */
const Context: React.FC<{ opacity: number }> = ({ opacity }) => {
  if (opacity <= 0) return null;
  return (
    <group>
      {/* Access roads, lit by low kerb lighting */}
      {[
        { p: [0, 0.02, -11] as Vec3, s: [120, 0.02, 3] as Vec3 },
        { p: [30, 0.02, 20] as Vec3, s: [3, 0.02, 80] as Vec3 },
        { p: [0, 0.02, 40] as Vec3, s: [160, 0.02, 3] as Vec3 },
      ].map((r, i) => (
        <mesh key={i} position={r.p}>
          <boxGeometry args={r.s} />
          <meshStandardMaterial color="#1A2632" roughness={0.9} transparent opacity={opacity} />
        </mesh>
      ))}
      {/* Distant storage reservoirs along the distribution route */}
      {[45, 60, 75].map((x) => (
        <Tank key={x} position={[x, 0, 14]} radius={3.2} height={3} finish="concrete" />
      ))}
      {/* Tree belts (low, dark, natural) */}
      {Array.from({ length: 34 }).map((_, c) => {
        const cx = rand(`ccx${c}`, -60, 100);
        const cz = rand(`ccz${c}`, 18, 45) * (c % 2 ? -1 : 1.4);
        return Array.from({ length: 9 }).map((__, i) => {
          const s = rand(`cts${c}-${i}`, 0.9, 1.9);
          return (
            <mesh key={`${c}-${i}`} position={[cx + rand(`cox${c}-${i}`, -3, 3), s * 0.6, cz + rand(`coz${c}-${i}`, -3, 3)]} scale={[s, s * 0.8, s]}>
              <icosahedronGeometry args={[1, 2]} />
              <meshStandardMaterial color="#163A2F" roughness={1} transparent opacity={opacity} />
            </mesh>
          );
        });
      })}
    </group>
  );
};

export type PlantProps = {
  frame: number;
  equipment?: Partial<RenderMode>;
  pipes?: Partial<RenderMode>;
  /** Blueprint guide lines for pipework, drawn regardless of solid state. */
  pipeGuides?: number;
  building?: Partial<RenderMode> | null;
  flow?: number;
  flowOpacity?: number;
  led?: number;
  grid?: number;
  context?: number;
};

export const Plant: React.FC<PlantProps> = ({
  frame,
  equipment = {},
  pipes = {},
  pipeGuides = 0,
  building = null,
  flow = 0,
  flowOpacity = 1,
  led = 0,
  grid = 0,
  context = 0,
}) => (
  <group>
    <Part geometry={box(260, 0.1, 200)} finish="concrete" position={[0, -0.06, 0]} />
    {grid > 0 && (
      <gridHelper args={[80, 80, colors.aqua, colors.aqua]} position={[0, 0.01, 0]}>
        <lineBasicMaterial attach="material" color={colors.aqua} transparent opacity={0.22 * grid} />
      </gridHelper>
    )}
    <Context opacity={context} />
    <RenderModeProvider mode={equipment}>
      <Equipment led={led} />
    </RenderModeProvider>
    <RenderModeProvider mode={pipes}>
      <Pipework />
    </RenderModeProvider>
    {pipeGuides > 0 && (
      <RenderModeProvider mode={{ solid: 0, wire: pipeGuides, assemble: 1 }}>
        <Pipework />
      </RenderModeProvider>
    )}
    {building && (
      <RenderModeProvider mode={building}>
        <Building position={[4.2, 0, 0]} w={15} d={13} h={5.2} />
      </RenderModeProvider>
    )}
    <Flow points={SPINE} frame={frame} radius={0.16} reach={flow * 1.1} opacity={0.75 * flowOpacity} />
    {DROPS.map((d, i) => (
      <Flow key={i} points={d} frame={frame} radius={0.095} reach={flow * 2.2 - 0.6 - i * 0.04} opacity={0.6 * flowOpacity} />
    ))}
    <Flow points={DISTRIBUTION} frame={frame} radius={0.23} reach={flow * 1.6 - 0.6} opacity={0.75 * flowOpacity} speed={0.03} density={0.12} />
  </group>
);
