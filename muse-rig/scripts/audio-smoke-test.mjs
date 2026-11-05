// Headless smoke test: drives the built app in Chromium, records the app's own
// output with the in-app recorder, and analyses the audio. Not a substitute for
// testing on a real Android phone — it checks the engine produces sane audio.
//   npm run build && npm run test:audio
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';
const { chromium } = createRequire(import.meta.url)('playwright');

const OUT = process.env.OUT_WAV || 'smoke-test.wav';
const server = spawn('npx', ['vite', 'preview', '--port', '4199', '--strictPort'], { stdio: 'pipe', detached: true });
await new Promise((r) => { server.stdout.on('data', (d) => { if (String(d).includes('4199')) r(); }); setTimeout(r, 6000); });

const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: 412, height: 860 }, hasTouch: true });
const errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', (e) => errors.push(String(e)));
await page.goto('http://localhost:4199/');
const marks = [];
const mark = async (label) => marks.push({ label, t: await page.evaluate(() => (performance.now() - window.museEngine.recordingStartedAt) / 1000) });

// first gesture starts audio
await page.click('.tabs button.on');
await page.waitForFunction(() => window.museEngine.getSnapshot().status === 'running', null, { timeout: 10000 });
const snap0 = await page.evaluate(() => window.museEngine.getSnapshot());
await page.evaluate(() => window.museEngine.startRecording());
await page.waitForTimeout(300);

// --- tuning probe: isolated single notes on the lead engine
for (const midi of [40, 45, 57, 64, 76]) {
  await mark(`tune:${midi}`);
  await page.evaluate((m) => { const e = window.museEngine; const id = e.noteOn({ midi: m, vel: 0.9, bus: 'lead' }); setTimeout(() => e.noteOff(id, 0, 0.03), 700); }, midi);
  await page.waitForTimeout(900);
}
// --- riff mode pads
const pad = (i) => page.locator('.pad').nth(i);
await mark('riffA'); await pad(0).click(); await page.waitForTimeout(3800); await pad(0).click(); await page.waitForTimeout(900);
await mark('riffB'); await pad(1).click(); await page.waitForTimeout(3800); await pad(1).click(); await page.waitForTimeout(900);
await mark('chug'); await pad(3).click(); await page.waitForTimeout(2000); await pad(3).click(); await page.waitForTimeout(900);
const hold = async (i, ms) => { const b = await pad(i).boundingBox(); await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2); await page.mouse.down(); await page.waitForTimeout(ms); await page.mouse.up(); };
await mark('power-tap'); await pad(2).click(); await page.waitForTimeout(1500);
await mark('power-hold'); await hold(2, 2000); await page.waitForTimeout(600);
await mark('sustain'); await hold(4, 2500); await page.waitForTimeout(800);
await mark('feedback'); await hold(5, 3000); await page.waitForTimeout(1500);
// --- guitar mode: taps and a slide
await page.click('.tabs button:nth-child(2)');
await page.waitForSelector('.fretboard');
const fb = await page.locator('.fretboard').boundingBox();
const at = (fret, row) => ({ x: fb.x + ((0.6 + fret - 0.5) / 12.6) * fb.width, y: fb.y + ((row + 0.5) / 6) * fb.height });
await mark('fretboard');
for (const [f, r] of [[5, 5], [7, 5], [7, 4], [5, 4], [3, 3]]) { const p = at(f, r); await page.mouse.click(p.x, p.y); await page.waitForTimeout(250); }
await mark('slide');
let p = at(5, 2); await page.mouse.move(p.x, p.y); await page.mouse.down(); await page.waitForTimeout(400);
for (let f = 5; f <= 9; f += 0.25) { const q = at(f, 2); await page.mouse.move(q.x, q.y); await page.waitForTimeout(25); }
await page.waitForTimeout(500);
await mark('bend');
const q = at(9, 2); for (let k = 0; k <= 10; k++) { await page.mouse.move(q.x, q.y - k * 4); await page.waitForTimeout(30); }
await page.waitForTimeout(600); await page.mouse.up(); await page.waitForTimeout(800);

const snap1 = await page.evaluate(() => window.museEngine.getSnapshot());
const b64 = await page.evaluate(async () => {
  const r = await window.museEngine.stopRecording();
  const buf = new Uint8Array(await r.wav.arrayBuffer());
  let s = ''; for (let i = 0; i < buf.length; i += 0x8000) s += String.fromCharCode(...buf.subarray(i, i + 0x8000));
  return btoa(s);
});
await browser.close(); process.kill(-server.pid);

const wav = Buffer.from(b64, 'base64');
writeFileSync(OUT, wav);
const sr = wav.readUInt32LE(24);
const n = (wav.length - 44) / 4;
const L = new Float32Array(n);
for (let i = 0; i < n; i++) L[i] = wav.readInt16LE(44 + i * 4) / 32768;

let peak = 0, clip = 0, maxJump = 0, sum = 0;
for (let i = 0; i < n; i++) { const a = Math.abs(L[i]); if (a > peak) peak = a; if (a > 0.995) clip++; sum += L[i]; if (i) maxJump = Math.max(maxJump, Math.abs(L[i] - L[i - 1])); }
const rmsOf = (a, b) => { let s = 0; for (let i = a; i < b; i++) s += L[i] * L[i]; return Math.sqrt(s / Math.max(1, b - a)); };

// autocorrelation pitch estimate on the first 150 ms after onset
function pitch(t0) {
  const a = Math.floor((t0 + 0.12) * sr), len = Math.floor(0.12 * sr);
  let best = 0, bestLag = 0;
  const minLag = Math.floor(sr / 1000), maxLag = Math.floor(sr / 60);
  const corr = [];
  for (let lag = minLag; lag < maxLag; lag++) {
    let c = 0, e1 = 0, e2 = 0;
    for (let i = 0; i < len; i++) { const x = L[a + i], y = L[a + i + lag]; c += x * y; e1 += x * x; e2 += y * y; }
    corr[lag] = c / Math.sqrt(e1 * e2 + 1e-12);
  }
  // first lag reaching ≥ 92% of the global max (avoids octave errors)
  for (let lag = minLag; lag < maxLag; lag++) if (corr[lag] > best) { best = corr[lag]; bestLag = lag; }
  for (let lag = minLag + 1; lag < maxLag - 1; lag++) if (corr[lag] > 0.92 * best && corr[lag] >= corr[lag - 1] && corr[lag] >= corr[lag + 1]) { bestLag = lag; break; }
  const y0 = corr[bestLag - 1], y1 = corr[bestLag], y2 = corr[bestLag + 1];
  const frac = 0.5 * (y0 - y2) / (y0 - 2 * y1 + y2);
  return sr / (bestLag + frac);
}

console.log('--- MUSE RIG audio smoke test');
console.log(`console errors: ${errors.length}`); errors.forEach((e) => console.log('  ' + e));
console.log(`sample rate ${sr} · duration ${(n / sr).toFixed(1)} s · base latency ${snap0.baseLatencyMs?.toFixed(1)} ms`);
console.log(`peak ${peak.toFixed(3)} · samples ≥0.995: ${clip} · DC ${(sum / n).toExponential(2)} · max step ${maxJump.toFixed(3)}`);
console.log(`worklet DSP load (headless) ≈ ${(snap1.cpu * 100).toFixed(1)}% of real-time`);
for (let i = 0; i < marks.length; i++) {
  const m = marks[i], end = marks[i + 1]?.t ?? n / sr;
  const r = rmsOf(Math.floor(m.t * sr), Math.floor(end * sr));
  let line = `${m.label.padEnd(12)} t=${m.t.toFixed(2).padStart(6)}s  RMS ${(20 * Math.log10(r + 1e-9)).toFixed(1).padStart(6)} dBFS`;
  if (m.label.startsWith('tune:')) {
    const midi = +m.label.slice(5), want = 440 * 2 ** ((midi - 69) / 12), got = pitch(m.t);
    line += `  pitch ${got.toFixed(1)} Hz (want ${want.toFixed(1)}, ${(1200 * Math.log2(got / want)).toFixed(1)} cents)`;
  }
  console.log(line);
}
console.log(`wrote ${OUT}`);
