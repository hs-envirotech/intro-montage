// Shared GLSL: uniforms, brand palette (linear), noise, camera and the
// film finish (tone map, vignette, grain) every shot ends with.

export const HEAD = /* glsl */ `#version 300 es
precision highp float;
uniform vec2 uRes;
uniform float uT;       // shot-local seconds (negative while fading in)
uniform float uP;       // shot progress 0..1
uniform float uGT;      // global loop seconds
uniform float uBeat;    // 1 on every beat, decays (scaled by energy)
uniform float uBar;     // 1 on every downbeat, decays (scaled by energy)
uniform float uEnergy;  // 0..1 musical intensity of this moment
uniform float uFlash;   // additive white-aqua flash
uniform float uExposure;
uniform vec3 uCamPos;
uniform vec3 uCamTgt;
uniform float uCamRoll;
uniform float uFocal;
out vec4 fragColor;

#define PI 3.14159265359
#define TAU 6.28318530718
#define SAT(x) clamp(x, 0., 1.)

// Envirotech palette, converted to linear light
#define NAVY  vec3(0.00099, 0.01188, 0.03703)
#define BLUE  vec3(0.01113, 0.08241, 0.25903)
#define SLATE vec3(0.06575, 0.10616, 0.14497)
#define SEA   vec3(0.00370, 0.44232, 0.31118)
#define AQUA  vec3(0.00456, 0.44787, 0.56050)
#define ICE   vec3(0.55, 0.85, 0.95)

float h11(float p){ p = fract(p * .1031); p *= p + 33.33; p *= p + p; return fract(p); }
float h21(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
vec2 h22(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * vec3(.1031, .1030, .0973)); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.xx + p3.yz) * p3.zy); }
float h31(vec3 p3){ p3 = fract(p3 * .1031); p3 += dot(p3, p3.zyx + 31.32); return fract((p3.x + p3.y) * p3.z); }
vec3 h33(vec3 p3){ p3 = fract(p3 * vec3(.1031, .1030, .0973)); p3 += dot(p3, p3.yxz + 33.33); return fract((p3.xxy + p3.yxx) * p3.zyx); }

float vnoise(vec3 x){
  vec3 i = floor(x), f = fract(x); f = f * f * (3. - 2. * f);
  return mix(mix(mix(h31(i), h31(i + vec3(1,0,0)), f.x), mix(h31(i + vec3(0,1,0)), h31(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(h31(i + vec3(0,0,1)), h31(i + vec3(1,0,1)), f.x), mix(h31(i + vec3(0,1,1)), h31(i + vec3(1,1,1)), f.x), f.y), f.z);
}
float vnoise2(vec2 x){
  vec2 i = floor(x), f = fract(x); f = f * f * (3. - 2. * f);
  return mix(mix(h21(i), h21(i + vec2(1,0)), f.x), mix(h21(i + vec2(0,1)), h21(i + vec2(1,1)), f.x), f.y);
}
float fbm2(vec2 p){ float a = .5, s = 0.; for (int i = 0; i < 4; i++){ s += a * vnoise2(p); p = p * 2.03 + vec2(1.7, 9.2); a *= .5; } return s; }
float fbm3(vec3 p){ float a = .5, s = 0.; for (int i = 0; i < 3; i++){ s += a * vnoise(p); p = p * 2.03 + vec3(1.7, 9.2, 3.1); a *= .5; } return s; }
mat2 rot(float a){ float c = cos(a), s = sin(a); return mat2(c, -s, s, c); }

// Light caustics as seen through a rippling water surface (0..1).
float caustic(vec2 p, float time){
  p = mod(p, TAU) - 250.;
  vec2 i = p;
  float c = 1., inten = .005;
  for (int n = 0; n < 4; n++){
    float t = time * (1. - 3.5 / float(n + 1));
    i = p + vec2(cos(t - i.x) + sin(t + i.y), sin(t - i.y) + cos(t + i.x));
    c += 1. / length(vec2(p.x / (sin(i.x + t) / inten), p.y / (cos(i.y + t) / inten)));
  }
  c /= 4.;
  c = 1.17 - pow(c, 1.4);
  return SAT(pow(abs(c), 8.));
}

vec2 screenUV(){ return (gl_FragCoord.xy - .5 * uRes) / uRes.y; }

vec3 camRay(vec2 uv){
  vec3 f = normalize(uCamTgt - uCamPos);
  vec3 up = vec3(sin(uCamRoll), cos(uCamRoll), 0.);
  vec3 r = normalize(cross(up, f));
  vec3 u = cross(f, r);
  return normalize(uv.x * r + uv.y * u + uFocal * f);
}

float sdBox(vec3 p, vec3 b){ vec3 q = abs(p) - b; return length(max(q, 0.)) + min(max(q.x, max(q.y, q.z)), 0.); }

// Soft, lens-like glow for a point at distance d (world units) with radius r.
float bokeh(float d, float r){ return (1. - smoothstep(r * .55, r, d)) + .18 * exp(-d * d / (r * r * 5.)); }

vec3 finish(vec3 col){
  col *= uExposure;
  col += vec3(.45, .85, 1.) * uFlash;
  col = max(col, 0.);
  col = (col * (2.51 * col + .03)) / (col * (2.43 * col + .59) + .14); // ACES fit
  col = pow(SAT(col), vec3(1. / 2.2));
  vec2 q = (gl_FragCoord.xy - .5 * uRes) / uRes.y;
  col *= mix(1., smoothstep(1.25, .25, length(q * vec2(.85, 1.))), .55);
  float g = h21(gl_FragCoord.xy + fract(uGT * 7.13) * vec2(311.7, 183.3)) - .5;
  col += g * .045 * (1. - .6 * dot(col, vec3(.33)));
  return col;
}
`;
