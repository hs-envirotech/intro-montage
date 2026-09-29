import React, { createContext, useContext, useMemo } from "react";
import * as THREE from "three";
import type { Vec3 } from "../lib/anim";
import { colors, ease } from "../theme";

// ─────────────────────────────────────────────────────────────────────────────
// Render modes. Every piece of equipment is built from <Part>, so a whole plant
// can move between DESIGN (blueprint wireframe), ENGINEER (solid), BUILD
// (pieces arriving in sequence) and OPERATE (lit, flowing) from one context.
// ─────────────────────────────────────────────────────────────────────────────
export type RenderMode = {
  /** Opacity of the solid, shaded surfaces. */
  solid: number;
  /** Opacity of the blueprint edge lines. */
  wire: number;
  /** 0 = every part exploded/absent, 1 = everything in place. */
  assemble: number;
  /** How far parts travel in from when assembling. */
  explode: number;
  wireColor: string;
};

const defaultMode: RenderMode = { solid: 1, wire: 0, assemble: 1, explode: 6, wireColor: colors.aqua };
const ModeContext = createContext<RenderMode>(defaultMode);

export const RenderModeProvider: React.FC<{ mode: Partial<RenderMode>; children: React.ReactNode }> = ({
  mode,
  children,
}) => {
  const parent = useContext(ModeContext);
  return <ModeContext.Provider value={{ ...parent, ...mode }}>{children}</ModeContext.Provider>;
};

// ── Materials ───────────────────────────────────────────────────────────────
export type Finish = "frp" | "steel" | "blue" | "slate" | "concrete" | "dark" | "glass" | "cap";

const FINISH: Record<Finish, THREE.MeshPhysicalMaterialParameters> = {
  frp: { color: "#E4E9EE", roughness: 0.38, metalness: 0, clearcoat: 0.6, clearcoatRoughness: 0.3 },
  steel: { color: "#A9B4BE", roughness: 0.32, metalness: 0.9 },
  blue: { color: colors.navy, roughness: 0.4, metalness: 0.35, clearcoat: 0.4 },
  slate: { color: colors.slate, roughness: 0.55, metalness: 0.4 },
  concrete: { color: "#2A3642", roughness: 0.9, metalness: 0 },
  dark: { color: "#16202B", roughness: 0.6, metalness: 0.5 },
  glass: { color: "#9FB7C8", roughness: 0.08, metalness: 0, transmission: 0.6, thickness: 0.2, transparent: true },
  cap: { color: "#7D8C97", roughness: 0.3, metalness: 0.7 },
};

// ── Part ────────────────────────────────────────────────────────────────────
type PartProps = {
  geometry: THREE.BufferGeometry;
  finish: Finish;
  position?: Vec3;
  rotation?: Vec3;
  /** 0–1: where in the assembly sequence this part arrives. */
  order?: number;
  /** Direction the part flies in from while assembling. */
  from?: Vec3;
  emissive?: string;
  emissiveIntensity?: number;
};

export const Part: React.FC<PartProps> = ({
  geometry,
  finish,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  order = 0,
  from = [0, 1, 0],
  emissive,
  emissiveIntensity = 0,
}) => {
  const mode = useContext(ModeContext);
  const edges = useMemo(() => new THREE.EdgesGeometry(geometry, 25), [geometry]);

  // Each part gets its own slice of the assembly timeline.
  const spread = 0.7;
  const local = Math.min(1, Math.max(0, (mode.assemble - order * spread) / (1 - spread)));
  const t = ease.out(local);
  if (local <= 0) return null;
  const off = (1 - t) * mode.explode;
  const pos: Vec3 = [position[0] + from[0] * off, position[1] + from[1] * off, position[2] + from[2] * off];
  const arrive = Math.min(1, local * 3);

  const solid = mode.solid * arrive;
  const wire = mode.wire * arrive;

  return (
    <group position={pos} rotation={rotation}>
      {solid > 0.001 && (
        <mesh geometry={geometry}>
          <meshPhysicalMaterial
            {...FINISH[finish]}
            transparent={solid < 1 || FINISH[finish].transparent}
            opacity={solid}
            depthWrite={solid > 0.5}
            emissive={emissive ?? "#000000"}
            emissiveIntensity={emissiveIntensity}
          />
        </mesh>
      )}
      {wire > 0.001 && (
        <lineSegments geometry={edges}>
          <lineBasicMaterial color={mode.wireColor} transparent opacity={wire} depthWrite={false} />
        </lineSegments>
      )}
    </group>
  );
};

// ── Geometry cache (shared across parts) ────────────────────────────────────
const cache = new Map<string, THREE.BufferGeometry>();
const geo = (key: string, make: () => THREE.BufferGeometry) => {
  if (!cache.has(key)) cache.set(key, make());
  return cache.get(key)!;
};
export const cyl = (r: number, h: number, seg = 40) => geo(`cyl${r}-${h}-${seg}`, () => new THREE.CylinderGeometry(r, r, h, seg, 1));
export const box = (w: number, h: number, d: number) => geo(`box${w}-${h}-${d}`, () => new THREE.BoxGeometry(w, h, d));
export const sphere = (r: number) => geo(`sph${r}`, () => new THREE.SphereGeometry(r, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2));
export const torus = (r: number, t: number) => geo(`tor${r}-${t}`, () => new THREE.TorusGeometry(r, t, 12, 48));

// ── Pipe routing ────────────────────────────────────────────────────────────
/** Polyline with rounded bends, like real pipe routing with long-radius elbows. */
export const pipeCurve = (points: Vec3[], bend = 0.35) => {
  const path = new THREE.CurvePath<THREE.Vector3>();
  const v = points.map((p) => new THREE.Vector3(...p));
  let start = v[0].clone();
  for (let i = 1; i < v.length; i++) {
    const cur = v[i];
    if (i === v.length - 1) {
      path.add(new THREE.LineCurve3(start, cur));
      break;
    }
    const next = v[i + 1];
    const inDir = cur.clone().sub(v[i - 1]).normalize();
    const outDir = next.clone().sub(cur).normalize();
    const r = Math.min(bend, cur.distanceTo(v[i - 1]) / 2, next.distanceTo(cur) / 2);
    const a = cur.clone().sub(inDir.clone().multiplyScalar(r));
    const b = cur.clone().add(outDir.clone().multiplyScalar(r));
    path.add(new THREE.LineCurve3(start, a));
    path.add(new THREE.QuadraticBezierCurve3(a, cur, b));
    start = b;
  }
  return path;
};

export const Pipe: React.FC<{ points: Vec3[]; radius?: number; finish?: Finish; order?: number; from?: Vec3 }> = ({
  points,
  radius = 0.08,
  finish = "steel",
  order,
  from,
}) => {
  const key = JSON.stringify(points) + radius;
  const geometry = useMemo(
    () => geo(`pipe${key}`, () => new THREE.TubeGeometry(pipeCurve(points), Math.max(24, points.length * 24), radius, 14, false)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key],
  );
  return <Part geometry={geometry} finish={finish} order={order} from={from} />;
};

// ── Flow: animated stripes of light travelling along a pipe route ───────────
let stripeTexture: THREE.Texture | null = null;
const getStripeTexture = () => {
  if (stripeTexture) return stripeTexture;
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 4;
  const g = c.getContext("2d")!;
  const grad = g.createLinearGradient(0, 0, 256, 0);
  grad.addColorStop(0, "rgba(255,255,255,0)");
  grad.addColorStop(0.55, "rgba(255,255,255,0.15)");
  grad.addColorStop(0.9, "rgba(255,255,255,1)");
  grad.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, 256, 4);
  stripeTexture = new THREE.CanvasTexture(c);
  stripeTexture.wrapS = THREE.RepeatWrapping;
  stripeTexture.wrapT = THREE.RepeatWrapping;
  return stripeTexture;
};

export const Flow: React.FC<{
  points: Vec3[];
  frame: number;
  radius?: number;
  color?: string;
  /** 0–1: how much of the route the flow has reached. */
  reach?: number;
  opacity?: number;
  speed?: number;
  /** Stripes per unit length. */
  density?: number;
  /** A continuous luminous line (planned route) instead of moving stripes. */
  solid?: boolean;
}> = ({ points, frame, radius = 0.1, color = colors.aqua, reach = 1, opacity = 1, speed = 0.02, density = 0.35, solid = false }) => {
  const key = JSON.stringify(points) + radius;
  const { geometry, length } = useMemo(() => {
    const curve = pipeCurve(points);
    const g = new THREE.TubeGeometry(curve, Math.max(32, points.length * 32), radius, 8, false);
    return { geometry: g, length: curve.getLength() };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  const texture = useMemo(() => {
    const t = getStripeTexture().clone();
    t.needsUpdate = true;
    t.repeat.set(Math.max(1, Math.round(length * density)), 1);
    return t;
  }, [length, density]);
  texture.offset.x = -frame * speed * texture.repeat.x * 0.2;
  const count = geometry.index ? geometry.index.count : 0;
  // TubeGeometry indices run along the curve, so the draw range reveals the flow front.
  geometry.setDrawRange(0, Math.floor((count * Math.min(1, Math.max(0, reach))) / 6) * 6);
  if (reach <= 0 || opacity <= 0) return null;
  return (
    <mesh geometry={geometry}>
      <meshBasicMaterial
        color={color}
        alphaMap={solid ? null : texture}
        transparent
        opacity={opacity}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
  );
};

// ── Equipment ────────────────────────────────────────────────────────────────

/** RO/UF pressure vessel: horizontal FRP housing with end caps and ports. */
export const PressureVessel: React.FC<{ position: Vec3; length?: number; radius?: number; order?: number; from?: Vec3 }> = ({
  position,
  length = 6,
  radius = 0.2,
  order,
  from,
}) => (
  <group position={position}>
    <Part geometry={cyl(radius, length, 36)} finish="frp" rotation={[0, 0, Math.PI / 2]} order={order} from={from} />
    {[-1, 1].map((s) => (
      <group key={s}>
        <Part geometry={cyl(radius * 1.08, 0.12, 36)} finish="cap" position={[(s * length) / 2, 0, 0]} rotation={[0, 0, Math.PI / 2]} order={order} from={from} />
        <Part geometry={cyl(radius * 0.3, 0.25, 16)} finish="steel" position={[(s * length) / 2 + s * 0.12, 0, 0]} rotation={[0, 0, Math.PI / 2]} order={order} from={from} />
      </group>
    ))}
  </group>
);

/** A rack of pressure vessels on a steel frame, with feed and permeate headers. */
export const VesselRack: React.FC<{
  position?: Vec3;
  rows?: number;
  cols?: number;
  length?: number;
  radius?: number;
  pitch?: number;
  order?: number;
  from?: Vec3;
}> = ({ position = [0, 0, 0], rows = 4, cols = 6, length = 6, radius = 0.2, pitch = 0.55, order = 0, from = [0, 1, 0] }) => {
  const w = (cols - 1) * pitch;
  const h = (rows - 1) * pitch;
  const frameOrder = order;
  return (
    <group position={position}>
      {/* Frame uprights and rails */}
      {[-length / 2 + 0.3, length / 2 - 0.3].map((x) =>
        [-w / 2 - 0.35, w / 2 + 0.35].map((z) => (
          <Part key={`${x}${z}`} geometry={box(0.1, h + 1.2, 0.1)} finish="blue" position={[x, h / 2 + 0.2, z]} order={frameOrder} from={from} />
        )),
      )}
      {Array.from({ length: rows }).map((_, r) =>
        [-length / 2 + 0.3, length / 2 - 0.3].map((x) => (
          <Part key={`rail${r}${x}`} geometry={box(0.08, 0.06, w + 0.8)} finish="blue" position={[x, 0.4 + r * pitch - radius - 0.03, 0]} order={frameOrder} from={from} />
        )),
      )}
      {/* Vessels */}
      {Array.from({ length: rows }).map((_, r) =>
        Array.from({ length: cols }).map((__, c) => (
          <PressureVessel
            key={`${r}-${c}`}
            position={[0, 0.4 + r * pitch, -w / 2 + c * pitch]}
            length={length}
            radius={radius}
            order={order + 0.02 + ((r * cols + c) / (rows * cols)) * 0.12}
            from={from}
          />
        )),
      )}
      {/* Manifold risers and vessel ports at both ends */}
      {[-1, 1].map((s) =>
        Array.from({ length: cols }).map((_, c) => (
          <group key={`riser${s}${c}`}>
            <Part
              geometry={cyl(0.05, h + 0.3, 14)}
              finish="steel"
              position={[s * (length / 2 + 0.4), 0.25 + (h + 0.3) / 2, -w / 2 + c * pitch]}
              order={order + 0.16}
              from={from}
            />
            {Array.from({ length: rows }).map((__, r) => (
              <Part
                key={r}
                geometry={cyl(0.035, 0.2, 12)}
                finish="steel"
                position={[s * (length / 2 + 0.3), 0.4 + r * pitch, -w / 2 + c * pitch]}
                rotation={[0, 0, Math.PI / 2]}
                order={order + 0.16}
                from={from}
              />
            ))}
          </group>
        )),
      )}
      {/* Headers */}
      {[-1, 1].map((s) => (
        <Part
          key={s}
          geometry={cyl(0.09, w + 1.0, 20)}
          finish="steel"
          position={[s * (length / 2 + 0.4), 0.25, 0]}
          rotation={[Math.PI / 2, 0, 0]}
          order={order + 0.15}
          from={from}
        />
      ))}
    </group>
  );
};

/** End-suction centrifugal pump with motor on a baseplate. */
export const Pump: React.FC<{ position: Vec3; rotationY?: number; scale?: number; order?: number; from?: Vec3 }> = ({
  position,
  rotationY = 0,
  scale = 1,
  order,
  from,
}) => (
  <group position={position} rotation={[0, rotationY, 0]} scale={scale}>
    <Part geometry={box(1.9, 0.12, 0.7)} finish="dark" position={[0, 0.06, 0]} order={order} from={from} />
    <Part geometry={cyl(0.28, 0.9, 32)} finish="blue" position={[0.35, 0.45, 0]} rotation={[0, 0, Math.PI / 2]} order={order} from={from} />
    <Part geometry={cyl(0.34, 0.26, 32)} finish="slate" position={[-0.45, 0.45, 0]} rotation={[0, 0, Math.PI / 2]} order={order} from={from} />
    <Part geometry={cyl(0.12, 0.5, 16)} finish="steel" position={[-0.75, 0.45, 0]} rotation={[0, 0, Math.PI / 2]} order={order} from={from} />
    <Part geometry={cyl(0.1, 0.45, 16)} finish="steel" position={[-0.45, 0.85, 0]} order={order} from={from} />
  </group>
);

/** Vertical storage / process tank with a shallow dome roof. */
export const Tank: React.FC<{ position: Vec3; radius?: number; height?: number; finish?: Finish; order?: number; from?: Vec3 }> = ({
  position,
  radius = 1.4,
  height = 3.2,
  finish = "steel",
  order,
  from,
}) => (
  <group position={position}>
    <Part geometry={cyl(radius, height, 48)} finish={finish} position={[0, height / 2, 0]} order={order} from={from} />
    <group position={[0, height, 0]} scale={[1, 0.25, 1]}>
      <Part geometry={sphere(radius)} finish={finish} order={order} from={from} />
    </group>
    <Part geometry={torus(radius * 1.001, 0.03)} finish="cap" position={[0, height * 0.5, 0]} rotation={[Math.PI / 2, 0, 0]} order={order} from={from} />
  </group>
);

/** Skid-mounted cartridge filter / UF module bank (vertical housings). */
export const FilterBank: React.FC<{ position: Vec3; count?: number; order?: number; from?: Vec3 }> = ({
  position,
  count = 5,
  order,
  from,
}) => (
  <group position={position}>
    <Part geometry={box(count * 0.55 + 0.4, 0.14, 1.2)} finish="dark" position={[0, 0.07, 0]} order={order} from={from} />
    {Array.from({ length: count }).map((_, i) => (
      <group key={i} position={[-(count - 1) * 0.275 + i * 0.55, 0, 0]}>
        <Part geometry={cyl(0.2, 1.8, 28)} finish="frp" position={[0, 1.05, 0]} order={order} from={from} />
        <Part geometry={cyl(0.22, 0.1, 28)} finish="cap" position={[0, 1.98, 0]} order={order} from={from} />
      </group>
    ))}
    <Part geometry={cyl(0.07, count * 0.55, 16)} finish="steel" position={[0, 2.25, 0.3]} rotation={[0, 0, Math.PI / 2]} order={order} from={from} />
  </group>
);

/** Electrical / MCC panel line-up. */
export const Panels: React.FC<{ position: Vec3; count?: number; rotationY?: number; order?: number; from?: Vec3; led?: number }> = ({
  position,
  count = 4,
  rotationY = 0,
  order,
  from,
  led = 0,
}) => (
  <group position={position} rotation={[0, rotationY, 0]}>
    {Array.from({ length: count }).map((_, i) => (
      <group key={i} position={[i * 0.82, 0, 0]}>
        <Part geometry={box(0.8, 2.1, 0.6)} finish="slate" position={[0, 1.05, 0]} order={order} from={from} />
        <Part
          geometry={box(0.12, 0.04, 0.02)}
          finish="dark"
          position={[0.2, 1.7, 0.31]}
          emissive={i % 3 === 2 ? colors.seaGreen : colors.aqua}
          emissiveIntensity={led * 3}
          order={order}
          from={from}
        />
      </group>
    ))}
  </group>
);

/** Plant building shell: steel portal frame with a roof, open on one side. */
export const Building: React.FC<{ position: Vec3; w: number; d: number; h: number; order?: number; from?: Vec3 }> = ({
  position,
  w,
  d,
  h,
  order,
  from,
}) => (
  <group position={position}>
    <Part geometry={box(w, 0.2, d)} finish="concrete" position={[0, 0.1, 0]} order={order} from={from} />
    {Array.from({ length: Math.floor(w / 3) + 1 }).map((_, i) =>
      [-d / 2, d / 2].map((z) => (
        <Part key={`${i}${z}`} geometry={box(0.18, h, 0.18)} finish="blue" position={[-w / 2 + i * (w / Math.floor(w / 3)), h / 2, z]} order={order} from={from} />
      )),
    )}
    {/* Roof drawn translucent so the process inside stays readable from above */}
    <RoofMode>
      <Part geometry={box(w + 0.4, 0.15, d + 0.6)} finish="slate" position={[0, h + 0.08, 0]} order={(order ?? 0) + 0.05} from={from} />
    </RoofMode>
  </group>
);

const RoofMode: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const mode = useContext(ModeContext);
  return <ModeContext.Provider value={{ ...mode, solid: mode.solid * 0.28 }}>{children}</ModeContext.Provider>;
};
