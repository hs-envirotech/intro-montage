// Message protocol between the main thread and the guitar AudioWorklet.
// Shared by both sides; only types cross the boundary at build time.

export type Articulation = 'pick' | 'mute' | 'harmonic' | 'feedback';

/** All `time` fields are AudioContext seconds. 0 (or a past time) = "as soon as possible". */
export type GuitarMsg =
  | { type: 'noteOn'; id: number; midi: number; vel: number; art: Articulation; string: number; time: number; sustain?: boolean }
  | { type: 'noteOff'; id: number; time: number; release: number }
  | { type: 'pitch'; id: number; midi: number; glide: number; time: number; legato?: number }
  | { type: 'bend'; id: number; semis: number; glide: number; time: number }
  | { type: 'vibrato'; id: number; depth: number; rate: number; time: number }
  | { type: 'sustain'; id: number; on: boolean; time: number }
  | { type: 'feedback'; id: number; on: boolean; time: number }
  | { type: 'allOff'; release: number }
  | { type: 'params'; p: DSPParams };

/** Parameters of the per-engine string + fuzz stage (inside the worklet). */
export interface DSPParams {
  /** Pre-fuzz drive in dB. */
  driveDb: number;
  /** Pre-fuzz high-pass ("tightness") in Hz. */
  tightHz: number;
  /** Pre-fuzz mid emphasis: centre frequency and gain. Shapes what distorts. */
  midHz: number;
  midDb: number;
  /** Asymmetry of the first clipping stage (0 = symmetric). Adds even harmonics. */
  bias: number;
  /** Octave-up (full-wave rectified) blend, 0..1 — the "synthetic" fuzz edge. */
  octave: number;
  /** Second gain stage multiplier (1..8). */
  stage2: number;
  /** Noise gate threshold in dBFS (pre-drive). */
  gateDb: number;
  /** Natural string decay (T60) for picked notes, seconds. */
  sustainSec: number;
  /** String brightness 0..1 (loop filter cutoff). */
  brightness: number;
  /** Linear output gain of the engine. */
  outGain: number;
}

export type WorkletReport = { type: 'meter'; peak: number; voices: number; cpu: number };
