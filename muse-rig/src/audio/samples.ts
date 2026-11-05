// Multisample playback path. Recorded notes are played with AudioBufferSourceNodes
// and fed into the guitar worklet's INPUT, so they pass through exactly the same
// gate → fuzz → cab → FX chain as the modelled strings.
//
// Phase 1 ships with NO samples (pack.samples is empty) because no original or
// licensed guitar recordings are available yet. This code path is therefore
// untested against real recordings; see README → "Adding real guitar samples".
import type { Articulation } from './protocol';
import type { SampleZone } from '../packs/types';

interface Loaded { zone: SampleZone; buffer: AudioBuffer }
interface Playing { src: AudioBufferSourceNode; amp: GainNode; root: number }

export class SamplePlayer {
  private loaded: Loaded[] = [];
  private playing = new Map<number, Playing>();

  constructor(private ctx: AudioContext, private dest: AudioNode) {}

  get count() { return this.loaded.length; }

  async load(zones: SampleZone[]) {
    const results = await Promise.allSettled(zones.map(async (zone) => {
      const res = await fetch(zone.url);
      if (!res.ok) throw new Error(`${zone.url}: ${res.status}`);
      const buffer = await this.ctx.decodeAudioData(await res.arrayBuffer());
      return { zone, buffer };
    }));
    this.loaded = results.flatMap((r) => (r.status === 'fulfilled' ? [r.value] : []));
    return results.filter((r) => r.status === 'rejected').length;
  }

  /** Returns true if a sample covered this note (otherwise the string model plays it). */
  noteOn(id: number, midi: number, vel: number, art: Articulation, time: number): boolean {
    const z = this.pick(midi, vel, art);
    if (!z) return false;
    const c = this.ctx, t = Math.max(time, c.currentTime);
    const src = c.createBufferSource();
    src.buffer = z.buffer;
    src.detune.value = (midi - z.zone.rootMidi) * 100;
    const amp = c.createGain();
    amp.gain.setValueAtTime(0, t);
    amp.gain.linearRampToValueAtTime(0.4 + 0.6 * vel, t + 0.002);
    src.connect(amp).connect(this.dest);
    src.start(t);
    src.onended = () => { amp.disconnect(); this.playing.delete(id); };
    this.playing.set(id, { src, amp, root: z.zone.rootMidi });
    return true;
  }

  has(id: number) { return this.playing.has(id); }

  noteOff(id: number, time: number, release: number) {
    const p = this.playing.get(id); if (!p) return;
    const t = Math.max(time, this.ctx.currentTime);
    p.amp.gain.cancelScheduledValues(t);
    p.amp.gain.setTargetAtTime(0, t, release);
    p.src.stop(t + release * 8);
  }

  pitch(id: number, midi: number, glide: number, time: number, bend = 0) {
    const p = this.playing.get(id); if (!p) return;
    const t = Math.max(time, this.ctx.currentTime);
    p.src.detune.cancelScheduledValues(t);
    p.src.detune.linearRampToValueAtTime((midi + bend - p.root) * 100, t + Math.max(0.001, glide));
  }

  allOff(release: number) { for (const id of [...this.playing.keys()]) this.noteOff(id, 0, release); }

  private pick(midi: number, vel: number, art: Articulation): Loaded | undefined {
    const want = art === 'feedback' ? 'pick' : art;
    let best: Loaded | undefined, bestD = Infinity;
    for (const l of this.loaded) {
      const z = l.zone;
      if (z.art !== want || vel < z.velLo || vel > z.velHi || midi < z.loMidi || midi > z.hiMidi) continue;
      const d = Math.abs(midi - z.rootMidi);
      if (d < bestD) { bestD = d; best = l; }
    }
    return best;
  }
}
