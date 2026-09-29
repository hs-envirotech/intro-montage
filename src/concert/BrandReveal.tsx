import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Img, continueRender, delayRender, useVideoConfig } from "remotion";
import { ASSETS } from "../config";
import { resolveFirst } from "../assets";
import { fonts } from "../theme";

// Timings, in seconds from the start of the brand shot.
const GATHER_START = 0.6; // first particles leave the ring
const GATHER_SPREAD = 2.4; // left-to-right stagger of arrivals
const LOGO_IN: [number, number] = [5.4, 7.2];
const LOGO_OUT: [number, number] = [10.8, 12.2];
const DISSOLVE_START = 11.0;
const N = 9000;
const LOGO_ASPECT = 1004 / 384;

const COLORS = ["191,239,244", "22,177,196", "20,176,150", "150,220,235"];

type P = {
  tx: number;
  ty: number;
  xn: number;
  a: number;
  r: number[];
  c: string;
  size: number;
};

// Small deterministic PRNG, so every render of a frame is identical.
const mulberry = (seed: number) => () => {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const ease = (x: number) => {
  const u = Math.min(Math.max(x, 0), 1);
  return u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2;
};
const ramp = (t: number, [a, b]: [number, number]) => Math.min(Math.max((t - a) / (b - a), 0), 1);

/** Samples the logo's opaque pixels as particle targets (canvas pixels). */
const sampleTargets = (img: HTMLImageElement | null, w: number, h: number): { x: number; y: number }[] => {
  const c = document.createElement("canvas");
  c.width = Math.round(w);
  c.height = Math.round(h);
  const ctx = c.getContext("2d")!;
  if (img) {
    ctx.drawImage(img, 0, 0, c.width, c.height);
  } else {
    ctx.fillStyle = "#fff";
    ctx.font = `800 ${h * 0.42}px ${fonts.heading}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("ENVIROTECH", w / 2, h / 2);
  }
  const data = ctx.getImageData(0, 0, c.width, c.height).data;
  const pts: { x: number; y: number }[] = [];
  const step = Math.max(1, Math.round(h / 220));
  for (let y = 0; y < c.height; y += step) {
    for (let x = 0; x < c.width; x += step) {
      if (data[(y * c.width + x) * 4 + 3] > 140) pts.push({ x, y });
    }
  }
  return pts;
};

/**
 * ENVIROTECH, built from water. Particles leave the network ring, stream
 * into the wordmark left to right, hold while the crisp logo settles in
 * beneath them, then release into a single flowing stream.
 */
export const BrandReveal: React.FC<{ t: number }> = ({ t }) => {
  const { width, height } = useVideoConfig();
  const canvas = useRef<HTMLCanvasElement>(null);
  const [parts, setParts] = useState<P[] | null>(null);
  const [handle] = useState(() => delayRender("Sampling logo for particles"));
  const src = resolveFirst(ASSETS.logoCandidates);

  const logoW = Math.min(width * 0.42, height * 0.8);
  const logoH = logoW / LOGO_ASPECT;
  const cx = width / 2;
  const cy = height / 2;
  const ox = cx - logoW / 2;
  const oy = cy - logoH / 2;

  useEffect(() => {
    let done = false;
    const build = (img: HTMLImageElement | null) => {
      if (done) return;
      done = true;
      const pts = sampleTargets(img, logoW, logoH);
      const rnd = mulberry(7);
      const out: P[] = [];
      for (let i = 0; i < N; i++) {
        const p = pts[Math.floor(rnd() * pts.length)] ?? { x: logoW / 2, y: logoH / 2 };
        out.push({
          tx: ox + p.x + (rnd() - 0.5) * 1.2,
          ty: oy + p.y + (rnd() - 0.5) * 1.2,
          xn: p.x / logoW,
          a: rnd() * Math.PI * 2,
          r: [rnd(), rnd(), rnd(), rnd(), rnd(), rnd()],
          c: COLORS[Math.floor(rnd() * COLORS.length)],
          size: (1.1 + rnd() * rnd() * 2.0) * (height / 1080),
        });
      }
      setParts(out);
      continueRender(handle);
    };
    if (!src) return build(null);
    const img = new Image();
    img.onload = () => build(img);
    img.onerror = () => build(null);
    img.src = src;
  }, [src, logoW, logoH, ox, oy, height, handle]);

  useLayoutEffect(() => {
    const cv = canvas.current;
    if (!cv || !parts) return;
    const ctx = cv.getContext("2d")!;
    ctx.clearRect(0, 0, width, height);
    ctx.globalCompositeOperation = "lighter";
    const R0 = height * 0.32;
    const u = height / 1080;
    const logoIn = ramp(t, LOGO_IN);
    const logoOut = ramp(t, LOGO_OUT);
    const holdDim = 1 - 0.35 * logoIn * (1 - logoOut);

    for (const p of parts) {
      const [r0, r1, r2, r3, r4, r5] = p.r;
      const ang = p.a + t * 0.05;
      const rr = R0 * (1 + (r1 - 0.5) * 0.05);
      const ringX = cx + Math.cos(ang) * rr;
      const ringY = cy + Math.sin(ang) * rr;

      const ts = GATHER_START + GATHER_SPREAD * p.xn + 0.7 * r2;
      const dur = 2.1 + 0.9 * r3;
      const g = ease((t - ts) / dur);
      // swirl inward: control point rotated from the ring position
      const vx = ringX - cx;
      const vy = ringY - cy;
      const rot = 0.9 + 0.5 * r4;
      const ctrlX = cx + (vx * Math.cos(rot) - vy * Math.sin(rot)) * 0.55 + (p.tx - cx) * 0.3;
      const ctrlY = cy + (vx * Math.sin(rot) + vy * Math.cos(rot)) * 0.55 + (p.ty - cy) * 0.3;
      let x = (1 - g) * (1 - g) * ringX + 2 * (1 - g) * g * ctrlX + g * g * p.tx;
      let y = (1 - g) * (1 - g) * ringY + 2 * (1 - g) * g * ctrlY + g * g * p.ty;
      // shimmer at rest
      x += Math.sin(t * 1.7 + r4 * 6.28) * 0.6 * u * g;
      y += Math.cos(t * 1.3 + r5 * 6.28) * 0.6 * u * g;

      // dissolve into a stream that flows off to the right
      const td = DISSOLVE_START + 1.6 * p.xn + 0.6 * r5;
      const d = Math.max(0, (t - td) / 2.6);
      let alpha = 1;
      if (d > 0) {
        const e = ease(d);
        const lx = x + d * d * width * 0.75 + d * 260 * u;
        const ly = cy + 0.12 * (lx - cx) + (r0 - 0.5) * 30 * u * (1 - e);
        const swirl = Math.sin(d * 5 + r1 * 6.28) * 40 * u * (1 - e) * e;
        x = x + (lx - x) * e;
        y = y + (ly - y) * e + swirl;
        alpha *= Math.max(0, 1 - d * 0.75);
      }
      // travelling light across the formed word
      const sweep = Math.exp(-Math.pow((p.xn - (t - 7.4) / 2.6) * 5, 2));
      alpha *= (0.55 + 0.45 * Math.min(1, g * 2)) * holdDim * (1 + 0.9 * sweep * g);
      // fade the ring in at the start of the shot
      alpha *= Math.min(1, Math.max(0, (t + 1.6) / 1.8));
      if (alpha <= 0.01) continue;
      ctx.fillStyle = `rgba(${p.c},${Math.min(alpha, 1)})`;
      const s = p.size * (1 + 0.8 * (1 - g) * r0);
      if (s < 1.4) ctx.fillRect(x - s / 2, y - s / 2, s, s);
      else {
        ctx.beginPath();
        ctx.arc(x, y, s / 2, 0, Math.PI * 2);
        ctx.fill();
      }
      if (r3 > 0.85) {
        // a few soft halos give the particles a wet, luminous quality
        ctx.fillStyle = `rgba(${p.c},${Math.min(alpha, 1) * 0.12})`;
        ctx.beginPath();
        ctx.arc(x, y, s * 2.6, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  });

  const logoOpacity = ramp(t, LOGO_IN) * (1 - ramp(t, LOGO_OUT)) * 0.88;
  return (
    <>
      {src && logoOpacity > 0 && (
        <Img
          src={src}
          style={{
            position: "absolute",
            left: ox,
            top: oy,
            width: logoW,
            height: logoH,
            opacity: logoOpacity,
            filter: `blur(${(1 - ramp(t, LOGO_IN)) * 6}px)`,
          }}
        />
      )}
      <canvas ref={canvas} width={width} height={height} style={{ position: "absolute", inset: 0 }} />
    </>
  );
};
