import { useEffect, useState } from 'react';
import { pack, presetName, selectPreset, setState, useEngine, useStore, type Tab } from '../state/store';
import { engine } from '../audio/engine';
import { Slider } from './Slider';
import { saveRecording } from './Sheets';

const TABS: [Tab, string][] = [['riffs', 'RIFFS'], ['guitar', 'GUITAR'], ['performance', 'PERFORMANCE']];
const MAX_REC_S = 600;

export function TopBar() {
  const s = useStore((x) => x);
  const e = useEngine();
  const [rec, setRec] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!rec) return;
    const t = setInterval(() => {
      const sec = (performance.now() - engine.recordingStartedAt) / 1000;
      setElapsed(sec);
      if (sec > MAX_REC_S) toggleRec();
    }, 250);
    return () => clearInterval(t);
  });

  const toggleRec = async () => {
    if (!rec) {
      try { await engine.startRecording(); setRec(true); setElapsed(0); } catch { /* engine error is shown in status */ }
    } else {
      setRec(false);
      const res = await engine.stopRecording();
      await saveRecording(res).catch(() => {});
      setState({ sheet: 'rec' });
    }
  };

  const all = [...pack.presets.map((p) => p.id), ...s.customPresets.map((c) => c.id)];
  const cycle = () => selectPreset(all[(all.indexOf(s.presetId) + 1) % all.length]);
  const status = e.status === 'running' ? 'LIVE' : e.status === 'starting' ? 'STARTING' : e.status === 'error' ? 'ERROR' : e.status === 'suspended' ? 'PAUSED' : 'TAP TO START';
  const lat = e.outputLatencyMs ?? e.baseLatencyMs;

  return (
    <header className="topbar">
      <div className="brand">
        <span className="logo">MUSE RIG</span>
        <span className="pack">{pack.name}</span>
      </div>
      <button className="preset" onClick={cycle} title="Next preset">
        <small>PRESET</small>{presetName(s)}
      </button>
      <div className={`status ${e.status}`} title={e.error ?? ''} onClick={() => engine.ensure().catch(() => {})}>
        <i className="dot" style={{ opacity: e.status === 'running' ? 0.4 + Math.min(1, e.peak * 1.5) * 0.6 : 1 }} />
        <span>{status}</span>
        {e.status === 'running' && lat !== undefined && <small>{lat.toFixed(0)} ms</small>}
      </div>
      <button className={`rec ${rec ? 'on' : ''}`} onClick={toggleRec} aria-label={rec ? 'Stop recording' : 'Record'}>
        ● {rec ? fmtTime(elapsed) : 'REC'}
      </button>
    </header>
  );
}

const fmtTime = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

export function Tabs() {
  const tab = useStore((s) => s.tab);
  return (
    <nav className="tabs" role="tablist">
      {TABS.map(([id, label]) => (
        <button key={id} role="tab" aria-selected={tab === id} className={tab === id ? 'on' : ''} onClick={() => setState({ tab: id })}>
          {label}
        </button>
      ))}
    </nav>
  );
}

export function BottomBar() {
  const s = useStore((x) => x);
  return (
    <footer className="bottombar">
      <Slider className="vol" label="VOLUME" value={s.volume} onChange={(v) => setState({ volume: v })} />
      <button className="btn" onClick={() => setState({ sheet: 'tone' })}>EFFECTS</button>
      <button className="btn" onClick={() => setState({ sheet: 'rec' })}>RECORDINGS</button>
      <button className="btn" onClick={() => setState({ sheet: 'settings' })} aria-label="Settings">SETTINGS</button>
    </footer>
  );
}

export function EngineBanner() {
  const e = useEngine();
  if (e.status !== 'error') return null;
  return <div className="banner error">Audio could not start: {e.error}</div>;
}
