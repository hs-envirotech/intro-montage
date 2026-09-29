import type { Uniforms } from "./gl/ShaderCanvas";
import type { ShotId } from "./timeline";
import { RAW } from "./glsl/raw";
import { SCREENING } from "./glsl/screening";
import { COAGULATION } from "./glsl/coagulation";
import { UF_ARRAY, UF_FIBRE, UF_FIELD } from "./glsl/ultrafiltration";
import { RO_MEMBRANE, RO_RACKS } from "./glsl/reverseOsmosis";
import { ION_EXCHANGE } from "./glsl/ionExchange";
import { STREAM } from "./glsl/stream";
import { PLANT } from "./glsl/plant";
import { NETWORK } from "./glsl/network";
import { type Key, type Vec3, lerp, smooth, spline } from "./camera";

/** Camera that travels along `keys` and looks slightly ahead, banking into turns. */
const flyCam = (keys: Key[], t: number, ahead = 0.8, bank = 0.05, focal = 1.5) => {
  const pos = spline(keys, t);
  const tgt = spline(keys, t + ahead);
  const a = spline(keys, t - 0.3);
  const b = spline(keys, t + 0.3);
  const lateral = (b[0] - a[0]) / 0.6;
  return { uCamPos: pos, uCamTgt: tgt, uCamRoll: -lateral * bank, uFocal: focal };
};

const mixV = (a: Vec3, b: Vec3, u: number): Vec3 => [lerp(a[0], b[0], u), lerp(a[1], b[1], u), lerp(a[2], b[2], u)];

const SCREEN_Z_END = 150;
const SCREEN_KEYS: Key[] = [
  [-3, [0.2, 1.8, -16]],
  [0, [0.8, 1.7, 0]],
  [4, [-1.4, 2.9, 27]],
  [8, [1.3, 1.4, 60]],
  [12, [-0.4, 2.0, 102]],
  [14.5, [0, 2.5, 133]],
  [16.5, [0, 2.6, 156]],
];

// Mirrors pathX() in the UF field shader: the open lane through the fibres.
const ufPathX = (z: number) => 0.31 + Math.sin(z * 0.11) * 1.24;
// Mirrors pathIX() in the ion-exchange shader.
const ixPath = (z: number): Vec3 => [1.3 * Math.sin(z * 0.11), 0.8 * Math.sin(z * 0.07 + 1), z];

const UF_ARRAY_POS: Key[] = [
  [-1, [5.8, 2.8, 5.0]],
  [0, [5.6, 3.0, 4.8]],
  [3, [2, 7, -2]],
  [6, [-10, 16, -16]],
];
const UF_ARRAY_TGT: Key[] = [
  [-1, [5.2, 2.9, 2.6]],
  [0, [5.2, 3.0, 2.8]],
  [3, [6, 2, 5]],
  [6, [10, 0, 12]],
];

const RO_POS: Key[] = [
  [-0.5, [0, 1.3, -3]],
  [0, [0, 1.3, 0]],
  [5, [0, 1.6, 40]],
  [8, [3, 12, 56]],
  [11, [-3, 17, 66]],
  [14, [0, 5.5, 76]],
  [16, [0.9, 3.9, 80.5]],
];
const RO_TGT: Key[] = [
  [-0.5, [0.6, 1.5, 7]],
  [0, [0.6, 1.5, 10]],
  [5, [0.8, 1.8, 52]],
  [8, [10, 0, 72]],
  [11, [4, 2, 86]],
  [14, [1.2, 3.9, 82]],
  [16, [1.6, 3.9, 80.5]],
];

const PLANT_POS: Key[] = [
  [-1.5, [12, 0.9, 12]],
  [0, [12, 1.2, 12]],
  [2, [8, 8, 2]],
  [5, [-20, 45, -35]],
  [7.5, [-40, 60, -60]],
  [9.2, [-12, 22, -78]],
  [10.8, [0.3, 5, -64]],
  [13, [0.3, 3.8, -22]],
  [15, [0.3, 3.5, 20]],
  [18, [20, 30, 60]],
  [22, [110, 70, 20]],
  [26, [80, 95, -90]],
];
const PLANT_TGT: Key[] = [
  [-1.5, [12.4, 0, 13.5]],
  [0, [12.5, 0, 14]],
  [2, [12, 0, 12]],
  [5, [10, 0, 10]],
  [7.5, [20, 0, 20]],
  [9.2, [0, 2, -40]],
  [10.8, [0, 5, -40]],
  [15, [0, 6, 40]],
  [18, [0, 0, 20]],
  [22, [0, 0, 0]],
  [26, [0, 0, 0]],
];

const roMembraneZ = (t: number) => (t <= 0 ? 0 : t < 9 ? 12 * Math.pow(t / 9, 1.8) : 12 + 0.5 * (t - 9));

export type ShotRender = {
  frag: string;
  /** Extra uniforms for local time t (s) and progress p (0..1). */
  uniforms: (t: number, p: number) => Uniforms;
  /** Exposure multiplier over the shot, for fades to/from darkness. */
  exposure?: (t: number, p: number) => number;
};

/** Raw water, driven by a time that runs continuously across the loop point. */
export const rawUniforms = (rt: number): Uniforms => {
  const x = Math.max(rt - 10, 0) / 12;
  return {
    uReveal: 0.1 + 0.9 * smooth(1, 16, rt),
    uLight: smooth(5, 14, rt),
    uFlow: smooth(11, 21.5, rt),
    uStream: smooth(12, 19, rt),
    uCamZ: 0.25 * rt + 26 * x * x * x,
    uSpeed: 0.25 + (26 * 3 * x * x) / 12,
    uNavy: 0,
  };
};

export const SHOT_RENDER: Partial<Record<ShotId, ShotRender>> = {
  raw: { frag: RAW, uniforms: (t) => rawUniforms(t) },
  screening: {
    frag: SCREENING,
    uniforms: (t) => {
      const cam = flyCam(SCREEN_KEYS, t, 0.9, 0.06, 1.35);
      const k = smooth(13.8, 15.6, t);
      return { ...cam, uCamTgt: mixV(cam.uCamTgt, [0, 2.6, SCREEN_Z_END + 10], k), uZEnd: SCREEN_Z_END };
    },
    exposure: (t) => 1 - 0.85 * smooth(15.2, 16, t),
  },
  coagulation: {
    frag: COAGULATION,
    uniforms: (t) => {
      const z = 2.4 * t;
      return {
        uCamPos: [0.35 * Math.sin(t * 0.3), 0.25 * Math.sin(t * 0.23), z],
        uCamTgt: [0.2 * Math.sin((t + 1) * 0.3), 0.1, z + 4],
        uCamRoll: 0.1 * Math.sin(t * 0.2),
        uFocal: 1.3,
        uCamZ: z,
        uFloc: smooth(1.5, 9, t),
        uSep: smooth(9, 13.5, t),
      };
    },
  },
  ufField: {
    frag: UF_FIELD,
    uniforms: (t) => {
      const z = 1.1 * t + 0.03 * t * t;
      const y = 0.4 * Math.sin(t * 0.25);
      return {
        uCamPos: [ufPathX(z), y, z],
        uCamTgt: [ufPathX(z + 2), y + 0.9, z + 2],
        uCamRoll: -0.12 * Math.cos(z * 0.11),
        uFocal: 1.4,
      };
    },
  },
  ufFibre: {
    frag: UF_FIBRE,
    uniforms: (t) => {
      const z = 1.4 * t;
      const out = smooth(5.8, 8, t);
      const x = lerp(0.25 * Math.sin(t * 0.4), 0.88, out);
      return {
        uCamPos: [x, 0.15 * Math.cos(t * 0.3), z],
        uCamTgt: [lerp(0.1, 3, out), 0.05, z + lerp(3, 1.2, out)],
        uCamRoll: 0.2 * Math.sin(t * 0.3),
        uFocal: 1.2,
        uCamZ: z,
        uFlash: 0.7 * smooth(6.8, 8, t),
      };
    },
  },
  ufArray: {
    frag: UF_ARRAY,
    uniforms: (t) => ({
      uCamPos: spline(UF_ARRAY_POS, t),
      uCamTgt: spline(UF_ARRAY_TGT, t),
      uCamRoll: 0.05 * t,
      uFocal: 1.3,
      uBuild: Math.max(t, 0) / 6,
      uFlash: 0.9 * Math.pow(smooth(5, 6, t), 2),
    }),
  },
  roRacks: {
    frag: RO_RACKS,
    uniforms: (t) => ({
      uCamPos: spline(RO_POS, t),
      uCamTgt: spline(RO_TGT, t),
      uCamRoll: 0.08 * Math.sin(t * 0.4),
      uFocal: 1.2,
      uFlash: 1.15 * Math.exp(-Math.max(t, 0) * 3.2) + 0.6 * smooth(15.2, 16, t),
    }),
  },
  roMembrane: {
    frag: RO_MEMBRANE,
    uniforms: (t) => ({
      uCamZ: roMembraneZ(t),
      uSpeed: (roMembraneZ(t + 0.05) - roMembraneZ(t - 0.05)) / 0.1,
      uPressure: smooth(0, 9, t),
      uFlash: 0.5 * Math.exp(-Math.max(t + 0.4, 0) * 4),
    }),
  },
  ionExchange: {
    frag: ION_EXCHANGE,
    uniforms: (t) => {
      const z = 1.3 * t;
      return {
        uCamPos: ixPath(z),
        uCamTgt: ixPath(z + 2.5),
        uCamRoll: 0.1 * Math.sin(t * 0.25),
        uFocal: 1.4,
        uAttach: smooth(2, 14, t),
      };
    },
  },
  polishing: {
    frag: STREAM,
    uniforms: (t) => ({
      uMode: 0,
      uTurb: 1 - smooth(0, 11, t),
      uDust: 1 - 0.85 * smooth(2, 12, t),
      uZoom: 1 + 0.7 * Math.pow(smooth(10, 14, t), 2),
      uGlow: 0.8 + 0.6 * smooth(8, 14, t),
    }),
  },
  plant: {
    frag: PLANT,
    uniforms: (t) => ({
      uCamPos: ((p: Vec3): Vec3 => [p[0], Math.max(p[1], 2.2), p[2]])(spline(PLANT_POS, t)),
      uCamTgt: spline(PLANT_TGT, t),
      uCamRoll: 0.06 * Math.sin(t * 0.3),
      uFocal: 1.3,
    }),
  },
  network: {
    frag: NETWORK,
    uniforms: (t) => {
      const u = smooth(-2.5, 14, t);
      const a = lerp(0.8, 0, u);
      const r = lerp(150, 12, u);
      return {
        uCamPos: [Math.sin(a) * r, lerp(110, 250, u), -Math.cos(a) * r],
        uCamTgt: [0, 0, 0],
        uCamRoll: 0,
        uFocal: 1.4,
        uRing: smooth(4, 12, t),
        uGrow: smooth(-1, 8, t),
      };
    },
  },
  brand: {
    frag: RAW,
    uniforms: (t) => ({
      uReveal: 0.3,
      uNavy: 1.25 * smooth(-2, 1.5, t) * (1 - 0.6 * smooth(12, 16, t)),
      uLight: 0.12,
      uFlow: 0,
      uStream: 0,
      uCamZ: 500 + 0.2 * t,
      uSpeed: 0.2,
    }),
  },
  return: {
    frag: STREAM,
    uniforms: (t) => ({
      uMode: 1,
      uTurb: 0.6,
      uDust: 0.6 * (1 - smooth(2, 8, t)),
      uZoom: Math.exp(Math.max(t, 0) * 0.35),
      uGlow: 1 - smooth(3, 9.5, t),
    }),
  },
};
