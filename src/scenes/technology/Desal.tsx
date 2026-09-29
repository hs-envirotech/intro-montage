import React, { useMemo } from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import * as THREE from "three";
import { cameraAt, prog, rand, type CamKey, type Vec3 } from "../../lib/anim";
import { project } from "../../lib/project";
import { Stage } from "../../three/Stage";
import { Building, FilterBank, Flow, Part, Pipe, Tank, box, cyl } from "../../three/Equipment";
import { Callout, ProcessLabel, Vignette } from "../../components/Typography";
import { COPY } from "../../config";
import { colors } from "../../theme";

export const DESAL_DURATION = 62;

const CAMERA: CamKey[] = [
  { f: 0, pos: [7, 1.4, 24], target: [0, 1.2, -40], fov: 32 },
  { f: DESAL_DURATION, pos: [4.2, 2.4, 9], target: [0, 1.4, -42], fov: 34 },
];

const SHORE_Z = -34;
const INTAKE: Vec3[] = [[0, -0.3, 30], [0, 0.5, 12], [0, 0.5, SHORE_Z - 2], [0, 0.5, SHORE_Z - 6], [-2, 0.5, SHORE_Z - 8]];

/** Dusk sky: deep navy overhead to a cool, low horizon light. */
const Sky: React.FC = () => {
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
        uniforms: {},
        vertexShader: `varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
        fragmentShader: `varying vec3 vP;
          void main(){
            float h = vP.y;
            vec3 top = vec3(0.027, 0.075, 0.13);
            vec3 mid = vec3(0.09, 0.19, 0.27);
            vec3 hor = vec3(0.30, 0.45, 0.52);
            vec3 c = mix(mid, top, smoothstep(0.02, 0.45, h));
            c = mix(hor, c, smoothstep(-0.01, 0.08, h));
            // Brighter where the sun has just set (behind the shore).
            float glow = pow(max(0.0, -vP.z), 6.0) * (1.0 - smoothstep(0.0, 0.18, h));
            c += vec3(0.10, 0.16, 0.18) * glow;
            gl_FragColor = vec4(c, 1.0);
          }`,
      }),
    [],
  );
  return (
    <mesh material={material}>
      <sphereGeometry args={[500, 32, 16]} />
    </mesh>
  );
};

const Sea: React.FC<{ frame: number }> = ({ frame }) => {
  const geometry = useMemo(() => {
    const g = new THREE.PlaneGeometry(260, 260, 180, 180);
    g.rotateX(-Math.PI / 2);
    return g;
  }, []);
  const pos = geometry.getAttribute("position") as THREE.BufferAttribute;
  const t = frame / 30;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const h =
      0.12 * Math.sin(x * 0.18 + z * 0.1 + t * 1.1) +
      0.07 * Math.sin(x * 0.41 - z * 0.23 + t * 1.7) +
      0.035 * Math.sin(x * 0.9 + z * 0.7 - t * 2.3);
    pos.setY(i, z > SHORE_Z ? h : -1);
  }
  pos.needsUpdate = true;
  geometry.computeVertexNormals();
  return (
    <mesh geometry={geometry}>
      <meshPhysicalMaterial color="#04111B" roughness={0.12} metalness={0} clearcoat={1} clearcoatRoughness={0.1} />
    </mesh>
  );
};

const Trees: React.FC = () => (
  <group>
    {Array.from({ length: 160 }).map((_, i) => {
      const x = rand(`tx${i}`, -90, 90);
      const z = SHORE_Z - rand(`tz${i}`, 14, 30);
      const s = rand(`ts${i}`, 1.2, 2.6);
      return (
        <mesh key={i} position={[x, s * 0.55, z]} scale={[s * 1.6, s * 0.75, s * 1.2]}>
          <icosahedronGeometry args={[1, 2]} />
          <meshStandardMaterial color="#061210" roughness={1} />
        </mesh>
      );
    })}
  </group>
);

export const Desal: React.FC = () => {
  const frame = useCurrentFrame();
  const cam = cameraAt(frame, CAMERA);
  const flow = prog(frame, 4, 50);
  const at = (p: Vec3) => project(p, cam);
  const intake = at([0, 0.7, 2]);
  const plant = at([-2, 3.6, SHORE_Z - 10]);

  return (
    <AbsoluteFill>
      <Stage camera={cam} env="night" envIntensity={0.22} fog={{ near: 30, far: 160, color: "#10283A" }} background="#0B2239">
        <Sky />
        <ambientLight intensity={0.25} color="#8FB7C8" />
        <directionalLight position={[-20, 12, -60]} intensity={0.8} color="#BFD9E2" />
        <Sea frame={frame} />
        {/* Shore and plant platform */}
        <Part geometry={box(300, 1, 60)} finish="concrete" position={[0, -0.4, SHORE_Z - 30]} />
        <Trees />
        <group position={[-2, 0.1, SHORE_Z - 12]}>
          <Building position={[0, 0, 0]} w={14} d={8} h={4.5} />
          <Tank position={[11, 0, -1]} radius={2.2} height={4} finish="frp" />
          <Tank position={[16, 0, -1]} radius={2.2} height={4} finish="frp" />
          <FilterBank position={[-11, 0, 1]} count={6} />
          {/* Lit windows along the plant building */}
          {Array.from({ length: 8 }).map((_, i) => (
            <mesh key={i} position={[-6 + i * 1.7, 2.6, 4.05]}>
              <planeGeometry args={[1.1, 0.35]} />
              <meshBasicMaterial color="#DDEFF3" toneMapped={false} />
            </mesh>
          ))}
        </group>
        {/* Intake pipeline on a pile trestle */}
        <Pipe points={INTAKE} radius={0.35} finish="slate" />
        {Array.from({ length: 12 }).map((_, i) => (
          <Part key={i} geometry={cyl(0.12, 3, 10)} finish="dark" position={[0, -1, 12 - i * 4]} />
        ))}
        <Flow points={INTAKE.slice(0, 3)} frame={frame} radius={0.4} color="#5E8E93" reach={flow * 1.2} opacity={0.55} speed={0.03} density={0.12} />
        <Flow points={INTAKE.slice(2)} frame={frame} radius={0.4} color={colors.aqua} reach={flow * 1.5 - 0.5} opacity={0.6} speed={0.03} density={0.2} />
      </Stage>

      <ProcessLabel long={COPY.technology[2].long} frame={frame} start={6} end={DESAL_DURATION} />
      <Callout x={intake.x} y={intake.y} label="Seawater intake" frame={frame} start={12} end={DESAL_DURATION} dx={110} dy={-60} />
      <Callout x={plant.x} y={plant.y} label="Treatment" frame={frame} start={24} end={DESAL_DURATION} dx={-100} dy={-70} />
      <Vignette />
    </AbsoluteFill>
  );
};
