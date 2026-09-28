import React from "react";
import { AbsoluteFill, Sequence } from "remotion";
import { z } from "zod";
import { SCENE_TIMINGS, type SceneId, type SceneTiming } from "./config";
import { Music } from "./components/Music";
import { Subtitles } from "./components/Subtitles";
import { Scene1Hook } from "./scenes/Scene1Hook";
import { Scene3WhoWeAre } from "./scenes/Scene3WhoWeAre";
import { Scene5Proof } from "./scenes/Scene5Proof";
import { Scene7Close } from "./scenes/Scene7Close";
import { PendingScene } from "./scenes/PendingScene";
import { colors } from "./theme";

export const introSchema = z.object({
  showSubtitles: z.boolean(),
});
export type IntroProps = z.infer<typeof introSchema>;

const SCENE_COMPONENTS: Partial<Record<SceneId, React.FC>> = {
  hook: Scene1Hook,
  whoWeAre: Scene3WhoWeAre,
  proof: Scene5Proof,
  close: Scene7Close,
};

export const renderScene = (scene: SceneTiming) => {
  const Component = SCENE_COMPONENTS[scene.id];
  return Component ? <Component /> : <PendingScene scene={scene} />;
};

export const EnvirotechIntro: React.FC<IntroProps> = ({ showSubtitles }) => (
  <AbsoluteFill style={{ backgroundColor: colors.black }}>
    {SCENE_TIMINGS.map((scene) => (
      <Sequence key={scene.id} name={scene.title} from={scene.from} durationInFrames={scene.durationInFrames}>
        {renderScene(scene)}
      </Sequence>
    ))}
    <Music />
    {showSubtitles && <Subtitles />}
  </AbsoluteFill>
);
