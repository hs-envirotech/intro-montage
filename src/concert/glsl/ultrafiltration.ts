import { HEAD } from "./common";

// ULTRAFILTRATION — three shots.
// UF_FIELD: flying through an endless forest of hollow-fibre membranes.
// UF_FIBRE: inside a single fibre, water escaping through the porous wall.
// UF_ARRAY: pulling back to reveal module trains while pressure builds.

const FIELD_COMMON = /* glsl */ `
const vec2 S = vec2(.62);
float pathX(float z){ return .31 + sin(z * .11) * 1.24; }

float fibre(vec3 p, out vec2 id){
  id = floor(p.xz / S);
  vec2 cc = (id + .5) * S;
  vec2 q = p.xz - cc;
  vec2 h = h22(id);
  // keep a winding lane open for the camera
  if (abs(cc.x - pathX(cc.y)) < .5) { vec2 bd = S * .5 - abs(q); return min(bd.x, bd.y) + .1; }
  q -= (h - .5) * .12;
  q.x += sin(p.y * .45 + h.x * 6.28 + uGT * .35) * .045;
  float r = .05 + .025 * h.y;
  return length(q) - r;
}
`;

export const UF_FIELD = /* glsl */ `${HEAD}
${FIELD_COMMON}
void main(){
  vec2 uv = screenUV();
  vec3 ro = uCamPos, rd = camRay(uv);
  float t = .05;
  vec2 id;
  float d;
  bool hit = false;
  for (int i = 0; i < 90; i++){
    vec3 p = ro + rd * t;
    d = fibre(p, id);
    if (d < .0015 * t) { hit = true; break; }
    t += d * .8;
    if (t > 26.) break;
  }
  vec3 col = vec3(0.);
  vec3 fogCol = NAVY * .5 + BLUE * .02;
  if (hit) {
    vec3 p = ro + rd * t;
    vec2 e = vec2(.002, 0.);
    vec2 dm;
    vec3 n = normalize(vec3(fibre(p + e.xyy, dm) - fibre(p - e.xyy, dm), 0., fibre(p + e.yyx, dm) - fibre(p - e.yyx, dm)));
    vec2 h = h22(id);
    float fres = pow(1. - SAT(dot(-rd, n)), 3.);
    float top = SAT(n.y * .5 + .5);
    float stri = .75 + .25 * sin(atan(n.z, n.x) * 26.);
    float pores = .8 + .2 * vnoise(vec3(p.xz * 60., p.y * 60.));
    // light travelling up the fibres, locked to the music
    float run = exp(-abs(fract(p.y * .08 - uGT * .5 + h.x) - .5) * 9.) * (.4 + 1.6 * uBar);
    vec3 base = mix(SLATE * .9, vec3(.35, .42, .46), .35) * stri * pores;
    col = base * (.03 + .08 * top) + mix(AQUA, ICE, .4) * fres * .7 + AQUA * run * .6 * (.3 + fres);
    col += mix(SEA, AQUA, h.y) * .025 * (1. + uBeat);
    col = mix(col, fogCol, 1. - exp(-t * .2));
  } else {
    col = fogCol;
  }
  // light shafts falling between the fibres
  float jit = h21(gl_FragCoord.xy + fract(uGT) * 71.);
  float tm = min(t, 22.);
  vec3 fog = vec3(0.);
  for (int i = 0; i < 16; i++){
    float s = (float(i) + jit) / 16. * tm;
    vec3 p = ro + rd * s;
    float shaft = pow(vnoise(vec3(p.xz * .7, uGT * .1)), 5.) * smoothstep(-3., 4., p.y);
    fog += (AQUA * .5 + ICE * .5) * shaft * .05 * (1. + uBeat) * tm / 16. * exp(-s * .08);
  }
  col += fog;

  // water carried toward the membranes: fine drifting specks
  for (int i = 0; i < 14; i++){
    float fi = float(i);
    float D = .6 + fi * .55;
    if (D > t) break;
    vec2 P = uv * D;
    vec2 Q = P * 7. + vec2(uGT * .6 + fi * 17.3, -uGT * .2 + fi * 5.1);
    vec2 c = floor(Q), f = fract(Q) - .5;
    float h = h21(c + fi * 11.);
    if (h > .25) continue;
    float r = .06 + .1 * h21(c + 3.);
    col += mix(AQUA, ICE, .5) * bokeh(length(f), r) * .12 * exp(-D * .25);
  }
  fragColor = vec4(finish(col), 1.);
}
`;

export const UF_FIBRE = /* glsl */ `${HEAD}
uniform float uCamZ;
const float R = 1.;

vec3 vor(vec2 x){
  vec2 n = floor(x), f = fract(x);
  float md = 8., md2 = 8.;
  float id = 0.;
  for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++){
    vec2 g = vec2(i, j);
    vec2 o = h22(n + g);
    vec2 r = g + o - f;
    float d = dot(r, r);
    if (d < md) { md2 = md; md = d; id = h21(n + g); } else if (d < md2) md2 = d;
  }
  return vec3(sqrt(md), sqrt(md2) - sqrt(md), id);
}

void main(){
  vec2 uv = screenUV();
  vec3 ro = uCamPos, rd = camRay(uv);
  float a = dot(rd.xy, rd.xy), b = dot(ro.xy, rd.xy), c = dot(ro.xy, ro.xy) - R * R;
  float tw = (-b + sqrt(max(b * b - a * c, 0.))) / max(a, 1e-5);
  vec3 p = ro + rd * tw;
  float ang = atan(p.y, p.x);
  vec2 wc = vec2(ang * R * 7., p.z * 7.);
  vec3 v = vor(wc);
  float pore = smoothstep(.1, .26, v.x);                  // 1 on membrane, 0 in a pore
  float fib = fbm2(vec2(ang * 30., p.z * 2.));             // fibrous texture
  // pores that let water through light up in bursts
  float burst = step(.7, v.z) * pow(fract(uGT * .55 + v.z * 7.), 6.) * (1. + 2. * uBeat);
  vec3 wall = SLATE * (.05 + .12 * fib) * pore * (.7 + .3 * smoothstep(0., .3, v.y));
  vec3 behind = mix(AQUA, SEA, .3) * (.08 + .12 * fib) * (1. - pore);  // permeate glow outside
  wall += behind + mix(AQUA, ICE, .6) * burst * (1. - pore) * 1.4;
  vec3 n = normalize(vec3(-p.xy, 0.));
  wall += ICE * pow(1. - SAT(dot(-rd, n)), 4.) * .08;
  vec3 col = wall * exp(-tw * .12);
  col += NAVY * .5 * (1. - exp(-tw * .12));

  // feed water in the lumen: large rejected particles tumble, fine specks flow
  for (int i = 0; i < 26; i++){
    float fi = float(i);
    float kz = floor(uCamZ / .35) + 1. + fi;
    float D = kz * .35 - uCamZ;
    if (D > tw) break;
    vec2 P = ro.xy + rd.xy / rd.z * D;
    vec2 Q = P + vec2(h11(kz), h11(kz + 2.)) * 20.;
    vec2 cell = floor(Q / .4);
    vec2 f = Q / .4 - cell;
    vec3 rnd = h33(vec3(cell, kz));
    if (rnd.z > .4 || length(P) > R * .92) continue;
    vec2 cc = .3 + .4 * h22(cell + kz);
    cc += .08 * vec2(sin(uGT * 2. + rnd.x * 9.), cos(uGT * 1.7 + rnd.y * 9.));
    float dist = length(f - cc) * .4;
    float big = step(.7, rnd.y);
    float r = big > 0. ? .03 + .02 * rnd.x : .006;
    float Rr = r + min(abs(D - 1.5) * .008, .03) + 1.3 * D / uRes.y;
    float bb = bokeh(dist, Rr) * r * r / (Rr * Rr) * smoothstep(.12, .08, dist);
    vec3 pc = big > 0. ? mix(SLATE * 2.2, SEA * .5, rnd.x) : mix(AQUA, ICE, .5) * 1.5;
    col += pc * bb * exp(-D * .2) * smoothstep(.1, .8, D) * 1.5;
  }
  fragColor = vec4(finish(col), 1.);
}
`;

export const UF_ARRAY = /* glsl */ `${HEAD}
uniform float uBuild;   // 0..1 pressure build toward the drop
// UF modules: vertical housings in skids of 8 x 2, aisles between skids
float mapArr(vec3 p, out float m, out vec2 mid){
  m = 0.;
  float d = p.y;                               // floor
  vec2 sk = vec2(11.2, 4.8);                  // skid pitch (x, z)
  vec2 sid = floor(p.xz / sk);
  vec2 q = p.xz - (sid + .5) * sk;
  vec2 c = clamp(floor(q / 1.2) + .5, vec2(-3.5, -.5), vec2(3.5, .5));
  mid = sid * 8. + c;
  vec2 mq = q - c * 1.2;
  float cyl = max(length(mq) - .34, abs(p.y - 2.9) - 2.6);
  if (cyl < d) { d = cyl; m = 1.; }
  // headers along x at top and bottom of each module row
  float hz = q.y - clamp(floor(q.y / 1.2) + .5, -.5, .5) * 1.2;
  float hx = abs(q.x) - 4.6;
  float top = max(length(vec2(p.y - 5.75, hz)) - .16, hx);
  float bot = max(length(vec2(p.y - .45, hz)) - .16, hx);
  float hd = min(top, bot);
  if (hd < d) { d = hd; m = 2.; }
  return d;
}

void main(){
  vec2 uv = screenUV();
  vec3 ro = uCamPos, rd = camRay(uv);
  float t = .1, m = 0.;
  vec2 mid;
  bool hit = false;
  for (int i = 0; i < 100; i++){
    vec3 p = ro + rd * t;
    float d = mapArr(p, m, mid);
    if (d < .002 * t) { hit = true; break; }
    t += d * .9;
    if (t > 120.) break;
  }
  vec3 fogCol = NAVY * .5;
  vec3 col = fogCol;
  // pressure pulses: beat subdivisions double as the drop approaches
  float rate = uBuild < .5 ? 4. : (uBuild < .8 ? 8. : 16.);
  float sub = exp(-fract(uGT * rate / 2.) * 5.) * (.3 + uBuild);
  if (hit) {
    vec3 p = ro + rd * t;
    vec2 e = vec2(.003, 0.);
    float mm; vec2 dm;
    vec3 n = normalize(vec3(mapArr(p + e.xyy, mm, dm) - mapArr(p - e.xyy, mm, dm),
                            mapArr(p + e.yxy, mm, dm) - mapArr(p - e.yxy, mm, dm),
                            mapArr(p + e.yyx, mm, dm) - mapArr(p - e.yyx, mm, dm)));
    vec3 Ld = normalize(vec3(-.4, .8, -.3));
    float dif = SAT(dot(n, Ld));
    float fres = pow(1. - SAT(dot(-rd, n)), 4.);
    vec3 r = reflect(rd, n);
    float spec = pow(SAT(dot(r, Ld)), 30.);
    if (m == 0.) {
      float grid = smoothstep(.97, 1., max(fract(p.x / 2.4), fract(p.z / 2.4)));
      col = SLATE * .02 * (.6 + .4 * fbm2(p.xz)) + AQUA * grid * .02;
    } else if (m == 1.) {
      float h = h21(mid);
      float band = exp(-abs(p.y - 5.2) * 14.) + exp(-abs(p.y - .9) * 14.);
      float wave = exp(-abs(fract(length(mid) * .03 - uGT * rate * .1) - .5) * 8.);
      col = SLATE * (.02 + .07 * dif) + ICE * spec * .35 + mix(AQUA, ICE, .5) * fres * .12;
      col += AQUA * band * (.04 + 2.2 * sub * wave) * (.6 + .4 * h);
    } else {
      col = SLATE * (.04 + .1 * dif) + ICE * spec * .6;
      col += SEA * exp(-abs(fract(p.x * .1 - uGT * (1. + 3. * uBuild)) - .5) * 20.) * .8;
    }
    col = mix(col, fogCol, 1. - exp(-t * .022));
  }
  // haze with a rising glow over the array
  col += AQUA * .02 * exp(-max(rd.y, 0.) * 6.) * (1. + 3. * uBuild * sub);
  fragColor = vec4(finish(col), 1.);
}
`;
