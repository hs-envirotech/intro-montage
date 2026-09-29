import React, { useLayoutEffect, useRef } from "react";
import { useVideoConfig } from "remotion";

export type Uniforms = Record<string, number | readonly number[]>;

const VERT = `#version 300 es
in vec2 p;
void main(){ gl_Position = vec4(p, 0.0, 1.0); }`;

type GLState = {
  gl: WebGL2RenderingContext;
  prog: WebGLProgram;
  locs: Map<string, WebGLUniformLocation | null>;
};

const compile = (gl: WebGL2RenderingContext, type: number, src: string) => {
  const s = gl.createShader(type)!;
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(s);
    throw new Error(`Shader compile error:\n${log}\n${src.split("\n").map((l, i) => `${i + 1}: ${l}`).join("\n")}`);
  }
  return s;
};

/**
 * Full-frame WebGL2 fragment-shader layer. Every frame is a pure function of
 * the uniforms passed in, so Remotion can render frames in any order.
 * `scale` renders at a fraction of the output resolution (upscaled by CSS).
 */
export const ShaderCanvas: React.FC<{
  frag: string;
  uniforms: Uniforms;
  scale?: number;
  style?: React.CSSProperties;
}> = ({ frag, uniforms, scale = 1, style }) => {
  const ref = useRef<HTMLCanvasElement>(null);
  const state = useRef<GLState | null>(null);
  const { width, height } = useVideoConfig();
  const w = Math.round(width * scale);
  const h = Math.round(height * scale);

  useLayoutEffect(() => {
    const canvas = ref.current!;
    const gl = canvas.getContext("webgl2", { preserveDrawingBuffer: true, antialias: false, premultipliedAlpha: false })!;
    if (!gl) throw new Error("WebGL2 unavailable");
    const prog = gl.createProgram()!;
    gl.attachShader(prog, compile(gl, gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, compile(gl, gl.FRAGMENT_SHADER, frag));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog) ?? "link error");
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, "p");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    state.current = { gl, prog, locs: new Map() };
    return () => {
      gl.getExtension("WEBGL_lose_context")?.loseContext();
      state.current = null;
    };
  }, [frag]);

  useLayoutEffect(() => {
    const st = state.current;
    if (!st) return;
    const { gl, prog, locs } = st;
    gl.viewport(0, 0, w, h);
    gl.useProgram(prog);
    const all: Uniforms = { uRes: [w, h], ...uniforms };
    for (const [k, v] of Object.entries(all)) {
      if (!locs.has(k)) locs.set(k, gl.getUniformLocation(prog, k));
      const l = locs.get(k);
      if (!l) continue;
      if (typeof v === "number") gl.uniform1f(l, v);
      else if (v.length === 2) gl.uniform2f(l, v[0], v[1]);
      else if (v.length === 3) gl.uniform3f(l, v[0], v[1], v[2]);
      else if (v.length === 4) gl.uniform4f(l, v[0], v[1], v[2], v[3]);
    }
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  });

  return (
    <canvas
      ref={ref}
      width={w}
      height={h}
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", ...style }}
    />
  );
};
