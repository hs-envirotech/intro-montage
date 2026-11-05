// Post-fuzz signal chain built from native Web Audio nodes (cheap on mobile CPUs).
//
//  in ─► tone stack (bass / mid / treble) ─► cabinet sim ─┬─► dry ───────────────┐
//                                                         ├─► ping-pong delay ───┤
//                                                         └─► convolution reverb ┴─► output profile ─► limiter ─► master ─► out

export type OutputProfile = 'speaker' | 'headphones';

export interface FxParams {
  bassDb: number;
  midDb: number;
  midHz: number;
  trebleDb: number;
  presenceDb: number;
  cabLpHz: number;
  delayTime: number; // seconds
  delayFeedback: number;
  delayMix: number;
  reverbMix: number;
  reverbSec: number;
}

export class FxChain {
  readonly input: GainNode;
  readonly output: GainNode; // master volume
  readonly tap: GainNode; // post-limiter tap for recording / metering
  private bass: BiquadFilterNode;
  private mid: BiquadFilterNode;
  private treble: BiquadFilterNode;
  private presence: BiquadFilterNode;
  private cabLp1: BiquadFilterNode;
  private cabLp2: BiquadFilterNode;
  private delayL: DelayNode;
  private delayR: DelayNode;
  private fb: GainNode;
  private delaySend: GainNode;
  private reverb: ConvolverNode;
  private reverbSend: GainNode;
  private profHp: BiquadFilterNode;
  private profLow: BiquadFilterNode;
  private profMid: BiquadFilterNode;
  private reverbSec = 0;
  private wetScale = 1;
  private last?: FxParams;

  constructor(private ctx: AudioContext) {
    const c = ctx;
    const bq = (type: BiquadFilterType, f: number, q = 0.707, g = 0) => {
      const n = c.createBiquadFilter(); n.type = type; n.frequency.value = f; n.Q.value = q; n.gain.value = g; return n;
    };
    this.input = c.createGain();
    this.bass = bq('lowshelf', 140);
    this.mid = bq('peaking', 700, 0.9);
    this.treble = bq('highshelf', 2800);
    this.presence = bq('peaking', 2400, 1.2);
    // 4x12-style cabinet: low cut, chest-thump resonance, upper-mid honk dip, steep top roll-off
    const cabHp = bq('highpass', 70, 0.8);
    const cabRes = bq('peaking', 115, 1.4, 3);
    const cabDip = bq('peaking', 420, 1.0, -3.5);
    this.cabLp1 = bq('lowpass', 5200, 0.9);
    this.cabLp2 = bq('lowpass', 7200, 0.6);
    const cabNotch = bq('peaking', 3900, 3, -4);

    const post = c.createGain();
    chain(this.input, this.bass, this.mid, this.treble, this.presence, cabHp, cabRes, cabDip, this.cabLp1, this.cabLp2, cabNotch, post);

    // mix bus
    const mix = c.createGain();
    post.connect(mix);

    // ping-pong delay
    this.delaySend = c.createGain(); this.delaySend.gain.value = 0;
    this.delayL = c.createDelay(2); this.delayR = c.createDelay(2);
    this.fb = c.createGain(); this.fb.gain.value = 0.3;
    const dlLp = bq('lowpass', 3200, 0.7);
    const dlHp = bq('highpass', 250, 0.7);
    const merger = c.createChannelMerger(2);
    post.connect(this.delaySend);
    this.delaySend.connect(dlHp).connect(dlLp).connect(this.delayL);
    this.delayL.connect(this.delayR);
    this.delayR.connect(this.fb).connect(this.delayL);
    this.delayL.connect(merger, 0, 0);
    this.delayR.connect(merger, 0, 1);
    merger.connect(mix);

    // reverb
    this.reverbSend = c.createGain(); this.reverbSend.gain.value = 0;
    this.reverb = c.createConvolver();
    const rvHp = bq('highpass', 300, 0.7);
    post.connect(this.reverbSend).connect(rvHp).connect(this.reverb).connect(mix);

    // output profile (phone speaker vs headphones)
    this.profHp = bq('highpass', 30, 0.7);
    this.profLow = bq('lowshelf', 200, 0.7, 0);
    this.profMid = bq('peaking', 1200, 0.8, 0);

    // limiter + soft clip safety
    const comp = c.createDynamicsCompressor();
    comp.threshold.value = -8; comp.knee.value = 4; comp.ratio.value = 20;
    comp.attack.value = 0.002; comp.release.value = 0.12;
    const makeup = c.createGain(); makeup.gain.value = 1.6;
    const clip = c.createWaveShaper();
    clip.curve = softClipCurve();
    clip.oversample = '2x';
    this.tap = c.createGain();
    this.output = c.createGain(); this.output.gain.value = 0.8;
    chain(mix, this.profHp, this.profLow, this.profMid, comp, makeup, clip, this.output, this.tap);
  }

  setProfile(p: OutputProfile) {
    const t = this.ctx.currentTime;
    if (p === 'speaker') {
      // phone speakers can't reproduce lows; spending headroom there just causes distortion
      this.profHp.frequency.setTargetAtTime(170, t, 0.05);
      this.profLow.gain.setTargetAtTime(-4, t, 0.05);
      this.profMid.gain.setTargetAtTime(3, t, 0.05);
    } else {
      this.profHp.frequency.setTargetAtTime(30, t, 0.05);
      this.profLow.gain.setTargetAtTime(1.5, t, 0.05);
      this.profMid.gain.setTargetAtTime(0, t, 0.05);
    }
  }

  setWetScale(s: number) { this.wetScale = s; if (this.last) this.set(this.last); }

  set(p: FxParams) {
    this.last = p;
    const t = this.ctx.currentTime, k = 0.03;
    this.bass.gain.setTargetAtTime(p.bassDb, t, k);
    this.mid.gain.setTargetAtTime(p.midDb, t, k);
    this.mid.frequency.setTargetAtTime(p.midHz, t, k);
    this.treble.gain.setTargetAtTime(p.trebleDb, t, k);
    this.presence.gain.setTargetAtTime(p.presenceDb, t, k);
    this.cabLp1.frequency.setTargetAtTime(p.cabLpHz, t, k);
    this.cabLp2.frequency.setTargetAtTime(p.cabLpHz * 1.4, t, k);
    this.delayL.delayTime.setTargetAtTime(p.delayTime, t, 0.08);
    this.delayR.delayTime.setTargetAtTime(p.delayTime, t, 0.08);
    this.fb.gain.setTargetAtTime(Math.min(0.85, p.delayFeedback), t, k);
    this.delaySend.gain.setTargetAtTime(Math.min(1.2, p.delayMix * this.wetScale), t, k);
    this.reverbSend.gain.setTargetAtTime(Math.min(1.5, p.reverbMix * this.wetScale), t, k);
    if (Math.abs(p.reverbSec - this.reverbSec) > 0.05) {
      this.reverbSec = p.reverbSec;
      this.reverb.buffer = makeReverbIR(this.ctx, p.reverbSec);
    }
  }
}

function chain(...nodes: AudioNode[]) {
  for (let i = 0; i < nodes.length - 1; i++) nodes[i].connect(nodes[i + 1]);
}

function softClipCurve() {
  const n = 2048, curve = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1)) * 2 - 1;
    // linear up to 0.8, then smoothly saturates to ±0.98
    const ax = Math.abs(x);
    curve[i] = ax < 0.8 ? x : Math.sign(x) * (0.8 + 0.18 * Math.tanh((ax - 0.8) / 0.18));
  }
  return curve;
}

/** Synthetic stereo hall IR: exponentially decaying, progressively darker noise. */
function makeReverbIR(ctx: BaseAudioContext, seconds: number) {
  const sr = ctx.sampleRate, len = Math.floor(sr * seconds);
  const buf = ctx.createBuffer(2, len, sr);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    let lp = 0;
    const pre = Math.floor(sr * 0.012);
    for (let i = pre; i < len; i++) {
      const t = (i - pre) / len;
      const env = Math.pow(1 - t, 2.2) * Math.exp(-3 * t);
      const coef = 0.85 - 0.7 * t; // darker tail
      lp += coef * (Math.random() * 2 - 1 - lp);
      d[i] = lp * env * 0.6;
    }
  }
  return buf;
}
