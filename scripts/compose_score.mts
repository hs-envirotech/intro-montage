// ─────────────────────────────────────────────────────────────────────────────
// "CONFLUENCE" — original score for the Envirotech brand film.
//
// Concept: tributaries joining into one river. A single four-note motif,
// D – A – E – F, is born as a water droplet in the dark. Each movement of the
// film adds a new voice (pluck, bass, rhythm, pads, lead), all built from that
// same motif, until everything flows together at the Silverstreams climax.
// Then the music stops dead. In the silence an aqua light traces the logo to
// three bell notes — D, A, E — and when the logo lands the fourth note
// arrives, transformed: F becomes F♯. The minor motif resolves to major, once,
// on the logo: "securing water for the next generation".
//
// Key D minor (Dorian colour), 96 BPM, one bar = 2.5 s = 75 frames, so bar
// lines fall exactly on the scene boundaries at 7, 17, 27, 37 and 47 s. The
// Silverstreams climax pushes to ~103 BPM so three bars land the cut at 54 s.
//
// Everything is synthesised here from scratch (FM bells, Karplus–Strong
// plucks, band-limited saw pads and lead, synthesised drums and impacts,
// Freeverb-style reverb, ping-pong delay), deterministic and locked to the
// scene timings in src/config.ts.
//
//   npm run score   →   assets/music/envirotech_score.wav
// ─────────────────────────────────────────────────────────────────────────────
import { mkdirSync, writeFileSync } from "node:fs";
import { SCENE_TIMINGS, TOTAL_FRAMES, VIDEO } from "../src/config.ts";

const SR = 48000;
const DUR = TOTAL_FRAMES / VIDEO.fps;
const N = Math.ceil(DUR * SR);
const TAU = Math.PI * 2;

// ── Picture sync ────────────────────────────────────────────────────────────
const sceneAt = (id: string) => SCENE_TIMINGS.find((s) => s.id === id)!.from / VIDEO.fps;
const F = (frames: number) => frames / VIDEO.fps;
const S = {
  tech: sceneAt("technology"),
  eng: sceneAt("engineering"),
  life: sceneAt("lifecycle"),
  ind: sceneAt("industries"),
  proj: sceneAt("projects"),
  silver: sceneAt("silverstreams"),
  reveal: sceneAt("reveal"),
};
const DROP = S.reveal; // the sudden cut to silence
// Frame numbers below mirror the beat constants in the scene files.
const SYNC = {
  impact: F(100), // Scene1Origin IMPACT
  rebound: F(138), // Scene1Origin REBOUND_IMPACT
  dive: F(150), // Scene1Origin DIVE start
  techCuts: [82, 197, 249].map((f) => S.tech + F(f + 5)), // UF→RO→Desal→Reclamation, mid push-through
  sceneCuts: [S.eng, S.life, S.ind, S.proj, S.silver].map((t) => t + F(5)),
  prpc: S.proj + F(150), // EMAS → PRPC UF
  stats: [0, 1, 2, 3].map((i) => S.proj + F(150 + 40 + i * 12)), // PRPC figures start counting
  campus: S.silver + F(140), // data-centre campus callout
  trace: S.reveal + F(62), // Scene7Reveal TRACE start
  traceLen: F(104 - 62),
  fill: S.reveal + F(96), // logo fills in
};

// ── Bar grid ────────────────────────────────────────────────────────────────
const BAR = 2.5;
const bars: { t: number; len: number }[] = [];
for (let t = S.tech; t < S.silver - 1e-6; t += BAR) bars.push({ t, len: BAR });
if (Math.abs(bars.length * BAR - (S.silver - S.tech)) > 1e-6) {
  throw new Error("Scene lengths 2–5 must be multiples of one bar (2.5 s) for the score to stay in sync.");
}
const CLIMAX_BAR = (S.reveal - S.silver) / 3;
for (let i = 0; i < 3; i++) bars.push({ t: S.silver + i * CLIMAX_BAR, len: CLIMAX_BAR });
const beat = (b: number, k: number) => bars[b].t + (k * bars[b].len) / 4;
const six = (b: number, s: number) => bars[b].t + (s * bars[b].len) / 16;
const barOf = (t: number) => {
  for (let b = bars.length - 1; b >= 0; b--) if (t >= bars[b].t - 1e-6) return b;
  return 0;
};
/** Snap a time to the nearest 16th note, so hits under picture events stay in the groove. */
const q16 = (t: number) => {
  const b = barOf(t);
  const step = bars[b].len / 16;
  return bars[b].t + Math.round((t - bars[b].t) / step) * step;
};

// Sections by bar index
const SEC = { tech: [0, 4], eng: [4, 7], life: [7, 11], ind: [11, 12], proj: [12, 16], silver: [16, 19] } as const;
const inSec = (b: number, s: readonly [number, number]) => b >= s[0] && b < s[1];

// ── Harmony ─────────────────────────────────────────────────────────────────
type Chord = { bass: number; pad: number[]; pcs: number[] };
const pc = (...names: string[]) =>
  names.map((n) => ({ C: 0, "C#": 1, D: 2, E: 4, F: 5, "F#": 6, G: 7, A: 9, Bb: 10, B: 11 })[n as "C"]);
const CH: Record<string, Chord> = {
  Dm9: { bass: 38, pad: [50, 57, 62, 65, 76], pcs: pc("D", "F", "A", "E", "C") },
  Bbmaj7: { bass: 34, pad: [46, 53, 57, 62, 65], pcs: pc("Bb", "D", "F", "A", "E") },
  Fadd9: { bass: 41, pad: [53, 57, 60, 67, 69], pcs: pc("F", "A", "C", "G", "E", "D") },
  C69: { bass: 36, pad: [48, 55, 62, 64, 67], pcs: pc("C", "E", "G", "D", "A", "F") },
  Gm9: { bass: 43, pad: [55, 58, 62, 65, 69], pcs: pc("G", "Bb", "D", "F", "A", "E") },
  Asus4: { bass: 45, pad: [57, 62, 64, 69, 74], pcs: pc("A", "D", "E") },
  A: { bass: 45, pad: [57, 61, 64, 69, 73], pcs: pc("A", "C#", "E") },
  FC: { bass: 36, pad: [53, 57, 60, 65, 69], pcs: pc("F", "A", "C", "D", "E") },
  Dsus4: { bass: 38, pad: [50, 55, 57, 62, 67], pcs: pc("D", "G", "A", "E") },
  Dmaj9: { bass: 38, pad: [50, 57, 62, 64, 66, 69, 74], pcs: pc("D", "F#", "A", "E") },
};
// One entry per bar; two chords = first half / second half.
const PROG: (keyof typeof CH)[][] = [
  ["Dm9"], ["Bbmaj7"], ["Fadd9"], ["C69"], // technology
  ["Dm9"], ["Bbmaj7"], ["Gm9", "A"], // engineering
  ["Dm9"], ["FC"], ["Bbmaj7"], ["C69"], // engineering → operation
  ["Asus4", "A"], // industries — tension before the proof
  ["Bbmaj7"], ["Fadd9"], ["Gm9"], ["Asus4", "A"], // project experience
  ["Bbmaj7"], ["C69"], ["Dsus4"], // Silverstreams: suspended, never resolved… until the logo
];
const chordAt = (t: number) => {
  const b = barOf(t);
  const p = PROG[b];
  const half = t - bars[b].t >= bars[b].len / 2 ? 1 : 0;
  return CH[p[Math.min(half, p.length - 1)]];
};

const MOTIF = [74, 81, 76, 77]; // D5 A5 E5 F5 — the droplet motif
const MOTIF_MAJOR = [74, 81, 76, 78]; // …resolved: F → F♯

/** Keep a motif note if it fits the chord; otherwise move it to the nearest note that does. */
const snap = (m: number, ch: Chord) => {
  for (const d of [0, -1, 1, -2, 2]) if (ch.pcs.includes((((m + d) % 12) + 12) % 12)) return m + d;
  return m;
};
const mtof = (m: number) => 440 * 2 ** ((m - 69) / 12);

// Intensity curve: sets pad brightness and level through the film.
const INTENSITY: [number, number][] = [
  [0, 0.1], [S.tech, 0.45], [S.eng, 0.6], [S.life, 0.72], [S.ind, 0.74], [S.proj, 0.86], [S.silver, 1], [S.reveal - 0.01, 1], [S.reveal, 0.25],
];
const intensity = (t: number) => {
  for (let i = INTENSITY.length - 1; i >= 0; i--) {
    if (t >= INTENSITY[i][0]) {
      const [t0, v0] = INTENSITY[i];
      const next = INTENSITY[i + 1];
      if (!next) return v0;
      // glide into the next section's level over the final bar
      const k = Math.max(0, Math.min(1, (t - (next[0] - 2.5)) / 2.5));
      return v0 + (next[1] - v0) * k * (t0 < next[0] ? 1 : 0);
    }
  }
  return 0.1;
};

// ── Buses ───────────────────────────────────────────────────────────────────
const stereo = () => [new Float32Array(N), new Float32Array(N)] as const;
const MAIN = stereo();
const DUCK = stereo(); // side-chained to the kick
const REV_A = stereo(); // everything before the cut
const REV_B = stereo(); // the reveal, in its own clean space
const DLY = stereo();

let seed = 20240917;
const rnd = () => {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 4294967296;
};
const noise = () => rnd() * 2 - 1;

type Out = { gain?: number; pan?: number; rev?: number; dly?: number; duck?: boolean };

/**
 * Render a voice. `fn` is called once per sample, in order, with time since
 * the note started, and returns mono or [L, R]. Anything that starts before
 * the cut is hard-stopped at the cut (with a 6 ms release to avoid clicks).
 */
const voice = (start: number, dur: number, fn: (t: number) => number | [number, number], o: Out = {}) => {
  const { gain = 1, pan = 0, rev = 0, dly = 0, duck = false } = o;
  const end = start < DROP ? Math.min(start + dur, DROP) : start + dur;
  const s0 = Math.max(0, Math.floor(start * SR));
  const s1 = Math.min(N, Math.floor(end * SR));
  const cutFade = start < DROP && start + dur > DROP;
  const gl = Math.cos(((pan + 1) * Math.PI) / 4) * gain;
  const gr = Math.sin(((pan + 1) * Math.PI) / 4) * gain;
  const bus = duck ? DUCK : MAIN;
  for (let i = s0; i < s1; i++) {
    const t = (i - Math.floor(start * SR)) / SR;
    const v = fn(t);
    let l: number;
    let r: number;
    if (typeof v === "number") {
      l = v * gl;
      r = v * gr;
    } else {
      l = v[0] * gain;
      r = v[1] * gain;
    }
    if (cutFade) {
      const left = (s1 - i) / SR;
      if (left < 0.006) {
        l *= left / 0.006;
        r *= left / 0.006;
      }
    }
    bus[0][i] += l;
    bus[1][i] += r;
    if (rev) {
      const rb = i < DROP * SR ? REV_A : REV_B;
      rb[0][i] += l * rev;
      rb[1][i] += r * rev;
    }
    if (dly) {
      DLY[0][i] += l * dly;
      DLY[1][i] += r * dly;
    }
  }
};

// ── DSP building blocks ─────────────────────────────────────────────────────
const polyblep = (t: number, dt: number) => {
  if (t < dt) {
    t /= dt;
    return t + t - t * t - 1;
  }
  if (t > 1 - dt) {
    t = (t - 1) / dt;
    return t * t + t + t + 1;
  }
  return 0;
};
class Saw {
  ph = rnd();
  next(f: number) {
    const dt = f / SR;
    this.ph += dt;
    if (this.ph >= 1) this.ph -= 1;
    return 2 * this.ph - 1 - polyblep(this.ph, dt);
  }
}
/** Topology-preserving state-variable filter. */
class SVF {
  ic1 = 0;
  ic2 = 0;
  low = 0;
  band = 0;
  high = 0;
  run(x: number, fc: number, q: number) {
    const g = Math.tan((Math.PI * Math.min(fc, SR * 0.45)) / SR);
    const k = 1 / q;
    const a1 = 1 / (1 + g * (g + k));
    const a2 = g * a1;
    const a3 = g * a2;
    const v3 = x - this.ic2;
    const v1 = a1 * this.ic1 + a2 * v3;
    const v2 = this.ic2 + a2 * this.ic1 + a3 * v3;
    this.ic1 = 2 * v1 - this.ic1;
    this.ic2 = 2 * v2 - this.ic2;
    this.low = v2;
    this.band = v1;
    this.high = x - k * v1 - v2;
    return v2;
  }
}
/** Gate envelope: attack, hold while the note is held, exponential-ish release. */
const gateEnv = (t: number, held: number, a: number, r: number) => {
  if (t < a) return t / a;
  if (t < held) return 1;
  const x = (t - held) / r;
  return x >= 1 ? 0 : (1 - x) * (1 - x);
};

// ── Instruments ─────────────────────────────────────────────────────────────

/** Water droplet: a fast downward pitch glide onto `midi` — the "plink" on still water. */
const droplet = (at: number, midi: number, gain: number, pan = 0) => {
  const f = mtof(midi);
  voice(
    at,
    1.4,
    (t) => {
      const ph = TAU * (f * t + (f * 1.4 * (1 - Math.exp(-t * 55))) / 55);
      const click = t < 0.003 ? noise() * (1 - t / 0.003) * 0.25 : 0;
      return Math.sin(ph) * Math.exp(-t * 7) * Math.min(1, t * 2500) + click;
    },
    { gain, pan, rev: 0.9, dly: 0.28 },
  );
};

/** FM bell (3.5 : 1) — clear, glassy, slightly inharmonic. */
const bell = (at: number, midi: number, gain: number, pan = 0, dur = 4.5, rev = 0.6) => {
  const f = mtof(midi);
  voice(
    at,
    dur,
    (t) => {
      const env = Math.exp(-t * 1.25) * Math.min(1, t * 500);
      const idx = 2.4 * Math.exp(-t * 4.5) + 0.25;
      const m = Math.sin(TAU * f * 3.5 * t) * idx;
      return (Math.sin(TAU * f * t + m) * 0.8 + Math.sin(TAU * f * 2.005 * t) * 0.18 * Math.exp(-t * 3)) * env;
    },
    { gain, pan, rev, dly: 0.25 },
  );
};

/** Karplus–Strong plucked string: the "flow" arpeggio. */
const pluck = (at: number, midi: number, gain: number, pan: number, bright: number, dur = 1.4) => {
  const f = mtof(midi);
  const L = Math.max(2, Math.round(SR / f));
  const buf = new Float32Array(L);
  let lp = 0;
  for (let i = 0; i < L; i++) {
    lp += (0.25 + 0.7 * bright) * (noise() - lp);
    buf[i] = lp;
  }
  let idx = 0;
  const damp = 0.9965 + bright * 0.002;
  voice(
    at,
    dur,
    (t) => {
      const a = buf[idx];
      const b = buf[(idx + 1) % L];
      buf[idx] = (a + b) * 0.5 * damp;
      idx = (idx + 1) % L;
      return a * Math.min(1, (dur - t) * 12);
    },
    { gain, pan, rev: 0.3, dly: 0.32, duck: true },
  );
};

/** Warm poly pad: three detuned saws per note, low-passed by the film's intensity. */
const pad = (at: number, held: number, notes: number[], gain: number, o: { attack?: number; release?: number; bright?: number; duck?: boolean; rev?: number } = {}) => {
  const { attack = 0.5, release = 0.9, bright = 0, duck = true, rev = 0.45 } = o;
  const g = gain / Math.sqrt(notes.length);
  notes.forEach((n, k) => {
    const f = mtof(n);
    const oscs = [new Saw(), new Saw(), new Saw()];
    const det = [0.9942, 1, 1.0058];
    const flt = new SVF();
    const pan = notes.length > 1 ? -0.55 + (1.1 * k) / (notes.length - 1) : 0;
    voice(
      at,
      held + release,
      (t) => {
        const e = gateEnv(t, held, attack, release);
        if (e <= 0) return 0;
        let x = 0;
        for (let j = 0; j < 3; j++) x += oscs[j].next(f * det[j]);
        const I = intensity(at + t) + bright;
        const fc = 260 + 3600 * I * I * (0.65 + 0.35 * e);
        return flt.run(x / 3, fc, 0.75) * e;
      },
      { gain: g, pan, rev, duck },
    );
  });
};

/** Bass: sub sine plus a filtered saw with a short "pluck" on the filter. */
const bass = (at: number, held: number, midi: number, gain: number, bright: number) => {
  const f = mtof(midi);
  const s = new Saw();
  const flt = new SVF();
  let ph = 0;
  voice(
    at,
    held + 0.06,
    (t) => {
      const e = gateEnv(t, held, 0.003, 0.06) * (0.72 + 0.28 * Math.exp(-t * 7));
      ph += f / SR;
      const fc = 110 + bright * (900 * Math.exp(-t * 9) + 180);
      return (Math.sin(TAU * ph) * 0.75 + flt.run(s.next(f), fc, 1.2) * 0.55) * e;
    },
    { gain, duck: true },
  );
};

/** Supersaw lead with slow attack and late vibrato — the motif, sung wide. */
const lead = (at: number, held: number, midi: number, gain: number) => {
  const f = mtof(midi);
  const V = 7;
  const oscs = Array.from({ length: V + 1 }, () => new Saw());
  const cents = [-17, -11, -5, 0, 5, 11, 17];
  const flt = [new SVF(), new SVF()];
  voice(
    at,
    held + 0.7,
    (t) => {
      const e = gateEnv(t, held, 0.14, 0.7);
      const vib = 1 + 0.004 * Math.sin(TAU * 5.2 * t) * Math.min(1, Math.max(0, (t - 0.45) * 2));
      let l = 0;
      let r = 0;
      for (let j = 0; j < V; j++) {
        const v = oscs[j].next(f * vib * 2 ** (cents[j] / 1200));
        if (j % 2) l += v;
        else r += v;
        if (j === 3) {
          l += v * 0.5;
          r += v * 0.5;
        }
      }
      const sub = oscs[V].next(f * 0.5 * vib) * 0.6;
      l += sub;
      r += sub;
      const fc = 900 + 2600 * Math.min(1, t * 1.5);
      return [flt[0].run(l / 4, fc, 0.7) * e, flt[1].run(r / 4, fc, 0.7) * e];
    },
    { gain, rev: 0.5, dly: 0.18, duck: true },
  );
};

// Drums ────────────────────────────────────────────────────────────────────
const kicks: { at: number; depth: number }[] = [];
const kick = (at: number, gain: number, duckDepth = 0.55) => {
  kicks.push({ at, depth: duckDepth });
  voice(
    at,
    0.55,
    (t) => {
      const ph = TAU * (46 * t + (115 / 32) * (1 - Math.exp(-t * 32)));
      const body = Math.sin(ph) * Math.exp(-t * 6.5) * Math.min(1, t * 900);
      return Math.tanh(body * 1.6) + noise() * Math.exp(-t * 350) * 0.18;
    },
    { gain },
  );
};
const clap = (at: number, gain: number) => {
  const flt = new SVF();
  voice(
    at,
    0.5,
    (t) => {
      let env = 0;
      for (const o of [0, 0.009, 0.019]) if (t >= o) env += Math.exp(-(t - o) * (t - o < 0.025 ? 95 : 16)) * 0.45;
      flt.run(noise(), 1500, 1.3);
      return flt.band * env * 2.2;
    },
    { gain, rev: 0.4 },
  );
};
const snare = (at: number, gain: number) => {
  const flt = new SVF();
  voice(
    at,
    0.35,
    (t) => {
      flt.run(noise(), 5200, 0.8);
      const tone = Math.sin(TAU * 185 * t) * Math.exp(-t * 28) * 0.5;
      return (flt.high * 0.6 + flt.band * 0.5) * Math.exp(-t * 22) + tone;
    },
    { gain, rev: 0.3 },
  );
};
const hat = (at: number, gain: number, pan: number, open = false) => {
  const flt = new SVF();
  const d = open ? 7 : 55;
  voice(
    at,
    open ? 0.45 : 0.08,
    (t) => {
      flt.run(noise(), 8200, 0.9);
      return flt.high * Math.exp(-t * d) * Math.min(1, t * 2000);
    },
    { gain, pan, rev: open ? 0.2 : 0.05 },
  );
};
const shaker = (at: number, gain: number, pan: number) => {
  const flt = new SVF();
  voice(
    at,
    0.09,
    (t) => {
      flt.run(noise(), 6000, 0.7);
      return flt.high * Math.min(1, t * 180) * Math.exp(-t * 45);
    },
    { gain, pan, rev: 0.1 },
  );
};
const tom = (at: number, midi: number, gain: number, pan: number) => {
  const f = mtof(midi);
  voice(at, 0.6, (t) => Math.sin(TAU * (f * t + (f * 0.5 * (1 - Math.exp(-t * 20))) / 20)) * Math.exp(-t * 6) * Math.min(1, t * 900), {
    gain,
    pan,
    rev: 0.35,
  });
};
const crash = (at: number, gain: number) => {
  const a = new SVF();
  voice(
    at,
    3.2,
    (t) => {
      a.run(noise(), 6500, 0.6);
      return [a.high * Math.exp(-t * 1.3), a.band * Math.exp(-t * 1.5)];
    },
    { gain, rev: 0.35 },
  );
};

/** Mechanical impact: a low boom, a ring of steel partials tuned to D, a crack of noise. */
const impact = (at: number, gain: number, size = 1) => {
  voice(at, 3.5 * size, (t) => Math.sin(TAU * (34 * t + (1.8 * (1 - Math.exp(-t * 4.5))) / 1)) * Math.exp(-t * (2.2 / size)) * Math.min(1, t * 600), {
    gain: gain * 0.9,
    rev: 0.25,
  });
  const base = mtof(50);
  const parts = [1, 1.498, 2.013, 2.67, 3.36, 4.12];
  voice(
    at,
    3 * size,
    (t) => {
      let v = 0;
      for (let i = 0; i < parts.length; i++) v += (Math.sin(TAU * base * parts[i] * t) * Math.exp(-t * (1.6 + i * 0.7))) / (i + 1.4);
      return v * Math.min(1, t * 1500);
    },
    { gain: gain * 0.28, pan: 0.12, rev: 0.7 },
  );
  const n = new SVF();
  voice(
    at,
    0.5,
    (t) => {
      n.run(noise(), 2200, 0.7);
      return n.band * Math.exp(-t * 16);
    },
    { gain: gain * 0.5, rev: 0.6 },
  );
};

/** Hydraulic whoosh: band-passed noise sweeping up and across the stereo field. */
const whoosh = (peak: number, len: number, gain: number, dir = 1) => {
  const flt = new SVF();
  voice(
    peak - len * 0.62,
    len,
    (t) => {
      const p = t / len;
      const env = p < 0.62 ? (p / 0.62) ** 2.2 : Math.exp(-(p - 0.62) * 9);
      const fc = 220 * 10 ** (1.25 * Math.min(1, p / 0.62));
      flt.run(noise(), fc, 1.6);
      const x = flt.band * env * 1.8;
      const pp = 0.5 + 0.45 * dir * (p * 2 - 1);
      return [x * Math.cos((pp * Math.PI) / 2), x * Math.sin((pp * Math.PI) / 2)];
    },
    { gain, rev: 0.35 },
  );
};

/** Noise + rising saw riser into a downbeat. */
const riser = (from: number, to: number, gain: number) => {
  const n = new SVF();
  const s = new Saw();
  const s2 = new Saw();
  const len = to - from;
  voice(
    from,
    len,
    (t) => {
      const p = t / len;
      n.run(noise(), 400 + 9000 * p * p, 1.1);
      const f = mtof(50) * 2 ** (2 * p * p);
      const tone = (s.next(f) + s2.next(f * 1.5)) * 0.18;
      return [(n.band * 1.2 + tone) * p * p, (n.high * 0.9 + tone) * p * p];
    },
    { gain, rev: 0.4 },
  );
};

/** Low drone and underwater rumble for the opening. */
const drone = (from: number, to: number, gain: number) => {
  const n = new SVF();
  const len = to - from;
  voice(
    from,
    len,
    (t) => {
      const e = Math.min(1, t / 2.5) * Math.min(1, (len - t) / 1.5);
      const tone = Math.sin(TAU * mtof(26) * t) * 0.55 + Math.sin(TAU * mtof(33) * t + 0.7) * 0.25 + Math.sin(TAU * mtof(38) * 1.002 * t) * 0.18;
      n.run(noise(), 140, 0.8);
      return (tone * (0.8 + 0.2 * Math.sin(TAU * 0.11 * t)) + n.low * 1.6) * e;
    },
    { gain, rev: 0.2 },
  );
};

const subPulse = (at: number, gain: number) =>
  voice(at, 1.1, (t) => Math.sin(TAU * (mtof(26) * t + (22 * (1 - Math.exp(-t * 10))) / 10)) * Math.exp(-t * 3.6) * Math.min(1, t * 300), { gain });

/** Reversed swell: a chord that breathes in and stops on the downbeat. */
const swellInto = (to: number, len: number, notes: number[], gain: number) => {
  notes.forEach((n, k) => {
    const f = mtof(n);
    const o = new Saw();
    const flt = new SVF();
    voice(
      to - len,
      len,
      (t) => {
        const p = t / len;
        return flt.run(o.next(f), 300 + 2500 * p * p, 0.8) * p ** 3;
      },
      { gain: gain / Math.sqrt(notes.length), pan: -0.4 + (0.8 * k) / Math.max(1, notes.length - 1), rev: 0.5 },
    );
  });
};

// ── Cinematic layer ─────────────────────────────────────────────────────────

/** Taiko: deep drum body with a pitch drop, skin slap, big room. The cinematic heartbeat. */
const taiko = (at: number, gain: number, pitch = 1, pan = 0) => {
  const f0 = 60 * pitch;
  const skin = new SVF();
  voice(
    at,
    1.6,
    (t) => {
      const ph = TAU * (f0 * t + (f0 * 0.9 * (1 - Math.exp(-t * 18))) / 18);
      const body = Math.sin(ph) * Math.exp(-t * 3.4) * Math.min(1, t * 700);
      skin.run(noise(), 850 * pitch, 0.9);
      return Math.tanh(body * 1.8) * 0.9 + skin.band * Math.exp(-t * 28) * 0.8;
    },
    { gain, pan, rev: 0.5 },
  );
};

/** Braam: a wall of low, saturated brass-like saws whose filter blasts open then settles. */
const braam = (at: number, dur: number, root: number, gain: number, major = false) => {
  const notes = [root - 12, root, root + 7, root + 12, ...(major ? [root + 16] : [])];
  notes.forEach((n, k) => {
    const f = mtof(n);
    const oscs = [new Saw(), new Saw(), new Saw()];
    const det = [0.992, 1, 1.008];
    const flt = new SVF();
    voice(
      at,
      dur,
      (t) => {
        const env = Math.min(1, t / 0.04) * (0.5 + 0.5 * Math.exp(-t * 1.8)) * Math.min(1, (dur - t) / 0.5);
        let x = 0;
        for (let j = 0; j < 3; j++) x += oscs[j].next(f * det[j]);
        const fc = 220 + 2600 * Math.exp(-t * 2.4) * Math.min(1, t / 0.1);
        return Math.tanh(flt.run(x / 3, fc, 1.2) * 2.4) * env;
      },
      { gain: gain / Math.sqrt(notes.length), pan: k === 0 ? 0 : k % 2 ? 0.3 : -0.3, rev: 0.45 },
    );
  });
};

/** Spiccato strings: short, bowed, driving 8ths and 16ths. */
const spiccato = (at: number, midi: number, gain: number, pan: number) => {
  const f = mtof(midi);
  const a = new Saw();
  const b = new Saw();
  const flt = new SVF();
  const bow = new SVF();
  voice(
    at,
    0.3,
    (t) => {
      const e = Math.min(1, t / 0.006) * Math.exp(-t * 12);
      const x = (a.next(f * 0.997) + b.next(f * 1.003)) * 0.5;
      bow.run(noise(), 3200, 0.7);
      return flt.run(x + bow.band * 0.08, 1300 + 2400 * Math.exp(-t * 16), 0.9) * e;
    },
    { gain, pan, rev: 0.32, duck: true },
  );
};

/** Choir "ah": saws through three vowel formants, with slow vibrato. */
const choir = (at: number, held: number, notes: number[], gain: number) =>
  notes.forEach((n, k) => {
    const f = mtof(n);
    const o = [new Saw(), new Saw()];
    const f1 = new SVF();
    const f2 = new SVF();
    const f3 = new SVF();
    voice(
      at,
      held + 1,
      (t) => {
        const e = gateEnv(t, held, 0.45, 1);
        if (e <= 0) return 0;
        const vib = 1 + 0.005 * Math.sin(TAU * 5 * t + k);
        const x = (o[0].next(f * vib * 0.996) + o[1].next(f * vib * 1.004)) * 0.5;
        f1.run(x, 760, 5);
        f2.run(x, 1150, 6);
        f3.run(x, 2650, 8);
        return (f1.band + f2.band * 0.7 + f3.band * 0.3) * e * 2.2;
      },
      { gain: gain / Math.sqrt(notes.length), pan: -0.5 + k / Math.max(1, notes.length - 1), rev: 0.75 },
    );
  });

const subDrop = (at: number, gain: number) =>
  voice(at, 2.2, (t) => Math.sin(TAU * (mtof(26) * t + (40 * (1 - Math.exp(-t * 3))) / 3)) * Math.exp(-t * 1.5) * Math.min(1, t * 300), { gain });

const reverseCymbal = (to: number, len: number, gain: number) => {
  const f = new SVF();
  voice(
    to - len,
    len,
    (t) => {
      const p = (t / len) ** 3;
      f.run(noise(), 7000, 0.7);
      return [f.high * p, f.band * p * 0.8];
    },
    { gain, rev: 0.3 },
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// ARRANGEMENT
// ─────────────────────────────────────────────────────────────────────────────

// 0–7 s · WATER — darkness, one droplet, the motif is born.
drone(0.1, S.tech + 2.5, 0.16);
droplet(SYNC.impact, MOTIF[0] + 12, 0.42); // the droplet itself sounds D
bell(SYNC.impact + 0.01, MOTIF[0], 0.12);
bell(SYNC.impact + 0.62, MOTIF[1], 0.1, -0.35); // A — the ripple spreading
droplet(SYNC.rebound, MOTIF[2] + 12, 0.2, 0.25); // the rebound droplet sounds E
bell(SYNC.rebound + 0.01, MOTIF[2], 0.09, 0.35);
bell(SYNC.rebound + 0.64, MOTIF[3], 0.09, 0); // F — the motif is complete
whoosh(SYNC.dive + 0.6, 1.6, 0.18, -1); // diving through the surface
subPulse(S.tech - 2.5, 0.3); // a pulse begins…
subPulse(S.tech - 1.25, 0.36);
taiko(S.tech - 0.625, 0.22, 0.8);
taiko(S.tech - 0.3125, 0.28, 0.8);
swellInto(S.tech, 1.6, [50, 57, 62, 65], 0.12);
reverseCymbal(S.tech, 1.4, 0.14);

const MASKS = {
  mid: [1, 0, 1, 1, 0, 1, 1, 0, 1, 0, 1, 1, 0, 1, 1, 0],
  full: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
};
const LEAD: Record<number, [number, number][]> = {
  12: [[74, 1]], // D over B♭
  13: [[81, 1]], // A over F
  14: [[76, 0.5], [77, 0.5]], // E F over Gm
  15: [[76, 1]], // E over A
  16: [[74, 0.5], [77, 0.5]], // D F over B♭
  17: [[76, 0.5], [79, 0.5]], // E G over C
  18: [[81, 1]], // A, suspended over Dsus4 — held, unresolved, cut
};

// 7–54 s · bar by bar
for (let b = 0; b < bars.length; b++) {
  const { t, len } = bars[b];
  const p = PROG[b];
  const I = intensity(t + 0.1);
  const tech = inSec(b, SEC.tech);
  const eng = inSec(b, SEC.eng);
  const life = inSec(b, SEC.life);
  const ind = inSec(b, SEC.ind);
  const proj = inSec(b, SEC.proj);
  const silver = inSec(b, SEC.silver);
  const root = (at: number) => chordAt(at + 0.001).bass;

  // Pads, and choir from the projects onward
  for (let h = 0; h < p.length; h++) {
    const ch = CH[p[h]];
    const at = t + (h * len) / p.length;
    const held = len / p.length;
    pad(at, held, ch.pad, tech ? 0.09 : silver ? 0.15 : 0.12, { attack: b === 0 && h === 0 ? 0.02 : 0.16, release: 0.7 });
    if (silver) pad(at, held, ch.pad.map((n) => n + 12), 0.05, { attack: 0.3, release: 0.6, bright: 0.1 });
    if (proj || silver) choir(at, held, ch.pad.slice(1, 5).map((n) => n + 12), silver ? 0.1 : 0.06);
  }

  // Flow arpeggio — the motif, as 16th-note plucks, fitted to each chord
  const mask = tech ? MASKS.mid : MASKS.full;
  let k = b * 16;
  for (let s = 0; s < 16; s++) {
    if (!mask[s]) continue;
    const at = six(b, s);
    let m = snap(MOTIF[k % 4], chordAt(at + 0.001));
    if (!tech && Math.floor(k / 4) % 2 === 1) m -= 12;
    pluck(at, m, 0.17 * (s % 4 === 0 ? 1 : 0.7) * (0.8 + 0.4 * I), s % 2 ? 0.45 : -0.45, 0.35 + 0.5 * I);
    k++;
  }

  // Strings: driving low 8ths throughout; the motif as 16th spiccato from engineering on
  const LOW = [24, 24, 31, 24, 36, 24, 31, 24];
  for (let e = 0; e < 8; e++) {
    const at = t + (e * len) / 8;
    spiccato(at, root(at) + LOW[e], (tech ? 0.1 : 0.13) * (e % 2 ? 0.75 : 1), -0.2);
  }
  if (!tech) {
    for (let s = 0; s < 16; s++) {
      const at = six(b, s);
      const m = snap(MOTIF[s % 4] - 12, chordAt(at + 0.001)) + (silver && s % 8 >= 4 ? 12 : 0);
      spiccato(at, m, (ind ? 0.06 + (s / 16) * 0.08 : 0.1) * (s % 4 === 0 ? 1 : 0.7), 0.35);
    }
  }

  // Bass
  if (tech || eng) {
    const PAT = [0, 0, 12, 0, 0, 12, 0, 7];
    for (let e = 0; e < 8; e++) {
      const at = t + (e * len) / 8;
      bass(at, len / 8 - 0.03, root(at) + PAT[e], tech ? 0.17 : 0.23, tech ? 0.3 : 0.5);
    }
  } else {
    const GALLOP = [1, 0, 1, 1, 0, 1, 1, 0, 1, 0, 1, 1, 0, 1, 1, 0];
    for (let s = 0; s < 16; s++) {
      if (!GALLOP[s]) continue;
      const at = six(b, s);
      bass(at, len / 16 - 0.02, root(at) + (s % 8 === 6 ? 12 : 0), 0.24, 0.6 + 0.4 * I);
    }
  }

  // Drums
  if (tech) {
    kick(t, 0.55, 0.35);
    kick(beat(b, 2), 0.5, 0.35);
    if (b % 2) kick(six(b, 14), 0.35, 0.2);
    for (let s = 0; s < 16; s++) shaker(six(b, s), s % 4 === 2 ? 0.08 : 0.04, s % 2 ? 0.3 : -0.3);
    for (let e = 1; e < 8; e += 2) hat(t + (e * len) / 8, 0.06, 0.25);
    taiko(t, b === 0 ? 0.55 : 0.38, 0.9);
    taiko(six(b, 6), 0.22, 1.2, 0.3);
    taiko(beat(b, 2), 0.3, 1);
  }
  if (eng || ind) {
    kick(t, 0.66);
    kick(six(b, 6), 0.45);
    kick(beat(b, 2), 0.62);
    clap(beat(b, 1), 0.22);
    clap(beat(b, 3), 0.22);
    snare(beat(b, 1), 0.1);
    snare(beat(b, 3), 0.1);
    for (let s = 0; s < 16; s++) hat(six(b, s), s % 2 ? 0.06 : 0.04, 0.25);
    taiko(t, 0.42, 0.9);
    taiko(beat(b, 2), 0.36, 1.1, -0.3);
  }
  if (life || proj || silver) {
    for (let q = 0; q < 4; q++) kick(beat(b, q), silver ? 0.66 : 0.6);
    if (silver || proj) kick(six(b, 7), 0.4);
    clap(beat(b, 1), silver ? 0.27 : 0.23);
    clap(beat(b, 3), silver ? 0.27 : 0.23);
    snare(beat(b, 1), silver ? 0.15 : 0.11);
    snare(beat(b, 3), silver ? 0.15 : 0.11);
    for (let s = 0; s < 16; s++) hat(six(b, s), s % 4 === 2 ? 0.075 : s % 2 ? 0.05 : 0.035, s % 2 ? 0.3 : -0.2);
    for (let q = 0; q < 4; q++) hat(beat(b, q + 0.5), 0.05, 0.1, true);
    // Taiko ensemble: 8ths, low/high alternating; full 16ths through Silverstreams
    const TK = silver ? [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1] : [1, 0, 0, 1, 0, 0, 1, 0, 1, 0, 0, 1, 0, 1, 0, 0];
    for (let s = 0; s < 16; s++) {
      if (!TK[s]) continue;
      taiko(six(b, s), (s % 4 === 0 ? 0.42 : 0.24) * (silver ? 1 : 0.85), s % 4 === 0 ? 0.9 : s % 2 ? 1.35 : 1.15, s % 2 ? 0.35 : -0.35);
    }
  }
  // Industries: a taiko roll building into the project experience
  if (ind) for (let s = 8; s < 16; s++) taiko(six(b, s), 0.16 + (s - 8) * 0.04, s % 2 ? 1.3 : 1.05, s % 2 ? 0.4 : -0.4);

  // Braams: one per section entrance, and every bar through the climax
  if (b === 0 || b === 4 || b === 7 || b === 12 || silver) braam(t, silver ? 2.2 : 2.3, root(t), silver ? 0.42 : 0.34);

  // Lead motif — sung wide across the projects and the climax
  if (LEAD[b]) {
    let at = t;
    for (const [m, frac] of LEAD[b]) {
      lead(at, frac * len - 0.04, m, silver ? 0.15 : 0.12);
      lead(at, frac * len - 0.04, m - 12, silver ? 0.08 : 0.05);
      at += frac * len;
    }
  }
}

// Accents under picture events
subDrop(S.tech, 0.4);
impact(S.tech, 0.32, 0.9); // technology begins
SYNC.techCuts.forEach((c, i) => whoosh(c, 1.1, 0.24, i % 2 ? -1 : 1)); // UF → RO → desalination → reclamation
SYNC.sceneCuts.forEach((c, i) => whoosh(c, 1.3, 0.28 + i * 0.02, i % 2 ? 1 : -1));
[S.eng, S.life, S.ind, S.proj, S.silver].forEach((at) => reverseCymbal(at, 1.25, 0.12));
// ENGINEER · INTEGRATE · DELIVER land on beat 2 of each engineering bar
[4, 5, 6].forEach((b) => impact(beat(b, 1), 0.46));
// DESIGN → ENGINEER → BUILD → OPERATE change on the bar lines
[8, 9, 10].forEach((b, i) => {
  impact(bars[b].t, 0.48 + i * 0.05);
  braam(bars[b].t, 1.6, chordAt(bars[b].t + 0.001).bass, 0.24 + i * 0.03);
});
// EPCC · O&M · BOT
impact(beat(10, 2), 0.66, 1.2);
braam(beat(10, 2), 1.2, chordAt(beat(10, 2) + 0.001).bass, 0.34);
crash(beat(10, 2), 0.14);
// Industries: one bell tick per sector as its chip appears
for (let i = 0; i < 6; i++) {
  const at = six(11, 1 + i);
  bell(at, snap(MOTIF[i % 4] + 12, chordAt(at + 0.001)), 0.06, i % 2 ? 0.45 : -0.45, 1.6, 0.4);
}
// Project experience: EMAS Project, then PRPC UF on the downbeat
subDrop(S.proj, 0.36);
impact(S.proj, 0.55);
crash(S.proj, 0.14);
impact(q16(SYNC.prpc), 0.5);
braam(q16(SYNC.prpc), 1.8, chordAt(q16(SYNC.prpc) + 0.001).bass, 0.3);
crash(q16(SYNC.prpc), 0.1);
// PRPC figures counting up: glassy ticks, the motif again
SYNC.stats.forEach((at, i) => {
  const t = q16(at);
  bell(t, snap(MOTIF[i] + 12, chordAt(t + 0.001)), 0.07, i % 2 ? 0.5 : -0.5, 2, 0.4);
});
// Fill into Silverstreams
[12, 13, 14, 15].forEach((s, i) => {
  tom(six(15, s), 50 - i * 3, 0.32, -0.4 + i * 0.25);
  taiko(six(15, s), 0.3 + i * 0.06, 1.3 - i * 0.1, -0.3 + i * 0.2);
});
// Silverstreams: the largest moment, the campus reveal, the build into the cut
subDrop(S.silver, 0.45);
impact(S.silver, 0.78, 1.3);
crash(S.silver, 0.2);
impact(bars[18].t, 0.6); // data-centre campus
crash(bars[18].t, 0.14);
riser(bars[17].t + bars[17].len / 2, DROP, 0.3);
for (let s = 0; s < 16; s++) snare(six(18, s), 0.04 + s * 0.012); // snare build
for (let s = 8; s < 16; s++) taiko(six(18, s), 0.3 + (s - 8) * 0.04, 1.1, s % 2 ? 0.4 : -0.4);

// 54–60 s · THE REVEAL — sudden silence, then restraint.
// The light traces the logo to D – A – E; the logo lands with F♯. Resolution.
drone(S.reveal + 0.35, DUR, 0.05);
bell(SYNC.trace, MOTIF_MAJOR[0], 0.11, -0.25, 4, 0.8);
bell(SYNC.trace + SYNC.traceLen / 3, MOTIF_MAJOR[1], 0.1, 0.25, 4, 0.8);
bell(SYNC.trace + (2 * SYNC.traceLen) / 3, MOTIF_MAJOR[2], 0.1, -0.1, 4, 0.8);
reverseCymbal(SYNC.fill, 1.1, 0.1);
bell(SYNC.fill, MOTIF_MAJOR[3], 0.14, 0, 3.4, 0.9); // F♯ — the major third, at last
bell(SYNC.fill, MOTIF_MAJOR[3] + 12, 0.045, 0.3, 3, 0.9);
// One final deep tonal impact: taiko, boom and a D-major braam
taiko(SYNC.fill, 0.6, 0.75);
voice(SYNC.fill, DUR - SYNC.fill, (t) => Math.sin(TAU * (mtof(26) * t + (3.5 * (1 - Math.exp(-t * 3))) / 3)) * Math.exp(-t * 0.85) * Math.min(1, t * 400), {
  gain: 0.42,
  rev: 0.2,
});
braam(SYNC.fill, DUR - SYNC.fill - 0.2, 38, 0.2, true);
impact(SYNC.fill, 0.26, 1.4);
pad(SYNC.fill, DUR - SYNC.fill - 0.9, CH.Dmaj9.pad, 0.1, { attack: 0.06, release: 0.85, bright: 0.25, duck: false, rev: 0.7 });
choir(SYNC.fill + 0.1, DUR - SYNC.fill - 1.1, [62, 66, 69, 74], 0.05);

// Side-chain envelope from every kick
const duckEnv = new Float32Array(N).fill(1);
for (const k of kicks) {
  const s0 = Math.floor(k.at * SR);
  for (let i = 0; i < 0.42 * SR && s0 + i < N; i++) {
    const t = i / SR;
    const g = 1 - k.depth * Math.exp(-t / 0.12) * Math.min(1, t / 0.004);
    duckEnv[s0 + i] = Math.min(duckEnv[s0 + i], g);
  }
}

// ── Effects ─────────────────────────────────────────────────────────────────
const OUT = stereo();
for (let i = 0; i < N; i++) {
  OUT[0][i] = MAIN[0][i] + DUCK[0][i] * duckEnv[i];
  OUT[1][i] = MAIN[1][i] + DUCK[1][i] * duckEnv[i];
}

// Ping-pong delay, dotted eighth at 96 BPM
{
  const D = Math.round(0.46875 * SR);
  const bl = new Float32Array(D);
  const br = new Float32Array(D);
  let lpL = 0;
  let lpR = 0;
  const cut = Math.floor(DROP * SR);
  const cutFade = Math.floor(0.05 * SR);
  for (let i = 0; i < N; i++) {
    const p = i % D;
    // The echoes stop with everything else at the cut; only the reveal feeds them afterwards.
    if (i === cut + cutFade) {
      bl.fill(0);
      br.fill(0);
    }
    const g = i < cut ? 1 : i < cut + cutFade ? 1 - (i - cut) / cutFade : 1;
    const yl = bl[p] * g;
    const yr = br[p] * g;
    lpL += 0.35 * (yr - lpL);
    lpR += 0.35 * (yl - lpR);
    bl[p] = (DLY[0][i] + DLY[1][i]) * 0.5 + lpL * 0.42;
    br[p] = lpR * 0.42;
    OUT[0][i] += yl * 0.55;
    OUT[1][i] += yr * 0.55;
    const rb = i < DROP * SR ? REV_A : REV_B;
    rb[0][i] += yl * 0.25;
    rb[1][i] += yr * 0.25;
  }
}

/** Freeverb-style stereo reverb. `gate` shapes the return (used to cut the tail at 54 s). */
const reverb = (inp: readonly [Float32Array, Float32Array], wet: number, room: number, damp: number, gate?: (i: number) => number) => {
  const scale = SR / 44100;
  const combT = [1116, 1188, 1277, 1356, 1422, 1491, 1557, 1617];
  const apT = [556, 441, 341, 225];
  for (let ch = 0; ch < 2; ch++) {
    const spread = ch ? 23 : 0;
    const combs = combT.map((d) => ({ buf: new Float32Array(Math.round((d + spread) * scale)), i: 0, lp: 0 }));
    const aps = apT.map((d) => ({ buf: new Float32Array(Math.round((d + spread) * scale)), i: 0 }));
    for (let n = 0; n < N; n++) {
      const x = (inp[0][n] + inp[1][n]) * 0.015;
      let acc = 0;
      for (const c of combs) {
        const y = c.buf[c.i];
        c.lp = y * (1 - damp) + c.lp * damp;
        c.buf[c.i] = x + c.lp * room;
        c.i = (c.i + 1) % c.buf.length;
        acc += y;
      }
      for (const a of aps) {
        const y = a.buf[a.i];
        a.buf[a.i] = acc + y * 0.5;
        a.i = (a.i + 1) % a.buf.length;
        acc = y - acc;
      }
      OUT[ch][n] += acc * wet * (gate ? gate(n) : 1);
    }
  }
};
const dropSample = DROP * SR;
reverb(REV_A, 0.9, 0.86, 0.28, (n) => (n < dropSample ? 1 : Math.max(0, 1 - (n - dropSample) / (0.1 * SR))));
reverb(REV_B, 1.1, 0.9, 0.22);

// ── Master: DC block, glue compression, soft clip, normalise, fade ──────────
{
  let x1L = 0, y1L = 0, x1R = 0, y1R = 0;
  const R = 1 - (TAU * 22) / SR;
  let env = 0;
  const att = Math.exp(-1 / (0.006 * SR));
  const rel = Math.exp(-1 / (0.18 * SR));
  const thr = 0.38;
  for (let i = 0; i < N; i++) {
    const l = OUT[0][i];
    const r = OUT[1][i];
    const yl = l - x1L + R * y1L;
    const yr = r - x1R + R * y1R;
    x1L = l; y1L = yl; x1R = r; y1R = yr;
    const lvl = Math.max(Math.abs(yl), Math.abs(yr));
    env = lvl > env ? att * env + (1 - att) * lvl : rel * env + (1 - rel) * lvl;
    const gr = env > thr ? (thr + (env - thr) / 3) / env : 1;
    OUT[0][i] = Math.tanh(yl * gr * 1.15);
    OUT[1][i] = Math.tanh(yr * gr * 1.15);
  }
}
let peak = 0;
for (let i = 0; i < N; i++) peak = Math.max(peak, Math.abs(OUT[0][i]), Math.abs(OUT[1][i]));
const norm = 0.891 / peak; // −1 dBFS
const fadeFrom = N - Math.floor(0.45 * SR);

const pcm = Buffer.alloc(44 + N * 4);
pcm.write("RIFF", 0);
pcm.writeUInt32LE(36 + N * 4, 4);
pcm.write("WAVEfmt ", 8);
pcm.writeUInt32LE(16, 16);
pcm.writeUInt16LE(1, 20);
pcm.writeUInt16LE(2, 22);
pcm.writeUInt32LE(SR, 24);
pcm.writeUInt32LE(SR * 4, 28);
pcm.writeUInt16LE(4, 32);
pcm.writeUInt16LE(16, 34);
pcm.write("data", 36);
pcm.writeUInt32LE(N * 4, 40);
for (let i = 0; i < N; i++) {
  const f = i < fadeFrom ? 1 : 1 - (i - fadeFrom) / (N - fadeFrom);
  pcm.writeInt16LE(Math.round(Math.max(-1, Math.min(1, OUT[0][i] * norm * f)) * 32767), 44 + i * 4);
  pcm.writeInt16LE(Math.round(Math.max(-1, Math.min(1, OUT[1][i] * norm * f)) * 32767), 46 + i * 4);
}
mkdirSync("assets/music", { recursive: true });
writeFileSync("assets/music/envirotech_score.wav", pcm);

// ── Report: loudness per movement, so the arc can be checked without listening ──
const rmsDb = (a: number, b: number) => {
  let acc = 0;
  const s0 = Math.floor(a * SR);
  const s1 = Math.floor(b * SR);
  for (let i = s0; i < s1; i++) acc += (OUT[0][i] * norm) ** 2 + (OUT[1][i] * norm) ** 2;
  return (10 * Math.log10(acc / (2 * (s1 - s0)) + 1e-12)).toFixed(1);
};
console.log(`Wrote assets/music/envirotech_score.wav (${DUR.toFixed(1)} s, ${SR} Hz)`);
const marks: [string, number, number][] = [
  ["water 0–7", 0, S.tech],
  ["technology", S.tech, S.eng],
  ["engineering", S.eng, S.life],
  ["operation", S.life, S.ind],
  ["industries", S.ind, S.proj],
  ["projects", S.proj, S.silver],
  ["silverstreams", S.silver, S.reveal],
  ["last beat before cut", S.reveal - 0.5, S.reveal],
  ["just after cut", S.reveal + 0.1, S.reveal + 0.6],
  ["reveal (logo)", SYNC.fill, DUR],
];
for (const [name, a, b] of marks) console.log(`  ${name.padEnd(22)} ${rmsDb(a, b)} dB RMS`);
