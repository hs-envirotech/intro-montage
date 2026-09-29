import React from "react";
import { AbsoluteFill } from "remotion";
import { z } from "zod";
import { SCENE_OVERLAP, SCENE_TIMINGS, type SceneId, type SceneTiming } from "./config";
import { DraftContext } from "./components/Footage";
import { Shot } from "./components/Transitions";
import { Music } from "./components/Music";
import { Subtitles } from "./components/Subtitles";
import { Scene1Origin } from "./scenes/Scene1Origin";
import { Scene2Technology } from "./scenes/Scene2Technology";
import { Scene3Engineering } from "./scenes/Scene3Engineering";
import { Scene4Lifecycle } from "./scenes/Scene4Lifecycle";
import { Scene5Projects } from "./scenes/Scene5Projects";
import { Scene6Silverstreams } from "./scenes/Scene6Silverstreams";
import { Scene7Reveal } from "./scenes/Scene7Reveal";
import { colors } from "./theme";

export const introSchema = z.object({
  showSubtitles: z.boolean(),
  showPlaceholderLabels: z.boolean(),
});
export type IntroProps = z.infer<typeof introSchema>;

const SCENE_COMPONENTS: Record<SceneId, React.FC> = {
  origin: Scene1Origin,
  technology: Scene2Technology,
  engineering: Scene3Engineering,
  lifecycle: Scene4Lifecycle,
  projects: Scene5Projects,
  silverstreams: Scene6Silverstreams,
  reveal: Scene7Reveal,
};

export const renderScene = (scene: SceneTiming) => {
  const Component = SCENE_COMPONENTS[scene.id];
  return <Component />;
};

export const EnvirotechIntro: React.FC<IntroProps> = ({ showSubtitles, showPlaceholderLabels }) => (
  <DraftContext.Provider value={{ showPlaceholderLabels }}>
    <AbsoluteFill style={{ backgroundColor: colors.black }}>
      {SCENE_TIMINGS.map((scene, i) => {
        const first = i === 0;
        const last = i === SCENE_TIMINGS.length - 1;
        // Each scene runs SCENE_OVERLAP frames into the next, which pushes through it.
        return (
          <Shot
            key={scene.id}
            name={scene.title}
            from={scene.from}
            duration={scene.durationInFrames + (last ? 0 : SCENE_OVERLAP)}
            overlapIn={first ? 0 : SCENE_OVERLAP}
            overlapOut={last ? 0 : SCENE_OVERLAP}
          >
            {renderScene(scene)}
          </Shot>
        );
      })}
      <Music />
      {showSubtitles && <Subtitles />}
    </AbsoluteFill>
  </DraftContext.Provider>
);
