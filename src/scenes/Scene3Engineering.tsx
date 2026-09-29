import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { COPY } from "../config";
import { cameraAt, prog, type CamKey } from "../lib/anim";
import { Stage } from "../three/Stage";
import { Plant } from "../three/Plant";
import { BeatWord, Vignette } from "../components/Typography";
import { colors, ease } from "../theme";

// Individual technologies assemble into one engineered system; the camera
// pulls back from equipment scale to plant scale to infrastructure scale.
const CAMERA: CamKey[] = [
  { f: 0, pos: [1.2, 1.9, 8.5], target: [4.2, 1.3, 2.4], fov: 34 },
  { f: 110, pos: [-6, 6.5, 17], target: [2, 1.2, 0], fov: 36 },
  { f: 220, pos: [-20, 17, 32], target: [2, 0.5, 0], fov: 36 },
  { f: 310, pos: [-30, 34, 50], target: [12, 0, 4], fov: 38 },
];

export const PlantLights: React.FC<{ led?: number }> = ({ led = 0 }) => (
  <group>
    <ambientLight intensity={0.12} color="#A9CFDA" />
    <directionalLight position={[-30, 40, 20]} intensity={0.9} color="#D8EAF0" />
    <directionalLight position={[30, 12, -30]} intensity={0.35} color={colors.aqua} />
    {/* Site lighting pools */}
    {[-18, -6, 6, 16].map((x) => (
      <pointLight key={x} position={[x, 7, 0]} intensity={18 + led * 10} distance={16} color="#EAF4F6" />
    ))}
  </group>
);

export const Scene3Engineering: React.FC = () => {
  const frame = useCurrentFrame();
  const cam = cameraAt(frame, CAMERA);
  const equipment = prog(frame, 0, 170, (t) => t);
  const pipes = prog(frame, 50, 210, (t) => t);
  const building = prog(frame, 170, 240, ease.out);
  const flow = prog(frame, 150, 270, ease.inOut);
  const context = prog(frame, 200, 280);

  return (
    <AbsoluteFill style={{ backgroundColor: colors.deepNavy }}>
      <Stage camera={cam} fog={{ near: 30, far: 120 }} envIntensity={0.4}>
        <PlantLights />
        <Plant
          frame={frame}
          equipment={{ assemble: equipment, explode: 7 }}
          pipes={{ assemble: pipes, explode: 5 }}
          building={{ assemble: building, solid: 1, explode: 4 }}
          flow={flow}
          context={context}
        />
      </Stage>
      <BeatWord word={COPY.engineering[0]} frame={frame} start={36} end={104} />
      <BeatWord word={COPY.engineering[1]} frame={frame} start={112} end={180} />
      <BeatWord word={COPY.engineering[2]} frame={frame} start={188} end={256} />
      <Vignette />
    </AbsoluteFill>
  );
};
