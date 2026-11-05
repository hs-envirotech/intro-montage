import { useEffect, useState } from 'react';
import {
  deleteCustomPreset, pack, presetName, resetToFury, saveCustomPreset, selectPreset, setState, useEngine, useStore,
} from '../state/store';
import type { Macros } from '../packs/types';
import { Slider } from './Slider';
import { engine } from '../audio/engine';
import { idbDelete, idbGetAll, idbPut } from '../storage/idb';

function SheetFrame({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="sheet-backdrop" onPointerDown={(e) => { if (e.target === e.currentTarget) setState({ sheet: null }); }}>
      <div className="sheet" role="dialog" aria-label={title}>
        <div className="sheet-head">
          <h2>{title}</h2>
          <button className="btn sq" onClick={() => setState({ sheet: null })} aria-label="Close">✕</button>
        </div>
        <div className="sheet-body">{children}</div>
      </div>
    </div>
  );
}

const KNOBS: [keyof Macros, string, 'red' | 'cyan'][] = [
  ['fuzz', 'FUZZ', 'red'], ['tone', 'TONE', 'cyan'], ['sustain', 'SUSTAIN', 'red'],
  ['delay', 'DELAY', 'cyan'], ['reverb', 'REVERB', 'cyan'], ['output', 'OUTPUT', 'red'],
];

export function ToneSheet() {
  const s = useStore((x) => x);
  const [name, setName] = useState('');
  return (
    <SheetFrame title="TONE">
      <div className="chips">
        {pack.presets.map((p) => (
          <button key={p.id} className={`chip ${s.presetId === p.id ? 'on' : ''}`} onClick={() => selectPreset(p.id)}>{p.name}</button>
        ))}
        {s.customPresets.map((p) => (
          <span key={p.id} className={`chip user ${s.presetId === p.id ? 'on' : ''}`}>
            <button onClick={() => selectPreset(p.id)}>{p.name}</button>
            <button className="x" onClick={() => deleteCustomPreset(p.id)} aria-label={`Delete ${p.name}`}>✕</button>
          </span>
        ))}
      </div>
      <div className="knobs">
        {KNOBS.map(([k, label, accent]) => (
          <Slider key={k} label={label} accent={accent} value={s.macros[k]}
            onChange={(v) => setState({ macros: { ...s.macros, [k]: v } })} />
        ))}
      </div>
      <div className="row">
        <button className="btn danger wide" onClick={resetToFury}>RESET TO FURY</button>
      </div>
      <div className="row save">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Preset name" maxLength={28} />
        <button className="btn" onClick={() => { saveCustomPreset(name || `${presetName(s)} *`); setName(''); }}>SAVE</button>
      </div>
      <p className="fine">Custom presets are stored on this device only.</p>
    </SheetFrame>
  );
}

export function SettingsSheet() {
  const s = useStore((x) => x);
  const e = useEngine();
  const fs = () => {
    const el = document.documentElement;
    if (document.fullscreenElement) { document.exitFullscreen().catch(() => {}); return; }
    el.requestFullscreen?.().then(() => {
      const o = screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> };
      o.lock?.('landscape').catch(() => {});
    }).catch(() => {});
  };
  return (
    <SheetFrame title="SETTINGS">
      <div className="setting">
        <label>Output</label>
        <div className="seg">
          <button className={s.profile === 'speaker' ? 'on' : ''} onClick={() => setState({ profile: 'speaker' })}>PHONE SPEAKER</button>
          <button className={s.profile === 'headphones' ? 'on' : ''} onClick={() => setState({ profile: 'headphones' })}>HEADPHONES</button>
        </div>
      </div>
      <div className="setting">
        <label>Riff quantise</label>
        <div className="seg">
          {(['off', '16th', 'beat', 'bar'] as const).map((q) => (
            <button key={q} className={s.quantise === q ? 'on' : ''} onClick={() => setState({ quantise: q })}>{q.toUpperCase()}</button>
          ))}
        </div>
      </div>
      <div className="setting">
        <label>Guitar control</label>
        <div className="seg">
          <button className={s.scheme === 'tap' ? 'on' : ''} onClick={() => setState({ scheme: 'tap' })}>TAP-TO-PLAY</button>
          <button className={s.scheme === 'strum' ? 'on' : ''} onClick={() => setState({ scheme: 'strum' })}>FRET + STRUM</button>
        </div>
      </div>
      <div className="setting">
        <label>Display</label>
        <button className="btn" onClick={fs}>FULLSCREEN / LANDSCAPE</button>
      </div>
      <div className="setting info">
        <label>Audio engine</label>
        <ul>
          <li>Status: <b>{e.status}</b>{e.error ? ` — ${e.error}` : ''}</li>
          <li>Sample rate: {e.sampleRate ? `${e.sampleRate} Hz` : '—'}</li>
          <li>Browser-reported latency: base {fmt(e.baseLatencyMs)}, output {fmt(e.outputLatencyMs)}</li>
          <li>Active voices: {e.voices} · DSP load ≈ {(e.cpu * 100).toFixed(0)}% of real-time</li>
          <li>Sound source: <b>{e.sampleCount ? `${e.sampleCount} recorded samples + string model` : 'modelled strings (temporary — no recorded samples yet)'}</b></li>
        </ul>
        <button className="btn" onClick={() => { engine.allOff(0.02); }}>PANIC (silence all)</button>
      </div>
    </SheetFrame>
  );
}

const fmt = (ms?: number) => (ms === undefined ? 'n/a' : `${ms.toFixed(1)} ms`);

interface Recording { id: string; name: string; created: number; duration: number; wav: Blob; compressed?: Blob }

export function RecordSheet() {
  const [list, setList] = useState<Recording[]>([]);
  const [playing, setPlaying] = useState<string | null>(null);
  const [audioEl] = useState(() => new Audio());
  const refresh = () => idbGetAll<Recording>('recordings').then((r) => setList(r.sort((a, b) => b.created - a.created))).catch(() => {});
  useEffect(() => { refresh(); return () => { audioEl.pause(); }; }, [audioEl]);

  const play = (r: Recording) => {
    if (playing === r.id) { audioEl.pause(); setPlaying(null); return; }
    audioEl.src = URL.createObjectURL(r.wav);
    audioEl.onended = () => setPlaying(null);
    audioEl.play().then(() => setPlaying(r.id)).catch(() => setPlaying(null));
  };
  const download = (blob: Blob, name: string) => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = name; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  };
  const ext = (b: Blob) => (b.type.includes('mp4') ? 'm4a' : 'webm');

  return (
    <SheetFrame title="RECORDINGS">
      <p className="fine">Use the ● REC button in the top bar. Recording captures the app's own guitar output with all effects — no microphone is used.</p>
      {!list.length && <p className="empty">No recordings yet.</p>}
      <ul className="recs">
        {list.map((r) => (
          <li key={r.id}>
            <div className="rec-meta"><b>{r.name}</b><small>{r.duration.toFixed(1)} s · {new Date(r.created).toLocaleString()}</small></div>
            <div className="rec-actions">
              <button className="btn sq" onClick={() => play(r)} aria-label="Play">{playing === r.id ? '■' : '▶'}</button>
              <button className="btn" onClick={() => download(r.wav, `${r.name}.wav`)}>WAV</button>
              {r.compressed && <button className="btn" onClick={() => download(r.compressed!, `${r.name}.${ext(r.compressed!)}`)}>{ext(r.compressed).toUpperCase()}</button>}
              <button className="btn sq danger" onClick={() => idbDelete('recordings', r.id).then(refresh)} aria-label="Delete">✕</button>
            </div>
          </li>
        ))}
      </ul>
    </SheetFrame>
  );
}

export async function saveRecording(res: { wav: Blob; compressed?: Blob; duration: number }) {
  const created = Date.now();
  const d = new Date(created);
  const name = `fury-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}-${String(d.getHours()).padStart(2, '0')}${String(d.getMinutes()).padStart(2, '0')}${String(d.getSeconds()).padStart(2, '0')}`;
  await idbPut('recordings', { id: String(created), name, created, ...res });
}
