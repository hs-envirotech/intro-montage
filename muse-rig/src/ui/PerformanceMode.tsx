import { useRef, useState } from 'react';
import { pack, setState, useStore } from '../state/store';
import { engine } from '../audio/engine';
import { Pad, capture } from './Pad';
import { Fretboard } from './Fretboard';
import { Slider } from './Slider';
import { withAudio } from './theory';

export function PerformanceMode() {
  const s = useStore((x) => x);
  const pads = pack.performancePads.map((id) => pack.pads.find((p) => p.id === id)!).filter(Boolean);
  const live = useRef<number[]>([]);
  const lastMidi = useRef(64);
  const fbVoice = useRef<number | null>(null);
  const fbIds = useRef<number[]>([]);
  const [fb, setFb] = useState(false);

  const fbDown = (e: React.PointerEvent) => {
    capture(e);
    setFb(true);
    withAudio(() => {
      fbIds.current = [...live.current];
      if (fbIds.current.length) fbIds.current.forEach((id) => engine.feedback(id, true));
      else fbVoice.current = engine.noteOn({ midi: lastMidi.current, vel: 0.9, art: 'feedback', bus: 'lead', string: 5 });
    });
  };
  const fbUp = () => {
    setFb(false);
    // voices whose finger already lifted must not keep ringing forever
    fbIds.current.forEach((id) => { engine.feedback(id, false); if (!live.current.includes(id)) engine.noteOff(id, 0, 0.4); });
    fbIds.current = [];
    if (fbVoice.current !== null) { engine.noteOff(fbVoice.current, 0, 0.5); fbVoice.current = null; }
  };

  return (
    <div className="perf-mode">
      <div className="perf-pads">
        {pads.map((p, i) => <Pad key={p.id} pad={p} index={i} compact />)}
      </div>
      <div className="perf-board">
        <Fretboard fretStart={pack.leadFretStart} fretCount={8} easy={s.easy} power={false} palmMute={false}
          autoVib={s.autoVib} scheme="tap"
          onNote={(m) => { lastMidi.current = m; }}
          onVoices={(ids) => { live.current = ids; }} />
        <div className="perf-under">
          <button className={`btn toggle ${s.easy ? 'on' : ''}`} onClick={() => setState({ easy: !s.easy })}>EASY</button>
          <Slider label="RIFF VOL" value={s.riffVol} onChange={(v) => setState({ riffVol: v })} accent="red" />
          <Slider label="LEAD VOL" value={s.leadVol} onChange={(v) => setState({ leadVol: v })} />
        </div>
      </div>
      <div className="perf-side">
        <Slider vertical label="EXPR" value={s.expr} onChange={(v) => setState({ expr: v })} display="WAH" />
        <Slider vertical label="FUZZ" value={s.macros.fuzz} accent="red"
          onChange={(v) => setState({ macros: { ...s.macros, fuzz: v } })} />
        <button className={`fb-btn ${fb ? 'on' : ''}`} onPointerDown={fbDown} onPointerUp={fbUp} onPointerCancel={fbUp}
          onContextMenu={(e) => e.preventDefault()}>
          SUSTAIN<br />FEEDBACK
        </button>
      </div>
    </div>
  );
}
