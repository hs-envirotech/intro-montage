import { HEAD } from "./common";

// ION EXCHANGE / DEMINERALISATION — a microscopic landscape of glassy resin
// beads. Charged ions stream through the gaps; more and more of them lock
// onto bead surfaces as glowing sites.
export const ION_EXCHANGE = /* glsl */ `${HEAD}
uniform float uAttach;  // 0..1 share of surface sites holding an ion
const float C = 1.25;

vec3 pathIX(float z){ return vec3(1.3 * sin(z * .11), .8 * sin(z * .07 + 1.), z); }

float mapIX(vec3 p, out vec3 cid){
  vec3 id = floor(p / C);
  cid = id;
  vec3 q0 = p - (id + .5) * C;
  vec3 cc = (id + .5) * C;
  vec3 bd = C * .5 - abs(q0);
  float bound = min(bd.x, min(bd.y, bd.z)) + .04;
  if (length(cc.xy - pathIX(cc.z).xy) < 1.2) return bound;
  vec3 h = h33(id);
  vec3 q = q0 - (h - .5) * .2;
  float r = .3 + .17 * h.x;
  return min(length(q) - r, bound);
}

void main(){
  vec2 uv = screenUV();
  vec3 ro = uCamPos, rd = camRay(uv);
  float t = .02;
  vec3 cid;
  bool hit = false;
  for (int i = 0; i < 90; i++){
    float d = mapIX(ro + rd * t, cid);
    if (d < .001 * t) { hit = true; break; }
    t += d;
    if (t > 22.) break;
  }
  vec3 fogCol = mix(NAVY, SEA * .04, .5);
  vec3 col = fogCol;
  if (hit) {
    vec3 p = ro + rd * t;
    vec3 h = h33(cid);
    vec3 cc = (cid + .5) * C + (h - .5) * .2;
    vec3 n = normalize(p - cc);
    float fres = pow(1. - SAT(dot(-rd, n)), 3.);
    // headlamp that travels with the camera
    vec3 Lp = ro + vec3(0., .6, 1.5);
    vec3 Ld = normalize(Lp - p);
    float dif = SAT(dot(n, Ld));
    float spec = pow(SAT(dot(reflect(rd, n), Ld)), 50.);
    // translucent resin: darker core, glowing limb
    float core = pow(SAT(dot(-rd, n)), 2.);
    vec3 resin = mix(SEA * .05, BLUE * .05, h.y) * (.4 + core) + mix(SEA, AQUA, h.z) * fres * .55;
    resin += ICE * spec * .7 + SLATE * .05 * dif;
    // ion sites on the surface
    vec3 sp = n * 12.;
    vec3 sc = floor(sp);
    float sh = h31(sc + cid * 7.);
    float site = smoothstep(.3, .08, length(fract(sp) - .5));
    float on = step(sh, uAttach * .35);
    float blink = .6 + .4 * sin(uGT * 3. + sh * 40.);
    resin += mix(AQUA, ICE, .4) * site * on * blink * (1.2 + 2. * uBeat) * .8;
    col = mix(resin, fogCol, 1. - exp(-t * .13));
  }
  // free ions streaming through the gaps
  for (int i = 0; i < 18; i++){
    float fi = float(i);
    float D = .5 + fi * .6;
    if (D > t) break;
    vec2 P = uv * D;
    vec2 Q = P * 5. + vec2(fi * 13.1 + sin(uGT * .3 + fi) * .5, fi * 7.7 + uGT * .15);
    vec2 c = floor(Q), f = fract(Q) - .5;
    float hh = h21(c + fi);
    if (hh > .16) continue;
    f -= (h22(c + fi * 3.) - .5) * .5;
    float streak = length(f);
    float r = .03 + .03 * h21(c + 1.);
    vec3 ic = hh < .1 ? AQUA : SEA;
    col += ic * bokeh(streak, r) * .35 * exp(-D * .2) * (1. - .6 * uAttach);
  }
  col += AQUA * .05 * exp(-length(uv) * 2.) * (1. + uBar);
  fragColor = vec4(finish(col), 1.);
}
`;
