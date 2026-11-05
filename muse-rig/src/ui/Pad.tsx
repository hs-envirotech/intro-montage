import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import type { PadDef } from '../packs/types';
import { engine } from '../audio/engine';
import { transport } from '../audio/transport';
import { getState } from '../state/store';
import { withAudio } from './theory';

const PAD_CHOKE = 900;

export function capture(e: React.PointerEvent, el: Element = e.currentTarget) {
  try { el.setPointerCapture(e.pointerId); } catch { /* pointer already gone */ }
}

/** One performance pad. Pattern pads launch/stop riffs; hold pads sound while pressed. */
export function Pad({ pad, index, compact }: { pad: PadDef; index: number; compact?: boolean }) {
  const [pressed, setPressed] = useState(false);
  const playing = useSyncExternalStore(transport.subscribe, () => transport.isPlaying(pad.id));
  const ring = useRef<HTMLDivElement>(null);
  const hold = useRef<{ ids: number[]; t0: number; timers: number[]; up: boolean } | null>(null);

  // progress bar for running patterns
  useEffect(() => {
    if (!playing) { if (ring.current) ring.current.style.transform = 'scaleX(0)'; return; }
    let raf = 0;
    const loop = () => {
      if (ring.current) ring.current.style.transform = `scaleX(${transport.progress(pad.id)})`;
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [playing, pad.id]);

  const down = (e: React.PointerEvent) => {
    capture(e);
    setPressed(true);
    if (navigator.vibrate) try { navigator.vibrate(8); } catch { /* not allowed */ }
    if (pad.kind === 'pattern' && pad.pattern) {
      const pat = pad.pattern;
      withAudio(() => {
        if (transport.isPlaying(pad.id)) transport.stop(pad.id);
        else transport.start(pad.id, pat, getState().loop, 'rhythm');
      });
      return;
    }
    const h = pad.hold!;
    const state = { ids: [] as number[], t0: performance.now(), timers: [] as number[], up: false };
    hold.current = state;
    withAudio(() => {
      if (state.up && performance.now() - state.t0 > 400) return; // released long before audio woke up
      state.ids = h.notes.map((midi, i) =>
        engine.noteOn({ midi, vel: h.vel * (i ? 0.85 : 1), art: h.art, bus: h.engine, string: PAD_CHOKE + index * 8 + i }));
      if (h.sustainAfterMs !== undefined) {
        state.timers.push(window.setTimeout(() => state.ids.forEach((id) => engine.sustain(id, true)), h.sustainAfterMs));
      }
      if (h.vibrato) {
        const v = h.vibrato;
        state.timers.push(window.setTimeout(() => state.ids.forEach((id) => engine.vibrato(id, v.depth, v.rate)), v.afterMs));
      }
      if (h.bend) {
        const b = h.bend;
        state.timers.push(window.setTimeout(() => state.ids.forEach((id) => engine.bend(id, b.semis, b.glide)), b.afterMs));
      }
      if (state.up) release(state);
    });
  };

  const release = (s: NonNullable<typeof hold.current>) => {
    const h = pad.hold!;
    s.timers.forEach(clearTimeout);
    const held = performance.now() - s.t0;
    // tap on a sustain-capable pad = let it ring naturally; long hold = stop on release
    const letRing = h.sustainAfterMs !== undefined && held < h.sustainAfterMs && h.art !== 'feedback';
    if (!letRing) s.ids.forEach((id) => engine.noteOff(id, 0, h.release));
  };

  const up = () => {
    setPressed(false);
    const s = hold.current;
    if (!s) return;
    s.up = true;
    if (s.ids.length) release(s);
    hold.current = null;
  };

  return (
    <button
      className={`pad ${pad.accent} ${pressed ? 'pressed' : ''} ${playing ? 'playing' : ''} ${compact ? 'compact' : ''}`}
      onPointerDown={down}
      onPointerUp={up}
      onPointerCancel={up}
      onContextMenu={(e) => e.preventDefault()}
      aria-pressed={playing || pressed}
    >
      <span className="pad-num">{String(index + 1).padStart(2, '0')}</span>
      <span className="pad-label">{compact ? pad.label.replace(' CHORD', '') : pad.label}</span>
      {!compact && <span className="pad-sub">{pad.sub}</span>}
      <span className="pad-kind">{pad.kind === 'pattern' ? (playing ? '■ STOP' : '▶ RIFF') : 'HOLD'}</span>
      <div className="pad-progress" ref={ring} />
    </button>
  );
}
