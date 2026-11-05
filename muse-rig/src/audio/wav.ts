/** Interleaved stereo 16-bit PCM chunks → WAV Blob. */
export function encodeWav(chunks: Int16Array[], sampleRate: number): Blob {
  const samples = chunks.reduce((a, c) => a + c.length, 0);
  const dataBytes = samples * 2;
  const header = new ArrayBuffer(44);
  const v = new DataView(header);
  const str = (o: number, s: string) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
  str(0, 'RIFF'); v.setUint32(4, 36 + dataBytes, true); str(8, 'WAVE');
  str(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 2, true);
  v.setUint32(24, sampleRate, true); v.setUint32(28, sampleRate * 4, true); v.setUint16(32, 4, true); v.setUint16(34, 16, true);
  str(36, 'data'); v.setUint32(40, dataBytes, true);
  return new Blob([header, ...chunks.map((c) => c.buffer as ArrayBuffer)], { type: 'audio/wav' });
}
