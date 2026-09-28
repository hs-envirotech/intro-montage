import React from "react";
import { Composition, Folder } from "remotion";
import { SCENE_TIMINGS, TOTAL_FRAMES, VIDEO } from "./config";
import { EnvirotechIntro, introSchema, renderScene } from "./EnvirotechIntro";

export const RemotionRoot: React.FC = () => (
  <>
    <Composition
      id="EnvirotechIntro"
      component={EnvirotechIntro}
      schema={introSchema}
      defaultProps={{ showSubtitles: false }}
      durationInFrames={TOTAL_FRAMES}
      fps={VIDEO.fps}
      width={VIDEO.width}
      height={VIDEO.height}
    />
    {/* Each scene on its own, for focused review in Remotion Studio */}
    <Folder name="Scenes">
      {SCENE_TIMINGS.map((scene, i) => (
        <Composition
          key={scene.id}
          id={`Scene${i + 1}-${scene.id}`}
          component={() => renderScene(scene)}
          durationInFrames={scene.durationInFrames}
          fps={VIDEO.fps}
          width={VIDEO.width}
          height={VIDEO.height}
        />
      ))}
    </Folder>
  </>
);
