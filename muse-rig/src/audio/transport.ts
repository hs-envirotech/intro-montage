// Tempo-synced pattern playback with a look-ahead scheduler.
// Patterns are note events (not audio files), so tempo, tone and edits all apply live.
import { engine, type Bus } from './engine';
import type { Pattern, PatternEvent } from '../packs/types';

export type Quantise = 'off' | '16th' | 'beat' | 'bar';

interface Instance {
  padId: string;
  pattern: Pattern;
  bus: Bus;
  start: number; // audio time of beat 0
  loop: boolean;
  nextIdx: number;
  cycle: number;
  stopAt: number; // audio time, Infinity = run
  chokeBase: number;
}

const LOOKAHEAD = 0.12;
const TICK_MS = 25;

class Transport {
  bpm = 132;
  quantise: Quantise = 'beat';
  metronome = false;
  private origin = 0; // audio time of beat 0 of the running grid
  private running = false;
  private instances: Instance[] = [];
  private timer: number | null = null;
  private nextClick = 0;
  private listeners = new Set<() => void>();
  private chokeSeq = 100;

  subscribe = (f: () => void) => { this.listeners.add(f); return () => { this.listeners.delete(f); }; };
  private emit() { this.listeners.forEach((f) => f()); }

  get spb() { return 60 / this.bpm; }

  setBpm(bpm: number) {
    bpm = Math.max(60, Math.min(220, Math.round(bpm)));
    if (bpm === this.bpm) return;
    // keep the current musical position when the tempo changes
    const now = engine.now();
    if (this.running) {
      const beatNow = (now - this.origin) / this.spb;
      const newSpb = 60 / bpm;
      const newOrigin = now - beatNow * newSpb;
      for (const ins of this.instances) {
        const b = (ins.start - this.origin) / this.spb;
        ins.start = newOrigin + b * newSpb;
        if (ins.stopAt !== Infinity) ins.stopAt = newOrigin + ((ins.stopAt - this.origin) / this.spb) * newSpb;
      }
      this.nextClick = newOrigin + Math.ceil((this.nextClick - this.origin) / this.spb - 1e-6) * newSpb;
      this.origin = newOrigin;
    }
    this.bpm = bpm;
    this.emit();
  }

  setMetronome(on: boolean) {
    this.metronome = on;
    if (on) { this.ensureRunning(); this.tick(); }
    this.emit();
  }

  private ensureRunning() {
    if (this.running) return;
    this.origin = engine.now() + 0.03;
    this.nextClick = this.origin;
    this.running = true;
    // note: no tick() here — the caller registers its pattern first, otherwise the
    // scheduler would see nothing to play and halt itself straight away
    if (this.timer === null) this.timer = window.setInterval(() => this.tick(), TICK_MS);
  }

  private quantTime(): number {
    const now = engine.now() + 0.02;
    if (!this.running || this.quantise === 'off') return now;
    const grid = this.quantise === '16th' ? 0.25 : this.quantise === 'beat' ? 1 : 4;
    const beat = (now - this.origin) / this.spb;
    // small grace window: a tap just after the grid line snaps back onto it
    const q = Math.ceil(beat / grid - 0.08) * grid;
    return Math.max(now, this.origin + q * this.spb);
  }

  isPlaying(padId: string) { return this.instances.some((i) => i.padId === padId && i.stopAt === Infinity); }

  /** Progress 0..1 through the current cycle (for UI). */
  progress(padId: string) {
    const ins = this.instances.find((i) => i.padId === padId);
    if (!ins) return 0;
    const len = ins.pattern.lengthBeats * this.spb;
    const t = engine.now() - ins.start;
    return t < 0 ? 0 : (t % len) / len;
  }

  /** Start a pattern pad; rhythm patterns are exclusive (clip-launcher style). */
  start(padId: string, pattern: Pattern, loop: boolean, bus: Bus = 'rhythm') {
    this.ensureRunning();
    const t = this.quantTime();
    for (const ins of this.instances) if (ins.bus === bus && ins.stopAt > t) ins.stopAt = t;
    this.chokeSeq += 10;
    this.instances.push({ padId, pattern, bus, start: t, loop, nextIdx: 0, cycle: 0, stopAt: Infinity, chokeBase: this.chokeSeq });
    this.tick();
    this.emit();
  }

  stop(padId: string) {
    const t = this.quantTime();
    for (const ins of this.instances) if (ins.padId === padId && ins.stopAt > t) ins.stopAt = t;
    this.emit();
  }

  setLoop(loop: boolean) { for (const ins of this.instances) ins.loop = loop; }

  stopAll() {
    this.instances = [];
    engine.allOff(0.03);
    if (!this.metronome) this.halt();
    this.emit();
  }

  private halt() {
    this.running = false;
    if (this.timer !== null) { clearInterval(this.timer); this.timer = null; }
  }

  private tick() {
    const now = engine.now();
    const horizon = now + LOOKAHEAD;
    const spb = this.spb;
    if (this.metronome) {
      while (this.nextClick < horizon) {
        const beat = Math.round((this.nextClick - this.origin) / spb);
        if (this.nextClick >= now - 0.01) engine.click(this.nextClick, beat % 4 === 0);
        this.nextClick += spb;
      }
    }
    let changed = false;
    for (const ins of this.instances) {
      const len = ins.pattern.lengthBeats;
      const evs = ins.pattern.events;
      for (;;) {
        if (ins.nextIdx >= evs.length) {
          if (!ins.loop) break;
          ins.nextIdx = 0; ins.cycle++;
        }
        const e = evs[ins.nextIdx];
        const t = ins.start + (ins.cycle * len + e.b) * spb;
        if (t >= horizon) break;
        if (t >= ins.stopAt) { ins.nextIdx = evs.length; ins.loop = false; break; }
        if (t >= now - 0.05) this.play(ins, e, t, Math.min(ins.stopAt, t + e.d * spb));
        ins.nextIdx++;
      }
    }
    const before = this.instances.length;
    this.instances = this.instances.filter((ins) => {
      const finished = ins.nextIdx >= ins.pattern.events.length && !ins.loop;
      const endT = ins.start + (ins.cycle + 1) * ins.pattern.lengthBeats * spb;
      return !(finished && now > Math.min(endT, ins.stopAt));
    });
    if (this.instances.length !== before) changed = true;
    if (!this.instances.length && !this.metronome && this.running) this.halt();
    if (changed) this.emit();
  }

  private play(ins: Instance, e: PatternEvent, t: number, off: number) {
    const spb = this.spb;
    e.notes.forEach((midi, i) => {
      const id = engine.noteOn({
        midi, vel: e.v * (i === 0 ? 1 : 0.85), art: e.a, time: t, bus: ins.bus,
        string: e.ring ? -1 : ins.chokeBase + i,
      });
      if (e.bend) engine.bend(id, e.bend.semis, e.bend.dur * spb, t + e.bend.at * spb);
      if (e.slide) engine.pitch(id, midi + e.slide.semis, e.slide.dur * spb, t + e.slide.at * spb);
      if (e.vib) engine.vibrato(id, e.vib.depth, e.vib.rate, t + e.vib.at * spb);
      if (!e.ring) engine.noteOff(id, off, e.a === 'mute' ? 0.012 : 0.03);
    });
  }
}

export const transport = new Transport();
