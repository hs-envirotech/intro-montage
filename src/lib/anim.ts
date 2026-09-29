import { interpolate, random } from "remotion";
import { ease } from "../theme";

export const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

type EaseFn = (t: number) => number;

/** Clamped 0→1 progress between two frames. */
export const prog = (frame: number, start: number, end: number, easing: EaseFn = ease.standard) =>
  interpolate(frame, [start, end], [0, 1], { ...clamp, easing });

/** Fade in over [a,b], hold, fade out over [c,d]. */
export const window4 = (frame: number, a: number, b: number, c: number, d: number) =>
  interpolate(frame, [a, b, c, d], [0, 1, 1, 0], clamp);

export type Vec3 = [number, number, number];

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const lerp3 = (a: Vec3, b: Vec3, t: number): Vec3 => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];

export type CamKey = { f: number; pos: Vec3; target: Vec3; fov?: number };

/**
 * Smooth camera path through keyframes. Each segment eases in/out, so the
 * camera never stops dead or jerks — it glides like a crane or drone move.
 */
export const cameraAt = (frame: number, keys: CamKey[], easing: EaseFn = ease.inOut) => {
  if (frame <= keys[0].f) return { ...keys[0], fov: keys[0].fov ?? 35 };
  for (let i = 0; i < keys.length - 1; i++) {
    const a = keys[i];
    const b = keys[i + 1];
    if (frame <= b.f) {
      const t = easing((frame - a.f) / (b.f - a.f));
      return {
        f: frame,
        pos: lerp3(a.pos, b.pos, t),
        target: lerp3(a.target, b.target, t),
        fov: lerp(a.fov ?? 35, b.fov ?? 35, t),
      };
    }
  }
  const last = keys[keys.length - 1];
  return { ...last, fov: last.fov ?? 35 };
};

/** Deterministic pseudo-random in [min, max). */
export const rand = (seed: string | number, min = 0, max = 1) => min + random(seed) * (max - min);
