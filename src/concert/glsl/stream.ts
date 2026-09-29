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

  float y0 = streamY(p.x, uTurb);
  float w = .085 + .025 * sin(p.x * .8 + uGT * .2);
  float dy = (p.y - y0) / w;
  float body = exp(-pow(abs(dy), 3.) * .8);           // flat-topped: a sheet of water, not a tube
  vec2 q = vec2(p.x * 3. - uGT * .9, dy * 1.5);
  float warp = fbm2(q * 1.2 + fbm2(q * 2. + uGT * .1) * uTurb * 1.5);
  // the water bends whatever is behind it
  vec2 bent = uv + body * (warp - .5) * .06 * vec2(1., .4);

  // faint chamber: UV-lamp tubes standing in the dark, refracted through the water
  if (uMode < .5) {
    for (int i = -3; i <= 3; i++){
      float x = float(i) * .52 + .26;
      float dx = abs(bent.x * 1.05 - x);
      col += BLUE * .06 * exp(-dx * 90.) * smoothstep(.55, .1, abs(bent.y)) * (1. + 2.5 * body);
      col += AQUA * .008 * exp(-dx * 12.);
    }
  }

  float caus = caustic(vec2(p.x * 9. - uGT * 1.4, dy * 2.2 + warp * 1.5), uGT * .6);
  float top = exp(-pow(dy + .95, 2.) * 14.);          // light catching the upper surface
  vec3 water = BLUE * .05 * body;                      // almost clear
  water += mix(AQUA, ICE, .65) * caus * body * .55;
  water += mix(AQUA, ICE, .7) * top * (.12 + .5 * warp * warp) * (1. + .8 * uBeat);
  water += AQUA * .025 * exp(-abs(dy) * .5) + BLUE * .04 * exp(-abs(dy) * .15);
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
