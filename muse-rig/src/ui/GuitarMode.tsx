import { pack, setState, useStore } from '../state/store';
import { engine } from '../audio/engine';
import { Fretboard } from './Fretboard';

const POS = [0, 3, 5, 7, 9, 12];

export function GuitarMode() {
  const s = useStore((x) => x);
  const count = 12;
  return (
    <div className="guitar-mode">
      <div className="toolbar">
        <div className="seg">
          <button className={s.scheme === 'tap' ? 'on' : ''} onClick={() => setState({ scheme: 'tap' })}>TAP</button>
          <button className={s.scheme === 'strum' ? 'on' : ''} onClick={() => setState({ scheme: 'strum' })}>STRUM</button>
        </div>
        <div className="seg">
          <button className={!s.easy ? 'on' : ''} onClick={() => setState({ easy: false })}>NORMAL</button>
          <button className={s.easy ? 'on' : ''} onClick={() => setState({ easy: true })}>EASY</button>
        </div>
        <button className={`btn toggle ${s.power ? 'on' : ''}`} onClick={() => setState({ power: !s.power })}>POWER</button>
        <button className={`btn toggle ${s.palmMute ? 'on' : ''}`}
          onPointerDown={() => setState({ palmMute: !s.palmMute })}>MUTE</button>
        <button className={`btn toggle ${s.autoVib ? 'on' : ''}`} onClick={() => setState({ autoVib: !s.autoVib })}>VIB</button>
        <div className="seg pos">
          <button onClick={() => setState({ fretStart: POS[Math.max(0, POS.indexOf(s.fretStart) - 1)] ?? 0 })} aria-label="Lower position">◀</button>
          <span>{s.fretStart === 0 ? '0–12' : `${s.fretStart}–${s.fretStart + count - 1}`}</span>
          <button onClick={() => setState({ fretStart: POS[Math.min(POS.length - 1, POS.indexOf(s.fretStart) + 1)] ?? 0 })} aria-label="Higher position">▶</button>
        </div>
        <button className="btn danger" onClick={() => engine.allOff(0.05, 'lead')}>STOP</button>
      </div>
      <Fretboard fretStart={s.fretStart} fretCount={count} easy={s.easy} power={s.power}
        palmMute={s.palmMute} autoVib={s.autoVib} scheme={s.scheme} />
      <div className="hint">
        {s.scheme === 'tap'
          ? 'Tap = pick · hold = sustain · drag sideways = slide · drag up/down = bend · wiggle = vibrato · 2nd finger higher on same string = hammer-on'
          : 'Left hand: hold frets · right zone: tap or swipe across strings to strum'}
        {s.easy ? ` · EASY: ${pack.scale.name}, low E/A strings play power chords` : ''}
      </div>
    </div>
  );
}
