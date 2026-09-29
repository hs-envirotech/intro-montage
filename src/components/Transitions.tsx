import React from "react";
import { AbsoluteFill, Sequence, interpolate, useCurrentFrame } from "remotion";
import { clamp } from "../lib/anim";
import { ease } from "../theme";

/**
 * A shot inside a scene. Consecutive shots overlap by `overlap` frames and
 * "push through" each other — the outgoing image drifts forward and softens
 * while the incoming one settles into focus, like the camera travelling on.
 */
export const Shot: React.FC<{
  from: number;
  duration: number;
  overlapIn?: number;
  overlapOut?: number;
  children: React.ReactNode;
  name?: string;
}> = ({ from, duration, overlapIn = 0, overlapOut = 0, children, name }) => (
  <Sequence from={from} durationInFrames={duration} name={name} layout="none">
    <PushThrough duration={duration} overlapIn={overlapIn} overlapOut={overlapOut}>
      {children}
    </PushThrough>
  </Sequence>
);

const PushThrough: React.FC<{ duration: number; overlapIn: number; overlapOut: number; children: React.ReactNode }> = ({
  duration,
  overlapIn,
  overlapOut,
  children,
}) => {
  const f = useCurrentFrame();
  const inT = overlapIn > 0 ? interpolate(f, [0, overlapIn], [0, 1], { ...clamp, easing: ease.out }) : 1;
  const outT = overlapOut > 0 ? interpolate(f, [duration - overlapOut, duration], [0, 1], { ...clamp, easing: ease.in }) : 0;
  const scale = (1 - (1 - inT) * 0.05) * (1 + outT * 0.08);
  const blur = (1 - inT) * 10 + outT * 14;
  return (
    <AbsoluteFill
      style={{
        opacity: inT * (1 - outT),
        transform: `scale(${scale})`,
        filter: blur > 0.2 ? `blur(${blur}px)` : undefined,
      }}
    >
      {children}
    </AbsoluteFill>
  );
};
