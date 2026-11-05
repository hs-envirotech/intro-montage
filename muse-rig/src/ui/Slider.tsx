import { useRef } from 'react';

interface Props {
  label: string;
  value: number; // 0..1
  onChange: (v: number) => void;
  vertical?: boolean;
  display?: string;
  accent?: 'red' | 'cyan';
  className?: string;
}

/** Large, finger-friendly slider (pointer-captured, works with multitouch). */
export function Slider({ label, value, onChange, vertical, display, accent = 'cyan', className = '' }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const update = (e: React.PointerEvent) => {
    const r = ref.current!.getBoundingClientRect();
    const v = vertical ? 1 - (e.clientY - r.top) / r.height : (e.clientX - r.left) / r.width;
    onChange(Math.max(0, Math.min(1, v)));
  };
  const pct = `${Math.round(value * 100)}%`;
  return (
    <div className={`slider ${vertical ? 'vertical' : ''} ${accent} ${className}`}>
      <div className="slider-head">
        <span className="slider-label">{label}</span>
        <span className="slider-value">{display ?? Math.round(value * 100)}</span>
      </div>
      <div
        ref={ref}
        className="slider-track"
        role="slider"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(value * 100)}
        tabIndex={0}
        onKeyDown={(e) => {
          const step = e.shiftKey ? 0.1 : 0.02;
          if (e.key === 'ArrowRight' || e.key === 'ArrowUp') onChange(Math.min(1, value + step));
          if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') onChange(Math.max(0, value - step));
        }}
        onPointerDown={(e) => { try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* gone */ } update(e); }}
        onPointerMove={(e) => { if (e.currentTarget.hasPointerCapture(e.pointerId)) update(e); }}
      >
        <div className="slider-fill" style={vertical ? { height: pct } : { width: pct }} />
        <div className="slider-thumb" style={vertical ? { bottom: pct } : { left: pct }} />
      </div>
    </div>
  );
}
