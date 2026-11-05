// Song-pack system. A pack bundles tone presets, pad assignments, note patterns,
// an Easy-Mode scale and (optionally) a multisample map. New packs are added by
// creating a folder under src/packs/ and registering it in src/packs/index.ts.
import type { Articulation } from '../audio/protocol';

/** User-facing tone macros, all 0..1. These are what the tone panel edits. */
export interface Macros {
  fuzz: number;
  tone: number;
  sustain: number;
  delay: number;
  reverb: number;
  output: number;
}

/** Fixed character of a preset; macros sweep within these ranges. */
export interface Voicing {
  driveDb: [number, number];
  tightHz: number;
  preMidHz: number;
  preMidDb: number;
  bias: number;
  octave: number;
  stage2: number;
  gateDb: number;
  sustainSec: [number, number];
  bassDb: number;
  midHz: number;
  midDb: number;
  presenceDb: number;
  trebleDb: [number, number];
  cabLpHz: [number, number];
  /** Delay time in beats (0.75 = dotted eighth). */
  delayBeats: number;
  delayFeedback: [number, number];
  reverbSec: number;
  /** Extra drive for the lead engine (Performance / Guitar). */
  leadDriveDb: number;
}

export interface Preset {
  id: string;
  name: string;
  voicing: Voicing;
  macros: Macros;
}

export interface PatternEvent {
  /** Start, in beats from pattern start. */
  b: number;
  /** Duration in beats. */
  d: number;
  /** MIDI notes sounded together (power chord = several). */
  notes: number[];
  v: number;
  a: Articulation;
  /** Let notes ring rather than choking on the next event. */
  ring?: boolean;
  bend?: { at: number; dur: number; semis: number };
  slide?: { at: number; dur: number; semis: number };
  vib?: { at: number; depth: number; rate: number };
}

export interface Pattern {
  lengthBeats: number;
  events: PatternEvent[];
}

export interface HoldSound {
  notes: number[];
  art: Articulation;
  vel: number;
  engine: 'rhythm' | 'lead';
  /** Engage infinite sustain after this many ms held. */
  sustainAfterMs?: number;
  vibrato?: { afterMs: number; depth: number; rate: number };
  bend?: { afterMs: number; semis: number; glide: number };
  /** Release time constant (s) when the finger lifts. */
  release: number;
}

export interface PadDef {
  id: string;
  label: string;
  sub: string;
  accent: 'red' | 'cyan';
  kind: 'pattern' | 'hold';
  pattern?: Pattern;
  hold?: HoldSound;
}

/** Optional recorded multisamples. Empty in Phase 1 (see README). */
export interface SampleZone {
  url: string;
  rootMidi: number;
  loMidi: number;
  hiMidi: number;
  velLo: number;
  velHi: number;
  art: Articulation;
}

export interface SongPack {
  id: string;
  name: string;
  tagline: string;
  bpm: number;
  /** Easy Mode scale: root pitch class (0 = C) and intervals. */
  scale: { root: number; intervals: number[]; name: string };
  presets: Preset[];
  pads: PadDef[];
  performancePads: string[];
  leadFretStart: number;
  samples: SampleZone[];
}
