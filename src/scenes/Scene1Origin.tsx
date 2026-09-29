import React, { useMemo } from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import * as THREE from "three";
import { COPY } from "../config";
import { cameraAt, clamp, lerp, prog, rand, type CamKey } from "../lib/anim";
import { Stage } from "../three/Stage";
import { Particles, getSprite } from "../three/Particles";
import { BUNDLE_Y, CUT_CAMERA, FIBRE_CENTRES, FIBRE_RADIUS } from "../three/fibres";
import { Vignette } from "../components/Typography";
import { colors, ease, fonts } from "../theme";

// Beats (frames)
const APPEAR = 16;
const FALL = 44;
const IMPACT = 100;
const REBOUND_IMPACT = 138;
const DIVE = [150, 182] as const;
const FORM = [170, 202] as const;
const DROP_START_Y = 0.72;

const CAMERA: CamKey[] = [
  { f: 0, pos: [0, 0.74, 1.1], target: [0, 0.68, 0], fov: 26 },
  { f: FALL, pos: [0, 0.7, 1.2], target: [0, 0.62, 0], fov: 26 },
  { f: IMPACT, pos: [0, 0.32, 1.55], target: [0, 0.06, 0], fov: 30 },
  { f: DIVE[0], pos: [0, 1.05, 2.1], target: [0, 0, -0.2], fov: 34 },
  { f: DIVE[1], pos: [0, -0.7, 0.2], target: [0, -2.2, -4], fov: 38 },
  { f: 210, ...CUT_CAMERA },
];

// ── Water surface with physically-motivated ring waves ──────────────────────
/** One seamless disc, densely tessellated near the impact and coarser far away. */
const polarSurface = () => {
  const RADIAL = 360;
  const ANGULAR = 280;
  const R = 30;
  const positions: number[] = [];
  const index: number[] = [];
  for (let i = 0; i <= RADIAL; i++) {
    const r = R * Math.pow(i / RADIAL, 2.2);
    for (let j = 0; j < ANGULAR; j++) {
      const a = (j / ANGULAR) * Math.PI * 2;
      positions.push(Math.cos(a) * r, 0, Math.sin(a) * r);
    }
  }
  for (let i = 0; i < RADIAL; i++) {
    for (let j = 0; j < ANGULAR; j++) {
      const a = i * ANGULAR + j;
      const b = i * ANGULAR + ((j + 1) % ANGULAR);
      const c = (i + 1) * ANGULAR + j;
      const d = (i + 1) * ANGULAR + ((j + 1) % ANGULAR);
      index.push(a, c, b, b, c, d);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  g.setIndex(index);
  return g;
};

const ringWave = (r: number, t: number, amp: number) => {
  if (t <= 0) return 0;
  const c = 0.55; // front speed (units/s)
  const lambda = 0.13;
  const front = c * t;
  if (r > front + 0.05) return 0;
  const behind = front - r;
  const envelope = Math.exp(-behind * 1.4) * Math.exp(-t * 0.9) * Math.min(1, (front + 0.05 - r) * 20) * Math.min(1, r * 10 + 0.15);
  return (amp * envelope * Math.sin(((r - front) / lambda) * Math.PI * 2)) / (1 + 4 * r);
};

const WaterSurface: React.FC<{ frame: number; below: boolean }> = ({ frame, below }) => {
  const geometry = useMemo(() => polarSurface(), []);
  const pos = geometry.getAttribute("position") as THREE.BufferAttribute;
  const t1 = (frame - IMPACT) / 30;
  const t2 = (frame - REBOUND_IMPACT) / 30;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const r = Math.sqrt(x * x + z * z);
    if (r > 6) continue;
    // Faint ambient swell so the surface is never dead flat.
    const swell = 0.0025 * Math.sin(x * 2.1 + frame * 0.03) * Math.cos(z * 1.7 + frame * 0.02);
    pos.setY(i, swell + ringWave(r, t1, 0.05) + ringWave(r, t2, 0.018));
  }
  pos.needsUpdate = true;
  geometry.computeVertexNormals();
  const material = (
    <meshPhysicalMaterial
      color={below ? "#0E3552" : "#02070C"}
      roughness={0.04}
      metalness={0}
      clearcoat={1}
      clearcoatRoughness={0.02}
      side={THREE.DoubleSide}
      transparent={below}
      opacity={below ? 0.85 : 1}
    />
  );
  return <mesh geometry={geometry}>{material}</mesh>;
};

// ── Droplet ─────────────────────────────────────────────────────────────────
const sphereGeo = new THREE.SphereGeometry(1, 16, 12);
// A real falling drop is nearly spherical (surface tension), not a teardrop:
// a sphere, very slightly flattened underneath, with no point.
const DROP_R = 0.06;
const dropGeometry = (() => {
  const pts: THREE.Vector2[] = [];
  for (let i = 0; i <= 48; i++) {
    const a = (i / 48) * Math.PI;
    const r = Math.sin(a) * DROP_R;
    const y = -Math.cos(a) * DROP_R * (Math.cos(a) > 0 ? 0.93 : 1);
    pts.push(new THREE.Vector2(Math.max(0.0001, r), y));
  }
  return new THREE.LatheGeometry(pts, 64);
})();

/** Fresnel rim: bright at grazing angles, like a rim-lit drop against black. */
const rimMaterial = new THREE.ShaderMaterial({
  uniforms: { uColor: { value: new THREE.Color("#CFF5FA") }, uStrength: { value: 1 } },
  vertexShader: `
    varying vec3 vN; varying vec3 vV;
    void main() {
      vec4 mv = modelViewMatrix * vec4(position, 1.0);
      vN = normalize(normalMatrix * normal);
      vV = normalize(-mv.xyz);
      gl_Position = projectionMatrix * mv;
    }`,
  fragmentShader: `
    uniform vec3 uColor; uniform float uStrength;
    varying vec3 vN; varying vec3 vV;
    void main() {
      float f = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), 2.0);
      // Brighter along the upper-left edge, where the key light sits.
      float side = 0.55 + 0.45 * clamp(dot(normalize(vN), normalize(vec3(-0.5, 0.8, 0.2))), 0.0, 1.0);
      gl_FragColor = vec4(uColor * f * side * uStrength * 2.6, f * uStrength);
    }`,
  transparent: true,
  blending: THREE.AdditiveBlending,
  depthWrite: false,
});

const Droplet: React.FC<{ y: number; stretch: number; scale?: number; opacity?: number }> = ({ y, stretch, scale = 1, opacity = 1 }) => (
  <group position={[0, y, 0]} scale={[scale / Math.sqrt(stretch), scale * stretch, scale / Math.sqrt(stretch)]}>
  <mesh geometry={dropGeometry} material={rimMaterial} scale={1.005} onBeforeRender={() => (rimMaterial.uniforms.uStrength.value = opacity)} />
  <mesh geometry={dropGeometry}>
    <meshPhysicalMaterial color="#0A2A36" roughness={0} metalness={0} clearcoat={1} clearcoatRoughness={0} transparent opacity={0.55 * opacity} depthWrite={false} />
  </mesh>
  {/* Focused light inside the lower drop: the caustic a real droplet forms */}
  <mesh position={[0.01, -0.03, 0.058]}>
    <planeGeometry args={[0.07, 0.035]} />
    <meshBasicMaterial map={getSprite()} color="#BDEFF6" transparent opacity={0.6 * opacity} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
  </mesh>
  </group>
);

let bokeh: THREE.Texture | null = null;
const getBokeh = () => {
  if (bokeh) return bokeh;
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 300;
  const g = c.getContext("2d")!;
  g.fillStyle = "#010408";
  g.fillRect(0, 0, 512, 300);
  const blob = (x: number, y: number, r: number, col: string) => {
    const gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, col);
    gr.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = gr;
    g.fillRect(0, 0, 512, 300);
  };
  blob(256, 150, 220, "rgba(22,177,196,0.35)");
  blob(170, 120, 90, "rgba(160,230,240,0.35)");
  blob(350, 170, 60, "rgba(33,82,138,0.6)");
  bokeh = new THREE.CanvasTexture(c);
  return bokeh;
};

/** Crown of fine droplets thrown out at impact — ballistic, no simulation state. */
const Splash: React.FC<{ frame: number }> = ({ frame }) => {
  const t = (frame - IMPACT) / 30;
  if (t <= 0 || t > 0.8) return null;
  return (
    <group>
      {Array.from({ length: 16 }).map((_, i) => {
        const a = (i / 16) * Math.PI * 2 + rand(`sa${i}`, -0.15, 0.15);
        const v = rand(`sv${i}`, 0.25, 0.5);
        const up = rand(`su${i}`, 0.6, 1.1);
        const x = Math.cos(a) * v * t;
        const z = Math.sin(a) * v * t;
        const yy = up * t - 4.9 * t * t;
        if (yy < -0.01) return null;
        const s = 0.006 * (1 - t);
        return (
          <mesh key={i} geometry={sphereGeo} position={[x, yy, z]} scale={s}>
            <meshPhysicalMaterial color="#DFF6F9" transmission={0.8} roughness={0} ior={1.33} thickness={0.01} />
          </mesh>
        );
      })}
    </group>
  );
};

/** Worthington jet: the column that rises after impact and releases one droplet. */
const Rebound: React.FC<{ frame: number }> = ({ frame }) => {
  const rise = interpolate(frame, [IMPACT + 3, IMPACT + 16, IMPACT + 26], [0, 1, 0], clamp);
  const dropT = (frame - (IMPACT + 16)) / 30;
  const dropY = 0.13 + 0.55 * dropT - 4.9 * dropT * dropT;
  return (
    <group>
      {rise > 0 && (
        <mesh position={[0, (0.13 * rise) / 2, 0]} scale={[0.018 * (1 - rise * 0.4), 0.13 * rise + 0.001, 0.018 * (1 - rise * 0.4)]}>
          <cylinderGeometry args={[0.6, 1, 1, 24]} />
          <meshPhysicalMaterial color="#FFFFFF" transmission={1} roughness={0} ior={1.33} thickness={0.03} attenuationColor={colors.aqua} attenuationDistance={0.3} />
        </mesh>
      )}
      {dropT > 0 && dropY > 0 && frame < REBOUND_IMPACT && <Droplet y={dropY} stretch={1} scale={0.32} />}
    </group>
  );
};

// ── Underwater: suspended particles that organise into membrane fibres ──────
const N_FINE = 10000;

const writeUnderwater = (frame: number) => (out: Float32Array) => {
  const form = ease.inOut(prog(frame, FORM[0], FORM[1], (t) => t));
  for (let i = 0; i < N_FINE; i++) {
    const bx = rand(`px${i}`, -5, 5);
    const by = rand(`py${i}`, -6, -0.15);
    const bz = rand(`pz${i}`, -26, 2.5);
    const ph = rand(`pp${i}`, 0, 6.28);
    const x = bx + Math.sin(frame * 0.012 + ph) * 0.06;
    const y = by + Math.cos(frame * 0.01 + ph) * 0.05 + frame * 0.0006;
    const z = bz;
    // Target: a point on the wall of one hollow fibre.
    const k = i % FIBRE_CENTRES.length;
    const a = rand(`pa${i}`, 0, Math.PI * 2);
    const tz = rand(`ptz${i}`, -28, -5);
    const tx = FIBRE_CENTRES[k][0] + Math.cos(a) * FIBRE_RADIUS;
    const ty = BUNDLE_Y + FIBRE_CENTRES[k][1] + Math.sin(a) * FIBRE_RADIUS;
    const stagger = Math.min(1, Math.max(0, form * 1.4 - rand(`ps${i}`, 0, 0.4)));
    out[i * 3] = lerp(x, tx, stagger);
    out[i * 3 + 1] = lerp(y, ty, stagger);
    out[i * 3 + 2] = lerp(z, tz, stagger);
  }
};

const N_FLECK = 260;
const writeFlecks = (frame: number) => (out: Float32Array) => {
  for (let i = 0; i < N_FLECK; i++) {
    out[i * 3] = rand(`fx${i}`, -4, 4) + Math.sin(frame * 0.008 + i) * 0.08;
    out[i * 3 + 1] = rand(`fy${i}`, -5, -0.3) + frame * 0.0008;
    out[i * 3 + 2] = rand(`fz${i}`, -18, 2);
  }
};

/** Soft volumetric shafts of light falling from the surface. */
const LightShafts: React.FC<{ opacity: number }> = ({ opacity }) => (
  <group>
    {Array.from({ length: 7 }).map((_, i) => (
      <mesh
        key={i}
        position={[rand(`lx${i}`, -3.5, 3.5), -3.2, rand(`lz${i}`, -12, -1)]}
        rotation={[rand(`lr${i}`, -0.12, 0.12), 0, rand(`lq${i}`, -0.2, 0.2)]}
      >
        <coneGeometry args={[rand(`lw${i}`, 0.6, 1.3), 6.4, 24, 1, true]} />
        <meshBasicMaterial
          color="#6FC9D6"
          transparent
          opacity={opacity * rand(`lo${i}`, 0.025, 0.06)}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          side={THREE.DoubleSide}
          toneMapped={false}
        />
      </mesh>
    ))}
  </group>
);

export const Scene1Origin: React.FC = () => {
  const frame = useCurrentFrame();
  // Slow-motion fall: long hang, then gravity.
  const fall = prog(frame, FALL, IMPACT, ease.in);
  const dropY = lerp(DROP_START_Y, DROP_R * 0.93, fall);

  const path = cameraAt(frame, CAMERA);
  // While the drop falls, the lens tilts with it (a slightly lagging follow-focus move).
  const follow = frame < IMPACT ? Math.min(1, prog(frame, FALL - 10, FALL + 10)) : 0;
  const cam = {
    ...path,
    target: [path.target[0], lerp(path.target[1], dropY - 0.02, follow), path.target[2]] as typeof path.target,
    pos: [path.pos[0], lerp(path.pos[1], dropY + 0.1, follow * 0.6), path.pos[2]] as typeof path.pos,
  };
  const below = cam.pos[1] < 0;
  const dropVisible = frame >= APPEAR && frame < IMPACT;
  const dropLight = interpolate(frame, [APPEAR, APPEAR + 26], [0, 1], clamp);

  const underwater = interpolate(frame, [DIVE[0] + 10, DIVE[1]], [0, 1], clamp);
  const flash = interpolate(frame, [IMPACT - 1, IMPACT + 2, IMPACT + 30], [0, 1, 0], clamp);

  const wordIn = interpolate(frame, [116, 130, 150, 164], [0, 1, 1, 0], clamp);
  const fadeIn = interpolate(frame, [0, 14], [0, 1], clamp);

  return (
    <AbsoluteFill style={{ backgroundColor: "#010408" }}>
      <AbsoluteFill style={{ opacity: fadeIn }}>
        <Stage
          camera={cam}
          background={below ? colors.deepNavy : "#010408"}
          fog={below ? { near: 0.5, far: 16 } : { near: 3, far: 9 }}
          env="night"
          envIntensity={below ? 0.4 : 1}
        >
          {/* Key: a narrow cool spot from above-behind catches the droplet and the ripple crests. */}
          <spotLight position={[0, 3.2, -2.4]} angle={0.45} penumbra={1} intensity={60 * dropLight} color="#CFF3F7" distance={9} />
          <pointLight position={[0.6, 0.9, 0.8]} intensity={0.6 * dropLight} color={colors.aqua} distance={3} />
          <pointLight position={[0, 0.02, 0]} intensity={4 * flash} color={colors.aqua} distance={1.5} />
          <ambientLight intensity={below ? 0.35 : 0.02} color="#9AD8E2" />

          {/* Out-of-focus light far behind the droplet, like a macro lens backdrop */}
          {!below && (
            <group>
              <mesh position={[0.3, 1.2, -3.5]}>
                <planeGeometry args={[7, 4.2]} />
                <meshBasicMaterial map={getBokeh()} color={new THREE.Color(1, 1, 1).multiplyScalar(0.4 + 1.4 * dropLight)} fog={false} toneMapped={false} />
              </mesh>
            </group>
          )}
          {/* Rim light just behind the falling drop */}
          {frame < IMPACT && <pointLight position={[0.05, dropY + 0.12, -0.5]} intensity={1.6 * dropLight} color="#DDF7FA" distance={1.4} />}
          <WaterSurface frame={frame} below={below} />
          {dropVisible && <Droplet y={dropY} stretch={1 + fall * 0.04} opacity={dropLight} />}
          <Splash frame={frame} />
          <Rebound frame={frame} />

          {underwater > 0 && (
            <group>
              <LightShafts opacity={underwater * (1 - prog(frame, FORM[0], FORM[1]))} />
              <Particles count={N_FINE} write={writeUnderwater(frame)} size={0.032} opacity={0.8 * underwater} />
              <Particles count={N_FLECK} write={writeFlecks(frame)} size={0.08} color="#7C95A6" opacity={0.5 * underwater} additive={false} />
            </group>
          )}
        </Stage>
      </AbsoluteFill>

      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "center",
          paddingBottom: 250,
          fontFamily: fonts.heading,
          fontWeight: 600,
          fontSize: 44,
          letterSpacing: "0.7em",
          paddingLeft: "0.7em",
          textTransform: "uppercase",
          color: "rgba(255,255,255,0.9)",
          opacity: wordIn,
        }}
      >
        {COPY.origin}
      </div>
      <Vignette strength={0.85} />
    </AbsoluteFill>
  );
};
