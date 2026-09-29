import React, { useLayoutEffect, useMemo } from "react";
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import { useVideoConfig } from "remotion";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import type { Vec3 } from "../lib/anim";
import { colors } from "../theme";

export type EnvVariant = "studio" | "night";

/** Dark environment with a few long softbox strips: crisp highlights, deep blacks. */
const makeNightEnv = () => {
  const env = new THREE.Scene();
  env.background = new THREE.Color("#000000");
  const strip = (w: number, h: number, pos: [number, number, number], rotX: number, level: number, tint = "#EAF8FA") => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: tint, side: THREE.DoubleSide }));
    (m.material as THREE.MeshBasicMaterial).color.multiplyScalar(level);
    m.position.set(...pos);
    m.rotation.x = rotX;
    env.add(m);
  };
  strip(14, 0.5, [0, 6, -6], Math.PI / 2.4, 6);
  strip(10, 0.3, [0, 4, 7], -Math.PI / 2.6, 3);
  strip(0.4, 8, [-8, 3, 0], 0, 2, "#9FE3EC");
  strip(0.4, 8, [8, 3, -2], 0, 1.5, "#9FE3EC");
  // Low teal glow on the far horizon: dark water picks it up as a soft reflection.
  strip(40, 6, [0, 1.5, -18], 0, 0.2, "#1F8C9C");
  return env;
};

/** Image-based lighting so metal, FRP and water read as real materials. */
const Environment: React.FC<{ intensity: number; variant: EnvVariant }> = ({ intensity, variant }) => {
  const { gl, scene } = useThree();
  useMemo(() => {
    const pm = new THREE.PMREMGenerator(gl);
    scene.environment = pm.fromScene(variant === "night" ? makeNightEnv() : new RoomEnvironment(), 0.04).texture;
    pm.dispose();
  }, [gl, scene, variant]);
  useLayoutEffect(() => {
    scene.environmentIntensity = intensity;
  }, [scene, intensity]);
  return null;
};

const CameraRig: React.FC<{ pos: Vec3; target: Vec3; fov: number }> = ({ pos, target, fov }) => {
  const { camera } = useThree();
  useLayoutEffect(() => {
    camera.position.set(...pos);
    camera.lookAt(...target);
    if (camera instanceof THREE.PerspectiveCamera) {
      camera.fov = fov;
      camera.near = 0.01;
      camera.far = 2000;
      camera.updateProjectionMatrix();
    }
  }, [camera, pos, target, fov]);
  return null;
};

type StageProps = {
  camera: { pos: Vec3; target: Vec3; fov: number };
  background?: string;
  fog?: { near: number; far: number; color?: string };
  envIntensity?: number;
  env?: EnvVariant;
  exposure?: number;
  children: React.ReactNode;
};

/** A cinematic 3D stage: deep-navy void, filmic tone mapping, fog for depth. */
export const Stage: React.FC<StageProps> = ({
  camera,
  background = colors.deepNavy,
  fog,
  envIntensity = 0.35,
  env = "studio",
  exposure = 1,
  children,
}) => {
  const { width, height } = useVideoConfig();
  return (
    <ThreeCanvas
      width={width}
      height={height}
      style={{ position: "absolute", inset: 0 }}
      gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: exposure }}
      camera={{ fov: camera.fov, position: camera.pos }}
    >
      <color attach="background" args={[background]} />
      {fog && <fog attach="fog" args={[fog.color ?? background, fog.near, fog.far]} />}
      <Environment intensity={envIntensity} variant={env} />
      <CameraRig {...camera} />
      {children}
    </ThreeCanvas>
  );
};
