// Minimal AudioWorkletGlobalScope declarations (not part of TS's DOM lib).
declare const sampleRate: number;
declare const currentTime: number;
declare const currentFrame: number;
declare function registerProcessor(name: string, ctor: unknown): void;
declare class AudioWorkletProcessor {
  readonly port: MessagePort;
  constructor(options?: unknown);
}
