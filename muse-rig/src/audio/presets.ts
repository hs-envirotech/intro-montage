import type { Macros, Voicing } from '../packs/types';
import type { DSPParams } from './protocol';
import type { FxParams } from './fx';

const lerp = (r: [number, number], t: number) => r[0] + (r[1] - r[0]) * t;

/** Map a preset's voicing + the six user macros onto real engine parameters. */
export function resolveParams(v: Voicing, m: Macros, bpm: number, lead = false) {
  const fuzzT = m.fuzz;
  const dsp: DSPParams = {
    driveDb: lerp(v.driveDb, fuzzT) + (lead ? v.leadDriveDb : 0),
    tightHz: v.tightHz,
    midHz: lead ? v.preMidHz * 1.25 : v.preMidHz,
    midDb: v.preMidDb + (lead ? 2 : 0),
    bias: v.bias,
    octave: v.octave * (0.6 + 0.8 * fuzzT),
    stage2: v.stage2 * (0.7 + 0.6 * fuzzT),
    gateDb: v.gateDb,
    sustainSec: lerp(v.sustainSec, m.sustain) * (lead ? 1.3 : 1),
    brightness: 0.25 + 0.6 * m.tone,
    // more drive → more output from the clipper; compensate so FUZZ isn't a volume knob
    outGain: (0.12 + 0.55 * m.output) * (1.15 - 0.35 * fuzzT),
  };
  const fx: FxParams = {
    bassDb: v.bassDb,
    midDb: v.midDb,
    midHz: v.midHz,
    trebleDb: lerp(v.trebleDb, m.tone),
    presenceDb: v.presenceDb + (m.tone - 0.5) * 3,
    cabLpHz: lerp(v.cabLpHz, m.tone),
    delayTime: Math.min(1.9, (60 / bpm) * v.delayBeats),
    delayFeedback: lerp(v.delayFeedback, m.delay),
    delayMix: m.delay * 0.7,
    reverbMix: m.reverb * 0.9,
    reverbSec: v.reverbSec,
  };
  return { dsp, fx };
}
