/*
 * MUSE RIG guitar engine — AudioWorklet processor.
 *
 * TEMPORARY SOUND SOURCE: this is a physically-modelled (extended Karplus–Strong)
 * electric-guitar string, not recorded samples. It is a deliberate, clearly labelled
 * stand-in until original/licensed multisamples are recorded; sample playback feeds
 * into the same fuzz stage through this node's audio input (see samples.ts).
 *
 * Per voice:  pick excitation (filtered noise + pick-position comb) → fractional delay
 *             line (Hermite interpolation) → loss filter (one-pole, phase-compensated
 *             for tuning) → loop gain (T60-derived, AGC-held for sustain/feedback).
 * Engine:     Σ voices + sample input → noise gate → tight HPF → mid emphasis →
 *             2× oversampled two-stage asymmetric fuzz (+ octave-up blend) → output.
 * Tone stack, cabinet, delay, reverb and limiting run as native nodes after this.
 */
import type { Articulation, DSPParams, GuitarMsg } from '../protocol';

const SR = sampleRate;
const BUF = 4096; // ≥ one period of a ~12 Hz string at 48 kHz
const MASK = BUF - 1;
const MAX_VOICES = 24;
const SUB = 16; // pitch → delay recompute interval (samples)
const TAU = Math.PI * 2;

const ART: Record<Articulation, number> = { pick: 0, mute: 1, harmonic: 2, feedback: 3 };

const midiToHz = (m: number) => 440 * Math.pow(2, (m - 69) / 12);
const dbToLin = (db: number) => Math.pow(10, db / 20);
const onePoleCoef = (hz: number) => 1 - Math.exp((-TAU * hz) / SR);

// ---------------------------------------------------------------- biquad (RBJ)
class Biquad {
  b0 = 1; b1 = 0; b2 = 0; a1 = 0; a2 = 0; z1 = 0; z2 = 0;
  private set(b0: number, b1: number, b2: number, a0: number, a1: number, a2: number) {
    this.b0 = b0 / a0; this.b1 = b1 / a0; this.b2 = b2 / a0; this.a1 = a1 / a0; this.a2 = a2 / a0;
  }
  lowpass(f: number, q: number, fs: number) {
    const w = (TAU * f) / fs, c = Math.cos(w), al = Math.sin(w) / (2 * q);
    this.set((1 - c) / 2, 1 - c, (1 - c) / 2, 1 + al, -2 * c, 1 - al);
    return this;
  }
  peak(f: number, q: number, db: number, fs: number) {
    const A = Math.pow(10, db / 40), w = (TAU * f) / fs, c = Math.cos(w), al = Math.sin(w) / (2 * q);
    this.set(1 + al * A, -2 * c, 1 - al * A, 1 + al / A, -2 * c, 1 - al / A);
    return this;
  }
  process(x: number) {
    const y = this.b0 * x + this.z1;
    this.z1 = this.b1 * x - this.a1 * y + this.z2;
    this.z2 = this.b2 * x - this.a2 * y;
    return y;
  }
}

// ---------------------------------------------------------------- string voice
class Voice {
  buf = new Float32Array(BUF);
  exc = new Float32Array(BUF);
  excLen = 0; excPos = 0;
  w = 0;
  active = false; id = -1; str = -1; age = 0; art = 0;
  // pitch (midi, fractional) with linear ramps
  pitch = 40; pitchTarget = 40; pitchStep = 0;
  bend = 0; bendTarget = 0; bendStep = 0;
  vibDepth = 0; vibDepthTarget = 0; vibRate = 5.5; vibPhase = 0;
  delay = 100; // current delay (samples)
  // loop
  lp = 0; b = 0.5; g = 0.99; t60 = 3;
  sustain = false; agcTarget = 0.3; agcGain = 1;
  // amplitude
  gain = 1; gainTarget = 1; gainCoef = 0; releasing = false;
  // feedback harmonic swell
  fb = false; fbAmt = 0; fbPhase = 0; fbClock = 0; fbHarm = 2;
  // pick click
  click = 0; clickDecay = 0.99; clickLp = 0;
  // dc blocker
  dcx = 0; dcy = 0;
  // bookkeeping
  peak = 0; quiet = 0;

  start(id: number, midi: number, vel: number, art: number, str: number, sustain: boolean, p: DSPParams) {
    this.active = true; this.id = id; this.str = str; this.art = art; this.age = 0;
    this.pitch = this.pitchTarget = art === ART.harmonic ? midi + 12 : midi;
    this.pitchStep = 0;
    this.bend = this.bendTarget = 0; this.bendStep = 0;
    this.vibDepth = this.vibDepthTarget = 0; this.vibPhase = Math.random();
    this.gain = 1; this.gainTarget = 1; this.gainCoef = 0; this.releasing = false;
    this.fb = art === ART.feedback; this.fbAmt = 0; this.fbClock = 0; this.fbPhase = 0;
    this.fbHarm = midi < 52 ? 3 : 2;
    this.sustain = sustain || this.fb; this.agcGain = 1;
    this.quiet = 0; this.peak = 0;
    this.buf.fill(0); this.w = 0; this.lp = 0; this.dcx = this.dcy = 0;

    // loss-filter cutoff: brighter for harder picks; palm mute is dark and short
    const bright = p.brightness;
    let fc: number;
    if (art === ART.mute) { fc = 500 + 900 * vel; this.t60 = 0.09 + 0.12 * vel; }
    else if (art === ART.harmonic) { fc = 7000; this.t60 = p.sustainSec * 1.2; }
    else { fc = (2200 + 6500 * bright) * (0.6 + 0.5 * vel); this.t60 = p.sustainSec; }
    this.b = onePoleCoef(Math.min(fc, SR * 0.45));
    this.agcTarget = 0.18 + 0.25 * vel;
    this.updateDelay();
    this.excite(vel, art === ART.mute ? 0.25 : 0.35 + 0.65 * vel, art === ART.harmonic ? 0.5 : 0.1 + Math.random() * 0.1, 1);
    // pick click: short, bright transient — the "attack" of a pick on a wound string
    this.click = art === ART.mute ? 0.12 * vel : 0.3 * vel * vel;
    this.clickDecay = Math.exp(-1 / (0.0016 * SR));
    this.updateLoop();
  }

  /** Inject a pluck into the loop over one period (additive, so legato re-excites cleanly). */
  excite(amp: number, brightness: number, pickPos: number, scale: number) {
    const N = Math.max(8, Math.min(BUF - 2, Math.round(this.delay)));
    const c = 0.08 + 0.85 * brightness * brightness;
    let s = 0, peak = 1e-9;
    const tmp = this.exc;
    for (let k = 0; k < N; k++) {
      s += c * (Math.random() * 2 - 1 - s);
      tmp[k] = s;
    }
    // pick-position comb: notch the harmonics that have a node at the pick point
    const P = Math.max(1, Math.round(pickPos * N));
    for (let k = N - 1; k >= P; k--) tmp[k] -= tmp[k - P];
    // gentle window so the burst itself doesn't click
    for (let k = 0; k < N; k++) {
      const wv = Math.sin((Math.PI * k) / N);
      tmp[k] *= 0.35 + 0.65 * wv;
      const a = Math.abs(tmp[k]);
      if (a > peak) peak = a;
    }
    const norm = (0.55 * amp * scale) / peak;
    for (let k = 0; k < N; k++) tmp[k] *= norm;
    this.excLen = N; this.excPos = 0;
  }

  updateDelay() {
    const m = this.pitch + this.bend + this.vibDepth * Math.sin(TAU * this.vibPhase);
    const f = midiToHz(m);
    const w = (TAU * f) / SR;
    const a = 1 - this.b;
    // exact phase delay of the one-pole loss filter at f — keeps high notes in tune
    const ph = Math.atan2(a * Math.sin(w), 1 - a * Math.cos(w));
    const d = SR / f - ph / w;
    this.delay = Math.max(4, Math.min(BUF - 4, d));
  }

  updateLoop() {
    const f = SR / this.delay;
    const w = (TAU * f) / SR, a = 1 - this.b;
    const mag = this.b / Math.sqrt(1 - 2 * a * Math.cos(w) + a * a);
    const base = this.sustain ? 1 : Math.pow(10, -3 / (Math.max(0.02, this.t60) * f));
    this.g = Math.min(1.02, (base / mag) * (this.sustain ? this.agcGain : 1));
  }

  release(tau: number) {
    this.releasing = true;
    this.sustain = false; this.fb = false;
    this.gainTarget = 0;
    this.gainCoef = 1 - Math.exp(-1 / (Math.max(0.002, tau) * SR));
    // lifting the finger also damps the string
    this.t60 = Math.min(this.t60, Math.max(0.05, tau * 3));
    this.updateLoop();
  }
}

// ---------------------------------------------------------------- processor
type Queued = GuitarMsg & { time: number };

class GuitarProcessor extends AudioWorkletProcessor {
  private voices: Voice[] = [];
  private queue: Queued[] = [];
  private p: DSPParams = {
    driveDb: 30, tightHz: 110, midHz: 700, midDb: 3, bias: 0.25, octave: 0.12, stage2: 3,
    gateDb: -62, sustainSec: 3.5, brightness: 0.6, outGain: 0.5,
  };
  // fuzz stage state
  private hpX = 0; private hpY = 0; private hpA = 0.98;
  private mid = new Biquad();
  private up1 = new Biquad(); private up2 = new Biquad();
  private dn1 = new Biquad(); private dn2 = new Biquad();
  private isHpX = 0; private isHpY = 0; private isLp = 0;
  private isHpA = 0.995; private isLpB = 0.5;
  private drive = 30; private biasOff = 0;
  private gateEnv = 0; private gateGain = 1; private gateHold = 0; private gateThr = 0.001;
  private outDcX = 0; private outDcY = 0;
  private blocks = 0; private peak = 0; private cpu = 0;

  constructor() {
    super();
    for (let i = 0; i < MAX_VOICES; i++) this.voices.push(new Voice());
    // half-band-ish anti-imaging / anti-aliasing filters for 2× oversampling
    const fs2 = SR * 2, fc = Math.min(19000, SR * 0.42);
    this.up1.lowpass(fc, 0.5412, fs2); this.up2.lowpass(fc, 1.3066, fs2);
    this.dn1.lowpass(fc, 0.5412, fs2); this.dn2.lowpass(fc, 1.3066, fs2);
    this.applyParams();
    this.port.onmessage = (e: MessageEvent<GuitarMsg>) => this.onMsg(e.data);
  }

  private applyParams() {
    const p = this.p;
    this.hpA = Math.exp((-TAU * p.tightHz) / SR);
    this.mid.peak(p.midHz, 0.8, p.midDb, SR);
    this.drive = dbToLin(p.driveDb);
    this.biasOff = Math.tanh(p.bias);
    this.isHpA = Math.exp((-TAU * 35) / (SR * 2));
    this.isLpB = 1 - Math.exp((-TAU * 7500) / (SR * 2));
    this.gateThr = dbToLin(p.gateDb);
  }

  private onMsg(m: GuitarMsg) {
    if (m.type === 'params') { this.p = { ...this.p, ...m.p }; this.applyParams(); return; }
    if (m.type === 'allOff') { this.queue.length = 0; for (const v of this.voices) if (v.active) v.release(m.release); return; }
    // keep queue sorted by time (stable for equal times)
    const q = this.queue;
    let i = q.length;
    while (i > 0 && q[i - 1].time > m.time) i--;
    q.splice(i, 0, m as Queued);
  }

  private find(id: number) {
    for (const v of this.voices) if (v.active && v.id === id) return v;
    return undefined;
  }

  private alloc(): Voice {
    let best: Voice | undefined;
    for (const v of this.voices) if (!v.active) return v;
    // steal: prefer releasing voices, then the oldest
    for (const v of this.voices) if (!best || (v.releasing && !best.releasing) || (v.releasing === best.releasing && v.age > best.age)) best = v;
    return best!;
  }

  private exec(m: GuitarMsg) {
    switch (m.type) {
      case 'noteOn': {
        if (m.string >= 0) for (const v of this.voices) if (v.active && v.str === m.string && !v.releasing) v.release(0.006);
        const v = this.alloc();
        v.start(m.id, m.midi, Math.max(0.05, Math.min(1, m.vel)), ART[m.art], m.string, !!m.sustain, this.p);
        break;
      }
      case 'noteOff': { const v = this.find(m.id); if (v && !v.releasing) v.release(m.release); break; }
      case 'pitch': {
        const v = this.find(m.id); if (!v) break;
        v.pitchTarget = m.midi;
        const n = Math.max(1, m.glide * SR);
        v.pitchStep = (v.pitchTarget - v.pitch) / n;
        if (m.legato && m.legato > 0) {
          // hammer-on / pull-off: retune instantly-ish and add a soft re-excitation
          v.pitch = m.midi; v.pitchStep = 0; v.updateDelay();
          v.excite(m.legato, 0.5, 0.15, 1);
          if (!v.sustain) v.t60 = this.p.sustainSec;
        }
        break;
      }
      case 'bend': {
        const v = this.find(m.id); if (!v) break;
        v.bendTarget = m.semis;
        v.bendStep = (v.bendTarget - v.bend) / Math.max(1, m.glide * SR);
        break;
      }
      case 'vibrato': { const v = this.find(m.id); if (v) { v.vibDepthTarget = m.depth; v.vibRate = m.rate; } break; }
      case 'sustain': {
        const v = this.find(m.id); if (!v || v.releasing) break;
        v.sustain = m.on || v.fb; v.agcGain = 1;
        if (!v.sustain) v.t60 = this.p.sustainSec;
        break;
      }
      case 'feedback': {
        const v = this.find(m.id); if (!v || v.releasing) break;
        v.fb = m.on;
        if (m.on) { v.sustain = true; v.fbClock = 0; v.fbHarm = v.pitch < 52 ? 3 : 2; }
        break;
      }
      default: break;
    }
  }

  process(inputs: Float32Array[][], outputs: Float32Array[][]): boolean {
    const t0 = Date.now();
    const out = outputs[0][0];
    const input = inputs[0] && inputs[0][0];
    const n = out.length;
    out.fill(0);

    // ---- render voices with sample-accurate event dispatch
    let frame = 0;
    while (frame < n) {
      let end = n;
      const q = this.queue;
      while (q.length && q[0].time <= currentTime + frame / SR) this.exec(q.shift()!);
      if (q.length) {
        const f = Math.ceil((q[0].time - currentTime) * SR);
        if (f > frame && f < end) end = f;
      }
      for (const v of this.voices) if (v.active) this.renderVoice(v, out, frame, end);
      frame = end;
    }

    // ---- free finished voices
    let active = 0;
    for (const v of this.voices) {
      if (!v.active) continue;
      v.age++;
      if (v.releasing && v.gain < 1e-4) v.active = false;
      else if (!v.sustain && v.peak < 2e-5) { if (++v.quiet > 8) v.active = false; }
      else v.quiet = 0;
      if (v.sustain) {
        // AGC: hold sustained/feedback notes at a steady level instead of blowing up
        const err = v.agcTarget / Math.max(1e-4, v.peak);
        v.agcGain = Math.min(1.03, Math.max(0.97, v.agcGain * Math.pow(err, 0.05)));
      }
      v.peak = 0;
      if (v.active) active++;
    }

    // ---- fuzz stage
    const p = this.p;
    const drive = this.drive, s2 = p.stage2, oct = p.octave, bias = p.bias, bo = this.biasOff;
    const gateAtk = 1 - Math.exp(-1 / (0.0005 * SR)), gateRel = 1 - Math.exp(-1 / (0.06 * SR));
    const envRel = Math.exp(-1 / (0.02 * SR));
    let pk = this.peak;
    for (let i = 0; i < n; i++) {
      let x = out[i] + (input ? input[i] : 0);
      // noise gate (envelope follower with hold)
      const ax = Math.abs(x);
      this.gateEnv = ax > this.gateEnv ? ax : this.gateEnv * envRel;
      if (this.gateEnv > this.gateThr) { this.gateHold = 0.05 * SR; }
      else if (this.gateHold > 0) this.gateHold--;
      const gt = this.gateHold > 0 ? 1 : 0;
      this.gateGain += (gt - this.gateGain) * (gt > this.gateGain ? gateAtk : gateRel);
      x *= this.gateGain;
      // tightness HPF (one-pole) and mid emphasis before clipping
      const hp = this.hpA * (this.hpY + x - this.hpX);
      this.hpX = x; this.hpY = hp;
      x = this.mid.process(hp) * drive;

      // 2× oversampled nonlinearity
      let y = 0;
      for (let k = 0; k < 2; k++) {
        let u = this.up2.process(this.up1.process(k === 0 ? 2 * x : 0));
        // stage 1: asymmetric soft clip (even harmonics), bias removed
        let a = Math.tanh(u + bias) - bo;
        // octave-up blend (full-wave rectification) — synthetic edge
        if (oct > 0) a = a * (1 - oct) + (Math.abs(a) * 1.6 - 0.5) * oct;
        // interstage coupling: DC block + treble roll-off
        const h = this.isHpA * (this.isHpY + a - this.isHpX);
        this.isHpX = a; this.isHpY = h;
        this.isLp += this.isLpB * (h - this.isLp);
        // stage 2: harder symmetric clip
        u = this.isLp * s2;
        u = u / Math.sqrt(1 + u * u * 1.6);
        const d = this.dn2.process(this.dn1.process(u));
        if (k === 0) y = d;
      }
      // output DC block
      const o = y - this.outDcX + 0.995 * this.outDcY;
      this.outDcX = y; this.outDcY = o;
      const s = o * p.outGain;
      out[i] = s;
      const as = Math.abs(s); if (as > pk) pk = as;
    }
    this.peak = pk;

    const dt = Date.now() - t0;
    this.cpu = this.cpu * 0.95 + 0.05 * (dt / ((n / SR) * 1000));
    if (++this.blocks % 12 === 0) {
      this.port.postMessage({ type: 'meter', peak: this.peak, voices: active, cpu: this.cpu });
      this.peak = 0;
    }
    return true;
  }

  private renderVoice(v: Voice, out: Float32Array, from: number, to: number) {
    const buf = v.buf;
    const vibInc = v.vibRate / SR;
    let { w, lp, gain, click, clickLp, dcx, dcy, fbAmt, fbPhase } = v;
    const b = v.b, g = v.g, sus = v.sustain;
    const gainT = v.gainTarget, gainC = v.gainCoef;
    let pk = v.peak;
    const fbTarget = v.fb ? Math.min(0.6, Math.max(0, (v.fbClock - 0.35) * 0.6)) : 0;
    for (let i = from; i < to; i++) {
      if (((i - from) & (SUB - 1)) === 0) {
        // control-rate pitch update
        const steps = SUB;
        if (v.pitchStep !== 0) {
          v.pitch += v.pitchStep * steps;
          if ((v.pitchStep > 0 && v.pitch >= v.pitchTarget) || (v.pitchStep < 0 && v.pitch <= v.pitchTarget)) { v.pitch = v.pitchTarget; v.pitchStep = 0; }
        }
        if (v.bendStep !== 0) {
          v.bend += v.bendStep * steps;
          if ((v.bendStep > 0 && v.bend >= v.bendTarget) || (v.bendStep < 0 && v.bend <= v.bendTarget)) { v.bend = v.bendTarget; v.bendStep = 0; }
        }
        v.vibDepth += (v.vibDepthTarget - v.vibDepth) * 0.02;
        v.vibPhase += vibInc * steps; if (v.vibPhase > 1) v.vibPhase -= 1;
        v.updateDelay();
      }
      const D = v.delay;
      // Hermite-interpolated read D samples back
      const rp = w - D;
      const ip = Math.floor(rp);
      const fr = rp - ip;
      const xm1 = buf[(ip - 1) & MASK], x0 = buf[ip & MASK], x1 = buf[(ip + 1) & MASK], x2 = buf[(ip + 2) & MASK];
      const c1 = 0.5 * (x1 - xm1);
      const c2 = xm1 - 2.5 * x0 + 2 * x1 - 0.5 * x2;
      const c3 = 0.5 * (x2 - xm1) + 1.5 * (x0 - x1);
      const y = ((c3 * fr + c2) * fr + c1) * fr + x0;

      // loss filter + loop gain
      lp += b * (y - lp);
      let s = lp * g;
      if (sus) s = Math.tanh(s); // safety bound for held/feedback notes
      if (v.excPos < v.excLen) s += v.exc[v.excPos++];
      buf[w] = s;
      w = (w + 1) & MASK;

      // output: string + pick click + feedback harmonic
      let o = y;
      if (click > 1e-5) {
        clickLp += 0.6 * (Math.random() * 2 - 1 - clickLp);
        o += clickLp * click;
        click *= v.clickDecay;
      }
      if (v.fb || fbAmt > 1e-4) {
        fbAmt += (fbTarget - fbAmt) * 0.00004;
        fbPhase += (v.fbHarm * SR / D) / SR;
        if (fbPhase > 1) fbPhase -= 1;
        o = o * (1 - fbAmt * 0.6) + Math.sin(TAU * fbPhase) * fbAmt * 0.5;
      }
      const dy = o - dcx + 0.995 * dcy; dcx = o; dcy = dy;
      gain += (gainT - gain) * gainC;
      const r = dy * gain;
      out[i] += r;
      const a = r < 0 ? -r : r; if (a > pk) pk = a;
    }
    v.w = w; v.lp = lp; v.gain = gain; v.click = click; v.clickLp = clickLp; v.dcx = dcx; v.dcy = dcy;
    v.fbAmt = fbAmt; v.fbPhase = fbPhase; v.peak = pk;
    v.fbClock += (to - from) / SR;
    v.updateLoop();
  }
}

registerProcessor('muse-guitar', GuitarProcessor);
