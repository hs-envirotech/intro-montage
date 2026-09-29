import { HEAD } from "./common";

// THE NETWORK — one plant becomes many. Treatment sites light up across a
// dark landscape, joined by pipelines and rivers, then draw together into a
// single circular network: resilient infrastructure.
export const NETWORK = /* glsl */ `${HEAD}
uniform float uRing;   // 0 scattered … 1 arranged on the ring
uniform float uGrow;   // 0..1 how much of the network is lit
const int N = 14;
const float RR = 55.;

vec2 nodePos(int i){
  float fi = float(i);
  vec2 s = (h22(vec2(fi, 3.1)) - .5) * vec2(190., 150.);
  float a = fi / float(N) * TAU + .3;
  vec2 r = vec2(cos(a), sin(a)) * RR;
  return mix(s, r, uRing);
}

float segD(vec2 p, vec2 a, vec2 b, out float u){
  vec2 pa = p - a, ba = b - a;
  u = SAT(dot(pa, ba) / dot(ba, ba));
  return length(pa - ba * u);
}

void main(){
  vec2 uv = screenUV();
  vec3 ro = uCamPos, rd = camRay(uv);
  vec3 col = NAVY * .08;
  if (rd.y < 0.) {
    float t = -ro.y / rd.y;
    vec2 g = (ro + rd * t).xz;
    float px = t / (uRes.y * uFocal);           // world size of a pixel
    // terrain relief, lit softly
    float e = 1.5;
    float h0 = fbm2(g * .012), hx = fbm2((g + vec2(e, 0.)) * .012), hz = fbm2((g + vec2(0., e)) * .012);
    vec3 n = normalize(vec3((h0 - hx) * 40., 1., (h0 - hz) * 40.));
    float lit = SAT(dot(n, normalize(vec3(-.5, .6, .3))));
    col = mix(NAVY * .12, SLATE * .05, lit) * (.5 + h0);
    // rivers
    float rv = abs(fbm2(g * .008 + 4.) - .5);
    col += SEA * .25 * exp(-rv / max(.004, px * .006)) * .3;
    // faint infrastructure grid
    vec2 gg = abs(fract(g / 30.) - .5) * 30.;
    col += SLATE * .04 * exp(-min(gg.x, gg.y) / max(.3, px));

    float glow = 0.;
    vec3 add = vec3(0.);
    for (int i = 0; i < N; i++){
      vec2 a = nodePos(i);
      float appear = SAT(uGrow * 1.6 - float(i) / float(N) * .9);
      if (appear <= 0.) continue;
      // ring link and a chord to a node further round
      for (int k = 0; k < 2; k++){
        int j = k == 0 ? (i + 1) % N : (i + 5) % N;
        vec2 b = nodePos(j);
        float u;
        float d = segD(g, a, b, u);
        float w = max(.35, px * 1.2);
        float chordFade = k == 0 ? 1. : 1. - .7 * uRing;
        float len = length(b - a);
        float pulse = exp(-abs(fract(u * len / 30. - uGT * .9 + float(i) * .37) - .5) * 12.);
        float line = exp(-d * d / (w * w)) + .25 * exp(-d / (w * 8.));
        vec3 lc = k == 0 ? AQUA : mix(SEA, AQUA, .4);
        add += lc * line * (.25 + 1.2 * pulse * (.5 + uBeat)) * appear * chordFade;
      }
      // treatment site: bright core, halo, a ring of structures
      float dn = length(g - a);
      float site = exp(-dn * dn / max(1., px * px * 4.)) * 2.;
      site += exp(-dn / 9.) * .35;
      site += exp(-abs(dn - 5.) / max(.25, px)) * .5;
      add += mix(ICE, AQUA, .4) * site * appear * (1. + uBar);
    }
    // central hub once the ring has closed
    float dc = length(g);
    add += AQUA * exp(-abs(dc - RR) / max(1.2, px * 1.5)) * .15 * uRing;
    col += add * exp(-t * .0015);
  }
  col += BLUE * .03 * exp(-abs(rd.y) * 8.);
  fragColor = vec4(finish(col), 1.);
}
`;
