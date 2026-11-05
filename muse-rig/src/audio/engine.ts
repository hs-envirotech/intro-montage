import guitarWorkletUrl from './worklets/guitar-processor.ts?worker&url';
import recorderWorkletUrl from './worklets/recorder-processor.ts?worker&url';
import type { Articulation, DSPParams, GuitarMsg, WorkletReport } from './protocol';
import { FxChain, type FxParams, type OutputProfile } from './fx';
import { SamplePlayer } from './samples';
import type { SampleZone } from '../packs/types';
import { encodeWav } from './wav';

export type Bus = 'rhythm' | 'lead';
export type EngineStatus = 'off' | 'starting' | 'running' | 'suspended' | 'error';

export interface NoteOpts {
  midi: number;
  vel?: number;
  art?: Articulation;
  /** Choke group: a new note on the same string cuts the previous one. -1 = none. */
  string?: number;
  time?: number;
  sustain?: boolean;
  bus?: Bus;
}

export interface EngineSnapshot {
  status: EngineStatus;
  error?: string;
  sampleRate: number;
  baseLatencyMs?: number;
  outputLatencyMs?: number;
  voices: number;
  peak: number;
  cpu: number;
  sampleCount: number;
}

let nextId = 1;

/**
 * Single-file builds (the claude.ai demo page) embed the worklet code in
 * window.__MUSE_WORKLETS__ because separate script files can't be loaded there.
 * Try a blob: URL, then a data: URL; the normal build just uses the file URL.
 */
async function loadWorklet(ctx: AudioContext, name: 'guitar' | 'recorder', url: string) {
  const inline = (window as unknown as { __MUSE_WORKLETS__?: Record<string, string> }).__MUSE_WORKLETS__?.[name];
  if (!inline) return ctx.audioWorklet.addModule(url);
  const blobUrl = URL.createObjectURL(new Blob([inline], { type: 'text/javascript' }));
  try {
    await ctx.audioWorklet.addModule(blobUrl);
  } catch {
    const b64 = btoa(unescape(encodeURIComponent(inline)));
    await ctx.audioWorklet.addModule(`data:text/javascript;base64,${b64}`);
  } finally {
    URL.revokeObjectURL(blobUrl);
  }
}

/**
 * The single shared guitar engine. Two worklet instances ("rhythm" for riffs and
 * "lead" for live playing) share one tone stack / cabinet / FX / limiter chain, so
 * every mode sounds like the same rig while riff and lead volumes stay independent.
 */
export class AudioEngine {
  ctx: AudioContext | null = null;
  private node: Partial<Record<Bus, AudioWorkletNode>> = {};
  private busGain: Partial<Record<Bus, GainNode>> = {};
  private wah?: BiquadFilterNode;
  private fx?: FxChain;
  private samples: Partial<Record<Bus, SamplePlayer>> = {};
  private recNode?: AudioWorkletNode;
  private mediaDest?: MediaStreamAudioDestinationNode;
  private clickBus?: GainNode;
  private ready: Promise<void> | null = null;
  private pending: (() => void)[] = [];
  private voiceBus = new Map<number, Bus>();
  private sampleVoices = new Map<number, { midi: number; bend: number }>();
  private listeners = new Set<() => void>();
  private meters: Record<Bus, WorkletReport> = {
    rhythm: { type: 'meter', peak: 0, voices: 0, cpu: 0 },
    lead: { type: 'meter', peak: 0, voices: 0, cpu: 0 },
  };
  private snap: EngineSnapshot = { status: 'off', sampleRate: 0, voices: 0, peak: 0, cpu: 0, sampleCount: 0 };
  // last-applied state, re-sent once the graph exists
  private dsp: Partial<Record<Bus, DSPParams>> = {};
  private fxParams?: FxParams;
  private profile: OutputProfile = 'speaker';
  private master = 0.8;
  private busVol: Record<Bus, number> = { rhythm: 1, lead: 1 };
  private wetScale = 1;
  private wahAmt: number | null = null;
  private sampleZones: SampleZone[] = [];

  // ------------------------------------------------------------- lifecycle
  /** Must be called from inside a user gesture (pointerdown/click) the first time. */
  ensure(): Promise<void> {
    if (this.ctx && this.ctx.state !== 'running' && this.ctx.state !== 'closed') {
      this.ctx.resume().catch(() => {});
    }
    if (this.ready) return this.ready;
    this.setStatus('starting');
    let ctx: AudioContext;
    try {
      ctx = new AudioContext({ latencyHint: 'interactive' });
    } catch (e) {
      this.fail(`Web Audio is not available: ${String(e)}`);
      return Promise.reject(e);
    }
    this.ctx = ctx;
    ctx.resume().catch(() => {}); // synchronous call inside the gesture unlocks audio on Android
    this.ready = this.build(ctx).then(
      () => {
        ctx.onstatechange = () => this.syncStatus();
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible' && ctx.state !== 'running') ctx.resume().catch(() => {});
        });
        this.syncStatus();
        const q = this.pending; this.pending = [];
        q.forEach((f) => f());
      },
      (e) => { this.fail(String(e?.message ?? e)); throw e; },
    );
    return this.ready;
  }

  private async build(ctx: AudioContext) {
    if (!ctx.audioWorklet) {
      throw new Error(window.isSecureContext
        ? 'This browser does not support AudioWorklet.'
        : 'Audio engine needs a secure context (https:// or localhost). See README → "Play it on your Android phone".');
    }
    await Promise.all([loadWorklet(ctx, 'guitar', guitarWorkletUrl), loadWorklet(ctx, 'recorder', recorderWorkletUrl)]);
    const fx = new FxChain(ctx);
    this.fx = fx;
    fx.output.connect(ctx.destination);
    this.wah = ctx.createBiquadFilter();
    this.wah.type = 'peaking'; this.wah.Q.value = 3.5; this.wah.gain.value = 0; this.wah.frequency.value = 800;
    for (const bus of ['rhythm', 'lead'] as Bus[]) {
      const n = new AudioWorkletNode(ctx, 'muse-guitar', { numberOfInputs: 1, numberOfOutputs: 1, outputChannelCount: [1] });
      n.port.onmessage = (e: MessageEvent<WorkletReport>) => { this.meters[bus] = e.data; this.updateMeters(); };
      const g = ctx.createGain();
      g.gain.value = this.busVol[bus];
      if (bus === 'lead') n.connect(this.wah).connect(g); else n.connect(g);
      g.connect(fx.input);
      this.node[bus] = n; this.busGain[bus] = g;
      const sampleIn = ctx.createGain();
      sampleIn.connect(n);
      this.samples[bus] = new SamplePlayer(ctx, sampleIn);
    }
    this.clickBus = ctx.createGain();
    this.clickBus.gain.value = 0.35;
    this.clickBus.connect(fx.output);
    // recorder taps the final output
    this.recNode = new AudioWorkletNode(ctx, 'muse-recorder', { numberOfInputs: 1, numberOfOutputs: 1, channelCount: 2, channelCountMode: 'explicit' });
    fx.tap.connect(this.recNode);
    this.recNode.connect(ctx.destination); // outputs silence; keeps the node pulled
    // re-apply any state set before audio started
    for (const bus of ['rhythm', 'lead'] as Bus[]) if (this.dsp[bus]) this.setDSP(bus, this.dsp[bus]!);
    if (this.fxParams) fx.set(this.fxParams);
    fx.setProfile(this.profile);
    fx.setWetScale(this.wetScale);
    fx.output.gain.value = this.master;
    this.setWah(this.wahAmt);
    if (this.sampleZones.length) await this.loadSamples(this.sampleZones);
  }

  private fail(msg: string) { this.snap = { ...this.snap, status: 'error', error: msg }; this.emit(); }
  private setStatus(s: EngineStatus) { this.snap = { ...this.snap, status: s }; this.emit(); }

  private syncStatus() {
    const c = this.ctx; if (!c) return;
    const st: EngineStatus = c.state === 'running' ? 'running' : c.state === 'closed' ? 'error' : 'suspended';
    this.snap = {
      ...this.snap,
      status: st,
      sampleRate: c.sampleRate,
      baseLatencyMs: c.baseLatency ? c.baseLatency * 1000 : undefined,
      outputLatencyMs: (c as AudioContext & { outputLatency?: number }).outputLatency
        ? (c as AudioContext & { outputLatency: number }).outputLatency * 1000 : undefined,
    };
    this.emit();
  }

  private lastMeterEmit = 0;
  private updateMeters() {
    const now = performance.now();
    if (now - this.lastMeterEmit < 120) return;
    this.lastMeterEmit = now;
    const r = this.meters.rhythm, l = this.meters.lead;
    this.syncStatus();
    this.snap = { ...this.snap, voices: r.voices + l.voices, peak: Math.max(r.peak, l.peak), cpu: r.cpu + l.cpu };
    this.emit();
  }

  subscribe = (f: () => void) => { this.listeners.add(f); return () => { this.listeners.delete(f); }; };
  getSnapshot = () => this.snap;
  private emit() { this.listeners.forEach((f) => f()); }

  get isReady() { return !!this.node.rhythm; }
  now() { return this.ctx ? this.ctx.currentTime : 0; }

  // ------------------------------------------------------------- notes
  private send(bus: Bus, m: GuitarMsg) {
    const n = this.node[bus];
    if (n) n.port.postMessage(m);
    else this.pending.push(() => this.node[bus]!.port.postMessage(m));
  }

  noteOn(o: NoteOpts): number {
    const id = nextId++;
    const bus = o.bus ?? 'lead';
    this.voiceBus.set(id, bus);
    const vel = o.vel ?? 0.9, art = o.art ?? 'pick', time = o.time ?? 0;
    const sp = this.samples[bus];
    if (sp && sp.count && sp.noteOn(id, o.midi, vel, art, time)) {
      this.sampleVoices.set(id, { midi: o.midi, bend: 0 });
      return id;
    }
    this.send(bus, { type: 'noteOn', id, midi: o.midi, vel, art, string: o.string ?? -1, time, sustain: o.sustain });
    if (this.voiceBus.size > 512) this.voiceBus.delete(this.voiceBus.keys().next().value!);
    return id;
  }

  noteOff(id: number, time = 0, release = 0.03) {
    const bus = this.voiceBus.get(id); if (!bus) return;
    if (this.sampleVoices.has(id)) { this.samples[bus]!.noteOff(id, time, release); this.sampleVoices.delete(id); return; }
    this.send(bus, { type: 'noteOff', id, time, release });
  }

  pitch(id: number, midi: number, glide = 0.04, time = 0, legato = 0) {
    const bus = this.voiceBus.get(id); if (!bus) return;
    const sv = this.sampleVoices.get(id);
    if (sv) { sv.midi = midi; this.samples[bus]!.pitch(id, midi, glide, time, sv.bend); return; }
    this.send(bus, { type: 'pitch', id, midi, glide, time, legato });
  }

  bend(id: number, semis: number, glide = 0.02, time = 0) {
    const bus = this.voiceBus.get(id); if (!bus) return;
    const sv = this.sampleVoices.get(id);
    if (sv) { sv.bend = semis; this.samples[bus]!.pitch(id, sv.midi, glide, time, semis); return; }
    this.send(bus, { type: 'bend', id, semis, glide, time });
  }

  vibrato(id: number, depth: number, rate = 5.5, time = 0) {
    const bus = this.voiceBus.get(id); if (bus) this.send(bus, { type: 'vibrato', id, depth, rate, time });
  }

  sustain(id: number, on: boolean, time = 0) {
    const bus = this.voiceBus.get(id); if (bus) this.send(bus, { type: 'sustain', id, on, time });
  }

  feedback(id: number, on: boolean, time = 0) {
    const bus = this.voiceBus.get(id); if (bus) this.send(bus, { type: 'feedback', id, on, time });
  }

  allOff(release = 0.04, bus?: Bus) {
    for (const b of (bus ? [bus] : ['rhythm', 'lead']) as Bus[]) {
      this.node[b]?.port.postMessage({ type: 'allOff', release } satisfies GuitarMsg);
      this.samples[b]?.allOff(release);
    }
  }

  /** Metronome click — bypasses the fuzz, goes straight to the master. */
  click(time: number, accent: boolean) {
    const c = this.ctx; if (!c || !this.clickBus) return;
    const o = c.createOscillator(), g = c.createGain();
    o.frequency.value = accent ? 1760 : 1175;
    g.gain.setValueAtTime(0, time);
    g.gain.linearRampToValueAtTime(accent ? 1 : 0.6, time + 0.001);
    g.gain.exponentialRampToValueAtTime(0.001, time + 0.05);
    o.connect(g).connect(this.clickBus);
    o.start(time); o.stop(time + 0.06);
  }

  // ------------------------------------------------------------- parameters
  setDSP(bus: Bus, p: DSPParams) {
    this.dsp[bus] = p;
    this.node[bus]?.port.postMessage({ type: 'params', p } satisfies GuitarMsg);
  }
  setFx(p: FxParams) { this.fxParams = p; this.fx?.set(p); }
  setProfile(p: OutputProfile) { this.profile = p; this.fx?.setProfile(p); }
  setWetScale(s: number) { this.wetScale = s; this.fx?.setWetScale(s); }
  setMaster(v: number) {
    this.master = v;
    if (this.fx && this.ctx) this.fx.output.gain.setTargetAtTime(v, this.ctx.currentTime, 0.03);
  }
  setBusVolume(bus: Bus, v: number) {
    this.busVol[bus] = v;
    const g = this.busGain[bus];
    if (g && this.ctx) g.gain.setTargetAtTime(v, this.ctx.currentTime, 0.03);
  }
  /** Expression-pedal wah on the lead bus. null = bypass. */
  setWah(amount: number | null) {
    this.wahAmt = amount;
    const w = this.wah, c = this.ctx; if (!w || !c) return;
    const t = c.currentTime;
    if (amount === null) { w.gain.setTargetAtTime(0, t, 0.03); return; }
    w.frequency.setTargetAtTime(350 * Math.pow(2200 / 350, amount), t, 0.02);
    w.gain.setTargetAtTime(11, t, 0.03);
  }
  async loadSamples(zones: SampleZone[]) {
    this.sampleZones = zones;
    if (!zones.length || !this.ctx) return;
    await Promise.all((['rhythm', 'lead'] as Bus[]).map((b) => this.samples[b]!.load(zones)));
    this.snap = { ...this.snap, sampleCount: this.samples.rhythm!.count };
    this.emit();
  }

  // ------------------------------------------------------------- recording
  private recChunks: Int16Array[] = [];
  private mediaRec?: MediaRecorder;
  private mediaChunks: Blob[] = [];
  private recStart = 0;

  get recordingStartedAt() { return this.recStart; }

  async startRecording() {
    await this.ensure();
    const c = this.ctx!, rec = this.recNode!;
    this.recChunks = [];
    rec.port.onmessage = (e: MessageEvent<{ pcm?: Int16Array }>) => { if (e.data.pcm) this.recChunks.push(e.data.pcm); };
    rec.port.postMessage({ cmd: 'start' });
    // optional compressed copy, where the browser supports it
    this.mediaChunks = [];
    this.mediaRec = undefined;
    if (typeof MediaRecorder !== 'undefined') {
      try {
        if (!this.mediaDest) { this.mediaDest = c.createMediaStreamDestination(); this.fx!.tap.connect(this.mediaDest); }
        const mime = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'].find((m) => MediaRecorder.isTypeSupported(m));
        if (mime) {
          this.mediaRec = new MediaRecorder(this.mediaDest.stream, { mimeType: mime, audioBitsPerSecond: 192000 });
          this.mediaRec.ondataavailable = (e) => { if (e.data.size) this.mediaChunks.push(e.data); };
          this.mediaRec.start(1000);
        }
      } catch { this.mediaRec = undefined; }
    }
    this.recStart = performance.now();
  }

  async stopRecording(): Promise<{ wav: Blob; compressed?: Blob; duration: number }> {
    const rec = this.recNode!;
    const done = new Promise<void>((res) => {
      rec.port.onmessage = (e: MessageEvent<{ pcm?: Int16Array; done?: boolean }>) => {
        if (e.data.pcm) this.recChunks.push(e.data.pcm);
        if (e.data.done) res();
      };
    });
    rec.port.postMessage({ cmd: 'stop' });
    const compressed = this.mediaRec
      ? await new Promise<Blob | undefined>((res) => {
          const mr = this.mediaRec!;
          mr.onstop = () => res(this.mediaChunks.length ? new Blob(this.mediaChunks, { type: mr.mimeType }) : undefined);
          mr.stop();
        })
      : undefined;
    await done;
    this.recStart = 0;
    const sr = this.ctx!.sampleRate;
    const wav = encodeWav(this.recChunks, sr);
    const frames = this.recChunks.reduce((a, c) => a + c.length, 0) / 2;
    this.recChunks = [];
    return { wav, compressed, duration: frames / sr };
  }
}

export const engine = new AudioEngine();
// exposed for automated smoke tests / debugging in DevTools
(window as unknown as { museEngine: AudioEngine }).museEngine = engine;
