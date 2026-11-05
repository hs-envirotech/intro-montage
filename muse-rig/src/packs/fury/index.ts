// FURY sound pack — Phase 1.
// All riffs below are ORIGINAL phrases written for this app in an aggressive,
// fuzz-driven rock idiom. They are not transcriptions of any recording.
// Authorised song-specific material can be added later as additional PadDefs.
import type { PadDef, Pattern, PatternEvent, Preset, SongPack } from '../types';
import type { Articulation } from '../../audio/protocol';

// pitches (standard tuning, low E = 40)
const E2 = 40, G2 = 43, A2 = 45, Bb2 = 46, B2 = 47, C3 = 48, D3 = 50, E4 = 64;

const p5 = (root: number) => [root, root + 7, root + 12];
const S = 0.25; // one sixteenth note, in beats

const ev = (step: number, notes: number[], a: Articulation, v: number, dur = S * 0.9, extra: Partial<PatternEvent> = {}): PatternEvent =>
  ({ b: step * S, d: dur, notes, a, v, ...extra });
const mute = (step: number, n = E2, v = 0.72) => ev(step, [n], 'mute', v, S * 0.8);
const pick = (step: number, n: number, v = 0.92, dur = S * 0.9) => ev(step, [n], 'pick', v, dur);
const chord = (step: number, root: number, steps: number, v = 1, extra: Partial<PatternEvent> = {}) =>
  ev(step, p5(root), 'pick', v, steps * S * 0.96, extra);

// RIFF A — driving low-register 16th phrase with chromatic pick-ups
function riffA(): Pattern {
  const bar = (o: number, end: PatternEvent[]) => [
    mute(o + 0), mute(o + 1, E2, 0.6), pick(o + 2, G2), mute(o + 3),
    mute(o + 4), pick(o + 5, Bb2), pick(o + 6, A2), pick(o + 7, G2),
    ...end,
  ];
  return {
    lengthBeats: 8,
    events: [
      ...bar(0, [mute(8), mute(9, E2, 0.6), pick(10, D3), mute(11), mute(12), pick(13, G2), pick(14, A2), pick(15, Bb2, 0.96)]),
      ...bar(16, [
        chord(24, D3, 2), // D5
        chord(26, C3, 2),
        chord(28, B2, 2, 1, { vib: { at: 0.15, depth: 0.25, rate: 6 } }),
        chord(30, Bb2, 2, 0.95, { slide: { at: 0.25, dur: 0.2, semis: -1 } }),
      ]),
    ],
  };
}

// RIFF B — syncopated power-chord stabs over palm-muted chugs
function riffB(): Pattern {
  return {
    lengthBeats: 8,
    events: [
      chord(0, E2, 2), mute(3), mute(4), chord(6, G2, 2), mute(9), chord(10, A2, 3), mute(14), mute(15, E2, 0.6),
      chord(16, E2, 2), mute(19), mute(20), chord(22, G2, 2), chord(24, Bb2, 2), chord(26, A2, 2),
      chord(28, G2, 3, 1, { slide: { at: 0.3, dur: 0.35, semis: -3 } }), mute(31, E2, 0.6),
    ],
  };
}

// CHUG — galloping palm-mute figure with an accent hit
function chug(): Pattern {
  const ev1: PatternEvent[] = [];
  for (let beat = 0; beat < 3; beat++) {
    const o = beat * 4;
    ev1.push(ev(o, [E2], 'mute', 0.95, S * 1.6), mute(o + 2, E2, 0.7), mute(o + 3, E2, 0.8));
  }
  ev1.push(chord(12, E2, 1.5, 1), mute(14, E2, 0.75), chord(15, G2, 1, 0.9));
  return { lengthBeats: 4, events: ev1 };
}

const pads: PadDef[] = [
  { id: 'riffA', label: 'RIFF A', sub: 'Low-register drive', accent: 'red', kind: 'pattern', pattern: riffA() },
  { id: 'riffB', label: 'RIFF B', sub: 'Syncopated stabs', accent: 'red', kind: 'pattern', pattern: riffB() },
  {
    id: 'power', label: 'POWER CHORD', sub: 'Tap = ring · hold = sustain', accent: 'cyan', kind: 'hold',
    hold: { notes: p5(E2), art: 'pick', vel: 1, engine: 'rhythm', sustainAfterMs: 450, release: 0.05 },
  },
  { id: 'chug', label: 'CHUG', sub: 'Palm-muted gallop', accent: 'red', kind: 'pattern', pattern: chug() },
  {
    id: 'sustain', label: 'SUSTAIN', sub: 'Hold for endless lead note', accent: 'cyan', kind: 'hold',
    hold: {
      notes: [E4], art: 'pick', vel: 0.95, engine: 'lead', sustainAfterMs: 120, release: 0.25,
      vibrato: { afterMs: 700, depth: 0.28, rate: 5.8 },
    },
  },
  {
    id: 'feedback', label: 'FEEDBACK', sub: 'Hold — it blooms', accent: 'cyan', kind: 'hold',
    hold: { notes: [E2 + 12], art: 'feedback', vel: 0.9, engine: 'lead', release: 0.6, vibrato: { afterMs: 1600, depth: 0.12, rate: 4.5 } },
  },
];

const presets: Preset[] = [
  {
    id: 'fury-main', name: 'FURY — MAIN',
    voicing: {
      driveDb: [14, 40], tightHz: 110, preMidHz: 750, preMidDb: 4, bias: 0.3, octave: 0.14, stage2: 3,
      gateDb: -64, sustainSec: [1.5, 7], bassDb: 2, midHz: 650, midDb: 2.5, presenceDb: 2,
      trebleDb: [-6, 4], cabLpHz: [3600, 6800], delayBeats: 0.75, delayFeedback: [0.15, 0.4], reverbSec: 1.6, leadDriveDb: 4,
    },
    macros: { fuzz: 0.72, tone: 0.55, sustain: 0.55, delay: 0.12, reverb: 0.15, output: 0.75 },
  },
  {
    id: 'fury-heavy', name: 'FURY — HEAVY',
    voicing: {
      driveDb: [20, 46], tightHz: 85, preMidHz: 480, preMidDb: 5, bias: 0.38, octave: 0.08, stage2: 4.2,
      gateDb: -60, sustainSec: [2, 8], bassDb: 4, midHz: 450, midDb: 4, presenceDb: 1,
      trebleDb: [-8, 2], cabLpHz: [3000, 5800], delayBeats: 0.5, delayFeedback: [0.1, 0.3], reverbSec: 1.3, leadDriveDb: 3,
    },
    macros: { fuzz: 0.85, tone: 0.45, sustain: 0.6, delay: 0.06, reverb: 0.12, output: 0.75 },
  },
  {
    id: 'fury-atmos', name: 'FURY — ATMOSPHERIC',
    voicing: {
      driveDb: [12, 36], tightHz: 120, preMidHz: 900, preMidDb: 3, bias: 0.22, octave: 0.2, stage2: 2.6,
      gateDb: -70, sustainSec: [3, 12], bassDb: 0, midHz: 850, midDb: 2, presenceDb: 3,
      trebleDb: [-5, 5], cabLpHz: [4000, 7500], delayBeats: 0.75, delayFeedback: [0.3, 0.62], reverbSec: 3.4, leadDriveDb: 5,
    },
    macros: { fuzz: 0.62, tone: 0.6, sustain: 0.85, delay: 0.45, reverb: 0.48, output: 0.75 },
  },
];

export const fury: SongPack = {
  id: 'fury',
  name: 'FURY',
  tagline: 'Aggressive fuzz · thick power chords · endless sustain',
  bpm: 132,
  scale: { root: 4, intervals: [0, 3, 5, 7, 10], name: 'E minor pentatonic' },
  presets,
  pads,
  performancePads: ['riffA', 'riffB', 'chug', 'power'],
  leadFretStart: 7,
  samples: [],
};
