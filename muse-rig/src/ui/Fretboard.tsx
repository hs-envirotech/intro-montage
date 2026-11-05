import { useCallback, useRef, useState } from 'react';
import { engine } from '../audio/engine';
import { pack } from '../state/store';
import { capture } from './Pad';
import { TUNING, STRING_NAMES, inScale, noteName, snapFret, withAudio } from './theory';

export interface FretboardProps {
  fretStart: number;
  fretCount: number;
  easy: boolean;
  power: boolean;
  palmMute: boolean;
  autoVib: boolean;
  scheme: 'tap' | 'strum';
  /** Called with the MIDI note of every new attack (Performance mode uses it). */
  onNote?: (midi: number, ids: number[]) => void;
  /** Called whenever the set of sounding live voice ids changes. */
  onVoices?: (ids: number[]) => void;
}

interface Touch {
  pid: number;
  str: number;
  fret: number;
  ids: number[];
  offsets: number[];
  downX: number;
  downY: number;
  t0: number;
  sustained: boolean;
  bend: number;
  timers: number[];
  hammerFrom?: number; // pid of the touch this one hammered on from
  zone: 'fret' | 'strum';
  lastLane?: number;
  lastMoveT?: number;
}

const MARKERS = new Set([3, 5, 7, 9, 15, 17, 19, 21]);
const DOUBLE = new Set([12, 24]);
const LONG_PRESS = 280;
const SCALE = pack.scale;

export function Fretboard(p: FretboardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const touches = useRef(new Map<number, Touch>());
  const owner = useRef(new Map<number, number>()); // string → pid sounding it (tap scheme)
  const fretted = useRef<number[]>([0, 0, 0, 0, 0, 0]); // strum scheme
  const strumVoice = useRef<(number | undefined)[]>([]);
  const [active, setActive] = useState<Record<string, true>>({});
  const [plucked, setPlucked] = useState<number[]>([0, 0, 0, 0, 0, 0]);
  const props = useRef(p); props.current = p;

  const hasOpen = p.fretStart === 0;
  const firstFret = hasOpen ? 1 : p.fretStart;
  const frets = Array.from({ length: p.fretCount }, (_, i) => firstFret + i);
  const strumW = p.scheme === 'strum' ? 0.2 : 0;
  const openW = hasOpen ? 0.6 : 0;
  const units = openW + p.fretCount;

  const refresh = useCallback(() => {
    const a: Record<string, true> = {};
    touches.current.forEach((t) => { if (t.zone === 'fret' && t.str >= 0) a[`${t.str}:${t.fret}`] = true; });
    setActive(a);
    props.current.onVoices?.([...touches.current.values()].flatMap((t) => t.ids));
  }, []);

  const flash = (str: number) => setPlucked((pl) => { const n = [...pl]; n[str] = (n[str] + 1) % 1000; return n; });

  /** Pointer → { string, fret, zone }. Strings are drawn high e on top (tab view). */
  const locate = (x: number, y: number) => {
    const r = ref.current!.getBoundingClientRect();
    const fx = (x - r.left) / r.width;
    const row = Math.max(0, Math.min(5, Math.floor(((y - r.top) / r.height) * 6)));
    const str = 5 - row;
    const pp = props.current;
    if (strumW && fx > 1 - strumW) return { str, fret: 0, zone: 'strum' as const, laneH: r.height / 6, fretW: 0 };
    const boardW = 1 - strumW;
    const u = (Math.max(0, Math.min(0.9999, fx / boardW))) * units;
    let fret: number;
    if (pp.fretStart === 0) fret = u < openW ? 0 : Math.floor(u - openW) + 1;
    else fret = pp.fretStart + Math.floor(u);
    if (pp.easy) fret = snapFret(str, fret, SCALE.root, SCALE.intervals);
    return { str, fret, zone: 'fret' as const, laneH: r.height / 6, fretW: (r.width * boardW) / units };
  };

  const chordFor = (str: number, easy: boolean, power: boolean) => {
    // Easy Mode: the two lowest strings play one-touch power chords
    if (power || (easy && str <= 1)) return [0, 7, 12];
    return [0];
  };

  const pluckStrum = (str: number, vel: number) => {
    const pp = props.current;
    const midi = TUNING[str] + fretted.current[str];
    const id = engine.noteOn({ midi, vel, art: pp.palmMute ? 'mute' : 'pick', string: str, bus: 'lead' });
    strumVoice.current[str] = id;
    flash(str);
    pp.onNote?.(midi, [id]);
  };

  const onDown = (e: React.PointerEvent) => {
    e.preventDefault();
    capture(e, ref.current!);
    const loc = locate(e.clientX, e.clientY);
    const pp = props.current;
    const t: Touch = {
      pid: e.pointerId, str: loc.str, fret: loc.fret, ids: [], offsets: [0], downX: e.clientX, downY: e.clientY,
      t0: performance.now(), sustained: false, bend: 0, timers: [], zone: loc.zone, lastLane: loc.str, lastMoveT: performance.now(),
    };
    touches.current.set(e.pointerId, t);
    refresh();

    withAudio(() => {
      if (!touches.current.has(t.pid) && performance.now() - t.t0 > 300) return;
      if (t.zone === 'strum') { pluckStrum(t.str, 0.85); return; }
      if (pp.scheme === 'strum') {
        // fret-hand only: set the fret; if the string is ringing, slide it there
        fretted.current[t.str] = t.fret;
        const v = strumVoice.current[t.str];
        if (v !== undefined) engine.pitch(v, TUNING[t.str] + t.fret, 0.004, 0, 0.18);
        return;
      }
      const midi = TUNING[t.str] + t.fret;
      const o = owner.current.get(t.str);
      const ot = o !== undefined ? touches.current.get(o) : undefined;
      if (ot && ot !== t && ot.fret < t.fret && ot.offsets.length === 1 && t.offsets.length === 1 && !pp.power) {
        // HAMMER-ON: retune the ringing voice without re-picking
        t.ids = ot.ids; t.hammerFrom = ot.pid;
        engine.pitch(t.ids[0], midi + ot.bend, 0.003, 0, 0.22);
      } else {
        t.offsets = chordFor(t.str, pp.easy, pp.power);
        const vel = 0.84 + Math.random() * 0.12;
        t.ids = t.offsets.map((off, i) => engine.noteOn({
          midi: midi + off, vel: vel * (i ? 0.85 : 1), art: pp.palmMute ? 'mute' : 'pick',
          string: t.str + i * 10, bus: 'lead',
        }));
        flash(t.str);
      }
      owner.current.set(t.str, t.pid);
      pp.onNote?.(midi, t.ids);
      refresh();
      // long press → infinite sustain (+ assisted sustain in Easy Mode), then auto-vibrato
      t.timers.push(window.setTimeout(() => {
        if (!touches.current.has(t.pid) || pp.palmMute) return;
        t.sustained = true; t.ids.forEach((id) => engine.sustain(id, true));
      }, pp.easy ? LONG_PRESS * 0.6 : LONG_PRESS));
      if (pp.autoVib) t.timers.push(window.setTimeout(() => {
        if (touches.current.has(t.pid) && t.offsets.length === 1) engine.vibrato(t.ids[0], 0.22, 5.6);
      }, 650));
    });
  };

  const onMove = (e: React.PointerEvent) => {
    const t = touches.current.get(e.pointerId);
    if (!t || !engine.isReady) return;
    const pp = props.current;
    const loc = locate(e.clientX, e.clientY);

    if (t.zone === 'strum') {
      // strumming: every lane crossed plucks that string, velocity from swipe speed
      if (loc.zone === 'strum' && loc.str !== t.lastLane) {
        const now = performance.now();
        const dt = Math.max(4, now - (t.lastMoveT ?? now));
        const vel = Math.max(0.55, Math.min(1, 0.5 + 18 / dt));
        const step = loc.str > (t.lastLane ?? loc.str) ? 1 : -1;
        for (let s = (t.lastLane ?? loc.str) + step; step > 0 ? s <= loc.str : s >= loc.str; s += step) pluckStrum(s, vel);
        t.lastLane = loc.str; t.lastMoveT = now;
      }
      return;
    }

    // horizontal → slide (string stays locked to the one first touched)
    const r = ref.current!.getBoundingClientRect();
    const fx = (e.clientX - r.left) / r.width;
    const boardW = 1 - strumW;
    const u = Math.max(0, Math.min(0.9999, fx / boardW)) * units;
    let fret = pp.fretStart === 0 ? (u < openW ? 0 : Math.floor(u - openW) + 1) : pp.fretStart + Math.floor(u);
    if (pp.easy) fret = snapFret(t.str, fret, SCALE.root, SCALE.intervals);

    if (fret !== t.fret) {
      const dist = Math.abs(fret - t.fret);
      t.fret = fret;
      if (pp.scheme === 'strum') {
        fretted.current[t.str] = fret;
        const v = strumVoice.current[t.str];
        if (v !== undefined) engine.pitch(v, TUNING[t.str] + fret, 0.025 * dist);
      } else {
        t.ids.forEach((id, i) => engine.pitch(id, TUNING[t.str] + fret + t.offsets[i], Math.min(0.12, 0.028 * dist)));
      }
      refresh();
    }

    // vertical → bend (and finger-wiggle vibrato), single notes only
    if (pp.scheme === 'tap' && t.offsets.length === 1 && t.ids.length) {
      const dy = Math.abs(e.clientY - t.downY);
      const dead = 7;
      const semis = dy < dead ? 0 : Math.min(2, ((dy - dead) / (loc.laneH * 1.15)) * 2);
      if (Math.abs(semis - t.bend) > 0.015) {
        t.bend = semis;
        engine.bend(t.ids[0], semis, 0.012);
      }
    }
  };

  const onUp = (e: React.PointerEvent) => {
    const t = touches.current.get(e.pointerId);
    if (!t) return;
    touches.current.delete(e.pointerId);
    t.timers.forEach(clearTimeout);
    const pp = props.current;

    if (t.zone === 'fret' && pp.scheme === 'strum') {
      // lifting a fretting finger: back to the open string, and the ringing note stops
      fretted.current[t.str] = 0;
      const v = strumVoice.current[t.str];
      if (v !== undefined && ![...touches.current.values()].some((o) => o.zone === 'fret' && o.str === t.str)) {
        engine.noteOff(v, 0, 0.06); strumVoice.current[t.str] = undefined;
      }
    } else if (t.zone === 'fret' && t.ids.length) {
      const prev = t.hammerFrom !== undefined ? touches.current.get(t.hammerFrom) : undefined;
      if (prev) {
        // PULL-OFF back to the finger still holding the lower fret
        engine.pitch(t.ids[0], TUNING[t.str] + prev.fret + prev.bend, 0.003, 0, 0.3);
        owner.current.set(t.str, prev.pid);
      } else {
        // any finger that hammered on from this one now owns nothing
        touches.current.forEach((o) => { if (o.hammerFrom === t.pid) o.hammerFrom = undefined; });
        const stillShared = [...touches.current.values()].some((o) => o.ids === t.ids);
        if (!stillShared) {
          if (t.bend > 0.05) t.ids.forEach((id) => engine.bend(id, 0, 0.08)); // let the bend down
          // a quick tap rings on; a held (sustained) note stops when the finger lifts
          if (t.sustained) t.ids.forEach((id) => engine.noteOff(id, 0, 0.07));
        }
        if (owner.current.get(t.str) === t.pid) owner.current.delete(t.str);
      }
    }
    refresh();
  };

  const cells = [];
  for (let row = 0; row < 6; row++) {
    const str = 5 - row;
    const cols = hasOpen ? [0, ...frets] : frets;
    for (const f of cols) {
      const midi = TUNING[str] + f;
      const scaleOk = inScale(midi, SCALE.root, SCALE.intervals);
      const isRoot = ((midi - SCALE.root) % 12 + 12) % 12 === 0;
      const on = active[`${str}:${f}`];
      const left = f === 0 ? 0 : (openW + (f - firstFret)) / units;
      const width = (f === 0 ? openW : 1) / units;
      cells.push(
        <div
          key={`${str}:${f}`}
          className={`cell ${on ? 'on' : ''} ${p.easy && !scaleOk ? 'dim' : ''} ${p.easy && scaleOk ? 'scale' : ''} ${isRoot && p.easy ? 'root' : ''}`}
          style={{ left: `${left * 100}%`, width: `${width * 100}%`, top: `${(row / 6) * 100}%`, height: `${100 / 6}%` }}
        >
          {(on || (p.easy && scaleOk)) && <span>{noteName(midi)}</span>}
        </div>,
      );
    }
  }

  return (
    <div className={`fretboard-wrap ${p.scheme}`}>
      <div className="fret-numbers" style={{ width: `${(1 - strumW) * 100}%` }}>
        {hasOpen && <span style={{ left: 0, width: `${(openW / units) * 100}%` }}>0</span>}
        {frets.map((f) => (
          <span key={f} className={MARKERS.has(f) || DOUBLE.has(f) ? 'mk' : ''}
            style={{ left: `${((openW + f - firstFret) / units) * 100}%`, width: `${(1 / units) * 100}%` }}>{f}</span>
        ))}
      </div>
      <div
        className="fretboard"
        ref={ref}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        onContextMenu={(e) => e.preventDefault()}
      >
        <div className="board" style={{ width: `${(1 - strumW) * 100}%` }}>
          {hasOpen && <div className="nut" style={{ left: `${(openW / units) * 100}%` }} />}
          {frets.map((f) => (
            <div key={f} className="fret-wire" style={{ left: `${((openW + f - firstFret + 1) / units) * 100}%` }} />
          ))}
          {frets.filter((f) => MARKERS.has(f)).map((f) => (
            <div key={`m${f}`} className="marker" style={{ left: `${((openW + f - firstFret + 0.5) / units) * 100}%`, top: '50%' }} />
          ))}
          {frets.filter((f) => DOUBLE.has(f)).flatMap((f) => [
            <div key={`d${f}a`} className="marker" style={{ left: `${((openW + f - firstFret + 0.5) / units) * 100}%`, top: '33.3%' }} />,
            <div key={`d${f}b`} className="marker" style={{ left: `${((openW + f - firstFret + 0.5) / units) * 100}%`, top: '66.6%' }} />,
          ])}
          {cells}
        </div>
        {[0, 1, 2, 3, 4, 5].map((row) => {
          const str = 5 - row;
          return (
            <div key={`s${row}-${plucked[str]}`} className={`string s${str} ${plucked[str] ? 'pluck' : ''}`}
              style={{ top: `${((row + 0.5) / 6) * 100}%`, height: `${1 + (5 - row) * 0.45}px` }}>
              <span className="string-name">{STRING_NAMES[str]}</span>
            </div>
          );
        })}
        {strumW > 0 && (
          <div className="strum-zone" style={{ width: `${strumW * 100}%` }}>
            <span>STRUM</span>
          </div>
        )}
      </div>
    </div>
  );
}
