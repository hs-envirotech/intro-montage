import React from "react";
import { Composition, Folder } from "remotion";
import { SCENE_TIMINGS, TOTAL_FRAMES, VIDEO } from "./config";
import { EnvirotechIntro, introSchema, renderScene } from "./EnvirotechIntro";
import { CONCERT_DEFAULTS, EnvirotechConcert, concertSchema } from "./concert/EnvirotechConcert";
import { CONCERT, LOOP_FRAMES, SHOTS } from "./concert/timeline";

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

    {/* Concert backdrop: a seamless loop for LED walls */}
    <Composition
      id="EnvirotechConcert"
      component={EnvirotechConcert}
      schema={concertSchema}
      defaultProps={CONCERT_DEFAULTS}
      durationInFrames={LOOP_FRAMES}
      fps={CONCERT.fps}
      width={CONCERT.width}
      height={CONCERT.height}
    />
    <Composition
      id="EnvirotechConcertUltrawide"
      component={EnvirotechConcert}
      schema={concertSchema}
      defaultProps={CONCERT_DEFAULTS}
      durationInFrames={LOOP_FRAMES}
      fps={CONCERT.fps}
      width={CONCERT.width * 2}
      height={CONCERT.height}
    />
    <Folder name="ConcertShots">
      {SHOTS.map((shot) => (
        <Composition
          key={shot.id}
          id={`Concert-${shot.id}`}
          component={EnvirotechConcert}
          schema={concertSchema}
          defaultProps={{ ...CONCERT_DEFAULTS, only: shot.id }}
          durationInFrames={Math.round(shot.durationSec * CONCERT.fps)}
          fps={CONCERT.fps}
          width={CONCERT.width}
          height={CONCERT.height}
        />
      ))}
    </Folder>
  </>
);
