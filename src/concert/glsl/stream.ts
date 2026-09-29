import { HEAD } from "./common";

// POLISHING / RETURN — near-total darkness and one clean, luminous flow of
// water. Polishing strips away particles and turbulence until only water and
// light remain. In return mode the camera dives into the stream and it
// dissolves back into microscopic darkness.
export const STREAM = /* glsl */ `${HEAD}
uniform float uMode;      // 0 polishing, 1 return
uniform float uTurb;      // turbulence 1 … 0
uniform float uDust;      // particle density 1 … 0
uniform float uZoom;      // camera push into the water
uniform float uGlow;      // overall brightness of the water

float streamY(float x, float turb){
  return .12 * sin(x * 1.1 + uGT * .25) + .05 * sin(x * 2.7 - uGT * .4) * turb;
}

void main(){
  vec2 uv = screenUV();
  vec2 p = uv / uZoom;
  p = rot(-.12) * p;
  vec3 col = vec3(0.);

  // faint chamber: UV-lamp tubes standing in the dark
  if (uMode < .5) {
    for (int i = -3; i <= 3; i++){
      float x = float(i) * .52 + .26;
      float dx = abs(uv.x * 1.05 - x);
      col += BLUE * .06 * exp(-dx * 90.) * smoothstep(.55, .1, abs(uv.y));
      col += AQUA * .008 * exp(-dx * 12.);
    }
  }

  float y0 = streamY(p.x, uTurb);
  float w = .085 + .025 * sin(p.x * .8 + uGT * .2);
  float dy = (p.y - y0) / w;
  float body = exp(-dy * dy * 1.1) * (.75 + .25 * fbm2(vec2(p.x * 2. - uGT * .5, dy)));
  // refraction and caustics inside the water
  vec2 q = vec2(p.x * 3. - uGT * .9, dy * 1.5);
  float warp = fbm2(q * 1.2 + fbm2(q * 2. + uGT * .1) * uTurb * 1.5);
  float caus = pow(1. - abs(sin((warp * 6. + q.x * .4) * PI)), 12.);
  float edge = exp(-pow(abs(dy) - 1., 2.) * 9.);
  vec3 water = mix(BLUE * .25, AQUA * .5, .5 + .5 * warp) * body * .5;
  water += mix(AQUA, ICE, .6) * caus * body * .6;
  water += mix(AQUA, ICE, .4) * edge * .12 * (1. + .8 * uBeat);
  // halo in the surrounding darkness
  water += AQUA * .05 * exp(-abs(dy) * .5) + BLUE * .05 * exp(-abs(dy) * .15);
  col += water * uGlow;

  // tiny luminous particles travelling with the flow
  for (int i = 0; i < 10; i++){
    float fi = float(i);
    float sc = 6. + fi * 3.;
    vec2 Q = vec2(p.x * sc - uGT * (1.5 + fi * .3), (p.y - y0) * sc + fi * 3.3);
    vec2 c = floor(Q), f = fract(Q) - .5;
    float h = h21(c + fi * 17.);
    if (h > .12 * uDust) continue;
    float r = .06 + .05 * h21(c + 5.);
    float near = exp(-abs(p.y - y0) * 9.);
    col += mix(AQUA, ICE, .7) * bokeh(length(f), r) * .5 * near * uGlow / (1. + fi * .3);
  }
  fragColor = vec4(finish(col), 1.);
}
`;
