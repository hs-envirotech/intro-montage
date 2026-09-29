// ─────────────────────────────────────────────────────────────────────────────
// Envirotech concert visual — loop timeline.
// Every shot length is in seconds. Shots play end to end; each one fades in
// over the tail of the one before it (`fadeIn`). The loop is 102 bars at
// 120 BPM, so beat pulses line up across the loop point.
// ─────────────────────────────────────────────────────────────────────────────

export const CONCERT = {
  width: 1920,
  height: 1080,
  fps: 30,
  bpm: 120,
} as const;

export type ShotId =
  | "raw"
  | "screening"
  | "coagulation"
  | "ufField"
  | "ufFibre"
  | "ufArray"
  | "roRacks"
  | "roMembrane"
  | "ionExchange"
  | "polishing"
  | "plant"
  | "network"
  | "brand"
  | "return";

export type ShotSpec = {
  id: ShotId;
  title: string;
  durationSec: number;
  /** Seconds this shot overlaps the previous one while it fades in. */
  fadeIn: number;
  /** Optional process label, shown briefly and subtly. */
  label?: string;
};

export const SHOT_SPECS: ShotSpec[] = [
  { id: "raw", title: "01 · Raw water", durationSec: 22, fadeIn: 0 },
  { id: "screening", title: "02 · Screening", durationSec: 16, fadeIn: 1.6 },
  { id: "coagulation", title: "03 · Coagulation", durationSec: 14, fadeIn: 1.0 },
  { id: "ufField", title: "04 · UF membrane field", durationSec: 10, fadeIn: 1.2, label: "ULTRAFILTRATION" },
  { id: "ufFibre", title: "05 · Inside a hollow fibre", durationSec: 8, fadeIn: 0.8 },
  { id: "ufArray", title: "06 · UF array · build", durationSec: 6, fadeIn: 0.7 },
  { id: "roRacks", title: "07 · RO pressure vessels · drop", durationSec: 16, fadeIn: 0.15, label: "REVERSE OSMOSIS" },
  { id: "roMembrane", title: "08 · RO membrane boundary", durationSec: 16, fadeIn: 0.6 },
  { id: "ionExchange", title: "09 · Ion exchange", durationSec: 16, fadeIn: 1.5, label: "DEMINERALISATION" },
  { id: "polishing", title: "10 · Polishing", durationSec: 14, fadeIn: 2.0, label: "PURIFICATION" },
  { id: "plant", title: "11 · Plant reveal · climax", durationSec: 26, fadeIn: 1.5 },
  { id: "network", title: "12 · The network", durationSec: 14, fadeIn: 2.5 },
  { id: "brand", title: "13 · Envirotech", durationSec: 16, fadeIn: 2.0 },
  { id: "return", title: "14 · Return to the source", durationSec: 10, fadeIn: 1.5 },
];

/** Seconds of the raw-water shot that fade in over the end of the loop. */
export const RAW_TAIL_SEC = 5;

export type ShotTiming = ShotSpec & { start: number; end: number };

export const SHOTS: ShotTiming[] = (() => {
  let t = 0;
  return SHOT_SPECS.map((s) => {
    const timing = { ...s, start: t, end: t + s.durationSec };
    t += s.durationSec;
    return timing;
  });
})();

export const LOOP_SEC = SHOTS[SHOTS.length - 1].end;
export const LOOP_FRAMES = Math.round(LOOP_SEC * CONCERT.fps);

// Musical intensity through the loop: [seconds, energy]. Starts and ends equal
// so the loop point is invisible.
export const ENERGY_KEYS: [number, number][] = [
  [0, 0.08], [10, 0.2], [20, 0.45], [23, 0.62], [36, 0.6], [40, 0.45], [52, 0.55],
  [62, 0.6], [70, 0.78], [75.9, 0.95], [76, 1], [92, 0.85], [108, 0.6], [124, 0.35],
  [138, 0.28], [146, 0.85], [158, 1], [164, 0.7], [178, 0.5], [190, 0.3], [LOOP_SEC, 0.08],
];

export const energyAt = (t: number) => {
  const k = ENERGY_KEYS;
  if (t <= k[0][0]) return k[0][1];
  for (let i = 1; i < k.length; i++) {
    if (t <= k[i][0]) {
      const u = (t - k[i - 1][0]) / (k[i][0] - k[i - 1][0]);
      const s = u * u * (3 - 2 * u);
      return k[i - 1][1] + (k[i][1] - k[i - 1][1]) * s;
    }
  }
  return k[k.length - 1][1];
};

/** Beat and downbeat pulses (1 on the hit, decaying), scaled by energy. */
export const beatAt = (t: number) => {
  const b = (t * CONCERT.bpm) / 60;
  const e = energyAt(t);
  const beat = Math.exp(-(b - Math.floor(b)) * 7) * e * e;
  const bar = Math.exp(-(b / 4 - Math.floor(b / 4)) * 4) * e;
  return { beat, bar, energy: e };
};
