import { engine } from '../audio/engine';

/** Standard tuning, string 0 = low E. */
export const TUNING = [40, 45, 50, 55, 59, 64];
export const STRING_NAMES = ['E', 'A', 'D', 'G', 'B', 'e'];
const NAMES = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'];

export const noteName = (midi: number) => NAMES[((midi % 12) + 12) % 12];

export function inScale(midi: number, root: number, intervals: number[]) {
  return intervals.includes((((midi - root) % 12) + 12) % 12);
}

/** Nearest in-scale fret on a string (Easy Mode). */
export function snapFret(str: number, fret: number, root: number, intervals: number[], max = 24) {
  for (let d = 0; d <= 3; d++) {
    for (const f of d === 0 ? [fret] : [fret - d, fret + d]) {
      if (f >= 0 && f <= max && inScale(TUNING[str] + f, root, intervals)) return f;
    }
  }
  return fret;
}

/** Run `fn` once the audio engine is live. The first call must come from a user gesture. */
export function withAudio(fn: () => void) {
  if (engine.isReady) { engine.ensure(); fn(); return; }
  engine.ensure().then(fn, () => {});
}
