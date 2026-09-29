// ─────────────────────────────────────────────────────────────────────────────
// Temp score + sound design, synthesised from scratch and locked to the scene
// timings in src/config.ts. It exists so the edit can be reviewed with sound;
// replace it with a composed/licensed track for the final film.
//
//   npm run score   →   assets/music/envirotech_temp_score.wav
// ─────────────────────────────────────────────────────────────────────────────
import { writeFileSync, mkdirSync } from "node:fs";
import { SCENE_TIMINGS, TOTAL_FRAMES, VIDEO } from "../src/config.ts";

const SR = 44100;
const DUR = TOTAL_FRAMES / VIDEO.fps;
const N = Math.ceil(DUR * SR);
const L = new Float32Array(N);
const R = new Float32Array(N);
const sendL = new Float32Array(N); // reverb send
const sendR = new Float32Array(N);

const sceneStart = (id: string) => SCENE_TIMINGS.find((s) => s.id === id)!.from / VIDEO.fps;
const T = {
  impact: 100 / VIDEO.fps, // droplet hits the surface (Scene1Origin IMPACT)
  rebound: 138 / VIDEO.fps,
  tech: sceneStart("technology"),
  engineering: sceneStart("engineering"),
  lifecycle: sceneStart("lifecycle"),
  projects: sceneStart("projects"),
  silverstreams: sceneStart("silverstreams"),
  reveal: sceneStart("reveal"),
  wordmark: sceneStart("reveal") + 96 / VIDEO.fps, // wordmark fill (Scene7Reveal FILL)
};

const BPM = 96;
const BEAT = 60 / BPM;

// Deterministic noise
let seed = 1234567;
const noise = () => {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 2147483648 - 1;
};

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const ramp = (t: number, a: number, b: number) => clamp01((t - a) / (b - a));

/** Add a mono signal at time `start` with pan (-1..1) and reverb send. */
const add = (start: number, dur: number, fn: (t: number) => number, gain = 1, pan = 0, send = 0) => {
  const s0 = Math.max(0, Math.floor(start * SR));
  const s1 = Math.min(N, Math.floor((start + dur) * SR));
  const gl = gain * Math.cos(((pan + 1) * Math.PI) / 4);
  const gr = gain * Math.sin(((pan + 1) * Math.PI) / 4);
  for (let i = s0; i < s1; i++) {
    const v = fn((i - s0) / SR);
    L[i] += v * gl;
    R[i] += v * gr;
    if (send) {
      sendL[i] += v * gl * send;
      sendR[i] += v * gr * send;
    }
  }
};

// ── Instruments ─────────────────────────────────────────────────────────────
const TAU = Math.PI * 2;

const droplet = (at: number, gain: number) =>
  add(at, 0.6, (t) => {
    // Pitch falls fast from ~2.4 kHz to 900 Hz: the "plink" of a drop on still water.
    const ph = TAU * (900 * t + (1500 / 90) * (1 - Math.exp(-t * 90)));
    return Math.sin(ph) * Math.exp(-t * 18);
  }, gain, 0, 0.9);

const sub = (at: number, gain: number) =>
  add(at, 0.9, (t) => {
    const ph = TAU * (38 * t + (14 / 9) * (1 - Math.exp(-t * 9)));
    return Math.sin(ph) * Math.exp(-t * 5) * Math.min(1, t * 200);
  }, gain);

const kick = (at: number, gain: number) =>
  add(at, 0.45, (t) => {
    const ph = TAU * (45 * t + (70 / 30) * (1 - Math.exp(-t * 30)));
    return (Math.sin(ph) * Math.exp(-t * 9) + noise() * Math.exp(-t * 400) * 0.3) * Math.min(1, t * 400);
  }, gain);

let hpPrev = 0;
let hpOut = 0;
const hat = (at: number, gain: number, pan: number, len = 0.05) =>
  add(at, len, (t) => {
    const x = noise();
    hpOut = 0.92 * (hpOut + x - hpPrev);
    hpPrev = x;
    return hpOut * Math.exp(-t * (1 / len) * 4);
  }, gain, pan, 0.15);

/** Metallic impact: low thump + inharmonic ring, like steel under load. */
const impact = (at: number, gain: number) => {
  add(at, 2.2, (t) => Math.sin(TAU * (32 * t + 1.5 * (1 - Math.exp(-t * 6)))) * Math.exp(-t * 2.2), gain * 0.9, 0, 0.3);
  add(at, 2.4, (t) => {
    const e = Math.exp(-t * 3);
    return (Math.sin(TAU * 181 * t) * 0.5 + Math.sin(TAU * 263.7 * t) * 0.35 + Math.sin(TAU * 347.2 * t) * 0.25 + Math.sin(TAU * 522 * t) * 0.12) * e;
  }, gain * 0.28, 0.1, 0.7);
  add(at, 0.25, (t) => noise() * Math.exp(-t * 30), gain * 0.25, -0.1, 0.5);
};

/** Hydraulic swell: band-limited noise rising and falling, like flow in a header. */
const whoosh = (at: number, dur: number, gain: number, pan: number) => {
  let lp = 0;
  let lp2 = 0;
  add(at, dur, (t) => {
    const x = noise();
    const env = Math.sin(Math.PI * clamp01(t / dur)) ** 2;
    const k = 0.02 + 0.08 * env;
    lp += k * (x - lp);
    lp2 += k * (lp - lp2);
    return (lp - lp2) * 6 * env;
  }, gain, pan, 0.4);
};

const saw = (f: number, t: number, harmonics = 12) => {
  let v = 0;
  for (let h = 1; h <= harmonics; h++) v += Math.sin(TAU * f * h * t) / h;
  return v * 0.6;
};

const note = (m: number) => 440 * 2 ** ((m - 69) / 12);

// ── Arrangement ─────────────────────────────────────────────────────────────
// 0–10 s: near silence, low atmosphere, the droplet, a sub-bass pulse.
add(0, T.reveal + 0.35, (t) => {
  const swell = 0.35 + 0.65 * ramp(t, 0, 44);
  const cut = t > T.reveal ? Math.max(0, 1 - (t - T.reveal) / 0.35) : 1;
  const lfo = 0.75 + 0.25 * Math.sin(TAU * 0.07 * t);
  return (Math.sin(TAU * 41.2 * t) * 0.6 + Math.sin(TAU * 61.74 * t + 0.4) * 0.35 + Math.sin(TAU * 82.4 * t) * 0.12) * swell * lfo * cut * Math.min(1, t / 2.5);
}, 0.16);

droplet(T.impact, 0.5);
droplet(T.rebound, 0.22);
for (let t = T.impact + 0.3; t < T.tech + 3; t += BEAT * 2) sub(t, 0.26 + 0.1 * ramp(t, T.impact, T.tech));

// 10–25 s: rhythm arrives with the technology; hydraulic movement.
const rhythmStart = 10;
for (let b = 0; ; b++) {
  const t = rhythmStart + b * BEAT;
  if (t >= T.reveal - 0.05) break;
  const build = ramp(t, rhythmStart, 40);
  kick(t, 0.35 + 0.35 * build);
  hat(t + BEAT / 2, 0.05 + 0.08 * build, 0.3);
  if (t > 25) hat(t + BEAT / 4, 0.03 + 0.05 * build, -0.3, 0.03);
  if (t > 40) hat(t + (3 * BEAT) / 4, 0.05, -0.2, 0.03);
}
for (let t = 12; t < T.reveal - 1; t += BEAT * 8) whoosh(t, BEAT * 4, 0.35 + 0.3 * ramp(t, 12, 45), t % 2 > 1 ? 0.4 : -0.4);

// 25–40 s: bass ostinato, mechanical impacts, growing scale.
const BASS = [40, 40, 43, 40, 45, 43, 40, 38]; // E1 E1 G1 E1 A1 G1 E1 D1
let lpB = 0;
add(25, T.reveal - 25, (t) => {
  const abs = 25 + t;
  const step = Math.floor(t / (BEAT / 2));
  const local = t - step * (BEAT / 2);
  const f = note(BASS[step % BASS.length]);
  const env = Math.exp(-local * 5) * 0.8 + 0.2;
  const x = saw(f, t, 8) * env;
  const cutoff = 0.03 + 0.05 * ramp(abs, 25, 52);
  lpB += cutoff * (x - lpB);
  return lpB * (0.5 + 0.5 * ramp(abs, 25, 32));
}, 0.32, 0, 0.05);
for (let t = 25; t < T.reveal - 0.5; t += BEAT * 8) impact(t, 0.55 + 0.3 * ramp(t, 25, 50));

// 40–54 s: largest scale — pads, faster pulse, a riser into the drop.
const PAD = [52, 59, 62, 66, 67]; // E3 B3 D4 F#4 G4
let lpP = 0;
add(40, T.reveal - 40, (t) => {
  let v = 0;
  for (const m of PAD) v += saw(note(m) * 1.002, t, 6) + saw(note(m) * 0.998, t + 0.01, 6);
  lpP += 0.04 * (v - lpP);
  return lpP * ramp(t, 0, 4) * 0.08;
}, 1, 0, 0.6);
for (let t = 40; t < T.reveal - 0.5; t += BEAT * 4) impact(t, 0.45);
let lpR = 0;
add(T.reveal - 4, 4, (t) => {
  const k = 0.01 + 0.25 * (t / 4) ** 2;
  lpR += k * (noise() - lpR);
  return lpR * (t / 4) ** 2;
}, 0.45, 0, 0.3);

// 54–60 s: sudden restraint. A quiet bed, then one final deep tonal impact on the wordmark.
add(T.reveal + 0.2, DUR - T.reveal - 0.2, (t) => {
  const env = ramp(t, 0, 1.5) * (1 - ramp(t, DUR - T.reveal - 2.2, DUR - T.reveal - 0.3));
  return (Math.sin(TAU * note(52) * t) * 0.5 + Math.sin(TAU * note(59) * t) * 0.3) * env;
}, 0.035, 0, 0.8);
add(T.wordmark, DUR - T.wordmark, (t) => {
  const tail = 1 - ramp(t, DUR - T.wordmark - 1.2, DUR - T.wordmark);
  return (Math.sin(TAU * (33 * t + 2 * (1 - Math.exp(-t * 4)))) * Math.exp(-t * 0.9) + noise() * Math.exp(-t * 25) * 0.2) * tail;
}, 0.8, 0, 0.35);
add(T.wordmark, DUR - T.wordmark, (t) => {
  const tail = 1 - ramp(t, DUR - T.wordmark - 1.2, DUR - T.wordmark);
  return (Math.sin(TAU * note(88) * t) * 0.5 + Math.sin(TAU * note(95) * t) * 0.3) * Math.exp(-t * 1.4) * tail;
}, 0.05, 0, 0.9);

// ── Reverb (Schroeder: 4 combs + 2 allpasses per channel) ───────────────────
const reverb = (input: Float32Array, out: Float32Array, spread: number) => {
  const combs = [1557, 1617, 1491, 1422].map((d) => ({ buf: new Float32Array(d + spread), i: 0, fb: 0.84, lp: 0 }));
  const aps = [225, 556].map((d) => ({ buf: new Float32Array(d + spread), i: 0 }));
  for (let n = 0; n < N; n++) {
    let acc = 0;
    for (const c of combs) {
      const y = c.buf[c.i];
      c.lp = y * 0.7 + c.lp * 0.3;
      c.buf[c.i] = input[n] + c.lp * c.fb;
      c.i = (c.i + 1) % c.buf.length;
      acc += y;
    }
    for (const a of aps) {
      const y = a.buf[a.i];
      const x = acc + y * 0.5;
      a.buf[a.i] = x;
      a.i = (a.i + 1) % a.buf.length;
      acc = y - x * 0.5;
    }
    out[n] += acc * 0.22;
  }
};
reverb(sendL, L, 0);
reverb(sendR, R, 23);

// ── Master: soft clip, normalise to -1 dBFS, fade the last frames ──────────
let peak = 0;
for (let i = 0; i < N; i++) {
  L[i] = Math.tanh(L[i] * 1.1);
  R[i] = Math.tanh(R[i] * 1.1);
  peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
}
const norm = 0.89 / peak;
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
  const fade = Math.min(1, (N - i) / (SR * 0.5));
  pcm.writeInt16LE(Math.round(Math.max(-1, Math.min(1, L[i] * norm * fade)) * 32767), 44 + i * 4);
  pcm.writeInt16LE(Math.round(Math.max(-1, Math.min(1, R[i] * norm * fade)) * 32767), 46 + i * 4);
}
mkdirSync("assets/music", { recursive: true });
writeFileSync("assets/music/envirotech_temp_score.wav", pcm);
console.log(`Wrote assets/music/envirotech_temp_score.wav (${DUR.toFixed(1)} s)`);
