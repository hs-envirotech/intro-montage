import { pack, setState, useStore } from '../state/store';
import { transport, type Quantise } from '../audio/transport';
import { Pad } from './Pad';
import { Slider } from './Slider';
import { withAudio } from './theory';

const QUANTS: Quantise[] = ['off', '16th', 'beat', 'bar'];

export function RiffMode() {
  const s = useStore((x) => x);
  return (
    <div className="riff-mode">
      <div className="pad-grid">
        {pack.pads.map((p, i) => <Pad key={p.id} pad={p} index={i} />)}
      </div>
      <div className="riff-controls">
        <div className="ctl-group bpm">
          <button className="btn sq" onClick={() => setState({ bpm: s.bpm - 2 })} aria-label="Slower">−</button>
          <div className="bpm-read"><b>{s.bpm}</b><small>BPM</small></div>
          <button className="btn sq" onClick={() => setState({ bpm: s.bpm + 2 })} aria-label="Faster">+</button>
        </div>
        <button className={`btn toggle ${s.loop ? 'on' : ''}`} onClick={() => setState({ loop: !s.loop })}>LOOP</button>
        <button className={`btn toggle ${s.metronome ? 'on' : ''}`}
          onClick={() => withAudio(() => setState({ metronome: !s.metronome }))}>CLICK</button>
        <button className="btn toggle"
          onClick={() => setState({ quantise: QUANTS[(QUANTS.indexOf(s.quantise) + 1) % QUANTS.length] })}>
          Q: {s.quantise.toUpperCase()}
        </button>
        <button className="btn danger" onClick={() => transport.stopAll()}>STOP ALL</button>
        <Slider className="fx-slider" label="FX" value={s.fxIntensity / 2} display={`${Math.round(s.fxIntensity * 100)}%`}
          onChange={(v) => setState({ fxIntensity: v * 2 })} />
      </div>
    </div>
  );
}
