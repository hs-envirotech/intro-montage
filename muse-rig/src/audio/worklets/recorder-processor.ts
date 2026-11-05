// Captures the app's own stereo output (post-limiter) as 16-bit PCM chunks.
// No microphone involved.
class RecorderProcessor extends AudioWorkletProcessor {
  private on = false;
  private chunk: Int16Array;
  private pos = 0;
  constructor() {
    super();
    this.chunk = new Int16Array(2 * 8192);
    this.port.onmessage = (e: MessageEvent<{ cmd: 'start' | 'stop' }>) => {
      if (e.data.cmd === 'start') { this.on = true; this.pos = 0; }
      else { this.flush(); this.on = false; this.port.postMessage({ done: true }); }
    };
  }
  private flush() {
    if (this.pos > 0) {
      const out = this.chunk.slice(0, this.pos);
      this.port.postMessage({ pcm: out }, [out.buffer]);
      this.pos = 0;
    }
  }
  process(inputs: Float32Array[][]): boolean {
    if (!this.on) return true;
    const L = inputs[0]?.[0], R = inputs[0]?.[1] ?? L;
    const n = L ? L.length : 128;
    for (let i = 0; i < n; i++) {
      const l = L ? L[i] : 0, r = R ? R[i] : 0;
      this.chunk[this.pos++] = Math.max(-1, Math.min(1, l)) * 32767;
      this.chunk[this.pos++] = Math.max(-1, Math.min(1, r)) * 32767;
      if (this.pos >= this.chunk.length) this.flush();
    }
    return true;
  }
}
registerProcessor('muse-recorder', RecorderProcessor);
