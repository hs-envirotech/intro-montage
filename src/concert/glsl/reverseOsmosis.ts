import { HEAD } from "./common";

// REVERSE OSMOSIS — the centrepiece.
// RO_RACKS: an industrial landscape of stainless pressure vessels, end caps
//   facing the aisle, swept by concert beams. Light pulses run down the trains.
// RO_MEMBRANE: microscopic. Dense, turbulent feed water is driven at a thin,
//   impossibly precise membrane; the camera breaks through into calm,
//   luminous permeate.

export const RO_RACKS = /* glsl */ `${HEAD}
const float PX = 22.;     // aisle pitch in x
const float X0 = 1.6;     // end-cap face
const float LEN = 8.;     // vessel length
const float VR = .4;      // vessel radius

float mapRO(vec3 p, out float m, out vec3 vid){
  vec3 q = p;
  float ax = floor((q.x + PX * .5) / PX);
  q.x = mod(q.x + PX * .5, PX) - PX * .5;
  float side = sign(q.x);
  q.x = abs(q.x);
  float zc = floor(q.z) + .5;
  float yc = clamp(floor(q.y - .4), 0., 6.) + .9;
  vid = vec3(ax * 2. + side, yc, zc);
  vec2 rq = vec2(q.y - yc, q.z - zc);
  float dr = length(rq) - VR;
  float dx = abs(q.x - (X0 + LEN * .5)) - LEN * .5;
  float d = min(max(dr, dx), 0.) + length(max(vec2(dr, dx), 0.));
  m = 1.;
  // end-cap flange ring
  float fl = max(length(rq) - VR - .04, abs(q.x - X0 - .08) - .06);
  if (fl < d) { d = fl; m = 2.; }
  // frame posts every 4 vessels and horizontal headers
  vec2 pz = vec2(q.x - X0 + .25, q.z - (floor(q.z / 4.) + .5) * 4.);
  float post = sdBox(vec3(pz.x, q.y - 3.9, pz.y), vec3(.07, 3.9, .07));
  float hdr = min(length(vec2(q.x - 1.05, q.y - .35)) - .2, length(vec2(q.x - 1.05, q.y - 7.5)) - .2);
  float st = min(post, hdr);
  if (st < d) { d = st; m = 3.; }
  float fl0 = p.y;
  if (fl0 < d) { d = fl0; m = 0.; }
  return d;
}

float mapD(vec3 p){ float m; vec3 v; return mapRO(p, m, v); }

// Travelling light pulse down each train, on the beat.
float trainPulse(vec3 vid){
  float w = fract((vid.z * .9 + vid.x * 3.7) / 36. - uGT * .45);
  return exp(-abs(w - .5) * 16.);
}

void main(){
  vec2 uv = screenUV();
  vec3 ro = uCamPos, rd = camRay(uv);
  float t = .02, m = 0.;
  vec3 vid;
  bool hit = false;
  // skip empty space above the racks
  if (ro.y > 8.2 && rd.y < 0.) t = max(t, (ro.y - 8.2) / -rd.y);
  for (int i = 0; i < 110; i++){
    vec3 p = ro + rd * t;
    float d = mapRO(p, m, vid);
    if (d < .0015 * t) { hit = true; break; }
    t += d * .85;
    if (t > 160. || (p.y > 8.5 && rd.y > 0.)) break;
  }
  vec3 sky = mix(NAVY * .6, BLUE * .08, SAT(rd.y * 2.));
  vec3 col = sky;
  vec3 Ld = normalize(vec3(.3, .9, .35));
  if (hit) {
    vec3 p = ro + rd * t;
    vec2 e = vec2(.002 + .0005 * t, 0.);
    vec3 n = normalize(vec3(mapD(p + e.xyy) - mapD(p - e.xyy), mapD(p + e.yxy) - mapD(p - e.yxy), mapD(p + e.yyx) - mapD(p - e.yyx)));
    vec3 r = reflect(rd, n);
    float fres = .04 + .96 * pow(1. - SAT(dot(-rd, n)), 5.);
    float dif = SAT(dot(n, Ld));
    float h = h31(vid);
    float pulse = trainPulse(vid) * (.7 + 2.2 * uBar);
    // environment seen in the steel: dark sky, bright beam band overhead
    vec3 env = mix(NAVY * .2, BLUE * .3, SAT(r.y)) + ICE * pow(SAT(r.y), 24.) * 1.5 * (1. + uBeat);
    vec3 q = p; q.x = abs(mod(q.x + PX * .5, PX) - PX * .5);
    if (m == 1.) {
      // brushed stainless: streaks along the vessel
      float brush = .7 + .3 * vnoise(vec3(q.x * 2., q.y * 60., q.z * 60.));
      col = SLATE * .08 * dif * brush + env * mix(.35, 1., fres) * brush;
      col += ICE * pow(SAT(dot(r, Ld)), 60.) * 1.2;
      col += AQUA * pulse * .12 * smoothstep(X0 + 1.5, X0, q.x);
    } else if (m == 2.) {
      float rr = length(vec2(q.y - vid.y, q.z - vid.z));
      // end cap: dark face, glowing port ring and bolt circle
      float port = exp(-abs(rr - .12) * 80.);
      float ring = exp(-abs(rr - VR) * 40.);
      col = SLATE * .05 * dif + env * .3 * fres;
      col += mix(AQUA, SEA, h * .6) * (port * (.4 + 3. * pulse) + ring * (.25 + 1.8 * pulse));
    } else if (m == 3.) {
      col = SLATE * (.02 + .06 * dif) + env * .2 * fres;
      col += SEA * exp(-abs(fract(q.z * .05 - uGT * .8) - .5) * 30.) * .6 * step(q.y, 1.);
      col += AQUA * exp(-abs(fract(q.z * .05 + uGT * .6) - .5) * 30.) * .6 * step(7., q.y);
    } else {
      // wet concrete floor reflecting the lit end caps
      float wet = fbm2(p.xz * .7);
      col = SLATE * .015 * wet;
      float lane = exp(-pow(q.x - X0, 2.) * 3.);
      col += AQUA * lane * .1 * (1. + 2. * uBar) * wet;
      col += env * .08 * wet;
    }
    col = mix(col, sky + BLUE * .02, 1. - exp(-t * .02));
  }

  // volumetric haze and sweeping stage beams
  float tMax = min(t, 90.);
  float jit = h21(gl_FragCoord.xy + fract(uGT) * 53.);
  vec3 fog = vec3(0.);
  for (int i = 0; i < 22; i++){
    float s = (float(i) + jit) / 22. * tMax;
    vec3 p = ro + rd * s;
    float dens = .006 * exp(-p.y * .12) * (.5 + vnoise(p * .15 + vec3(0., 0., -uGT * .3)));
    float beams = 0.;
    for (int b = 0; b < 3; b++){
      float fb = float(b);
      vec3 o = vec3(ro.x + (fb - 1.) * 14., 30., ro.z + 25. + fb * 8.);
      float sw = sin(uGT * (.35 + fb * .07) + fb * 2.1);
      vec3 dir = normalize(vec3(sw * .7, -1., cos(uGT * .3 + fb) * .35));
      vec3 v = p - o;
      float al = dot(v, dir);
      float rad = length(v - dir * al);
      beams += step(0., al) * exp(-rad * rad / (.08 + al * al * .0025));
    }
    fog += (BLUE * .15 + ICE * beams * (1.2 + 2.5 * uBar)) * dens * tMax / 22.;
  }
  col += fog;
  fragColor = vec4(finish(col), 1.);
}
`;

export const RO_MEMBRANE = /* glsl */ `${HEAD}
uniform float uCamZ;
uniform float uSpeed;
uniform float uPressure;   // 0..1 before the membrane
const float MZ = 12.;       // membrane plane

float ridge(vec2 p){
  float s = 0., a = .5;
  for (int i = 0; i < 4; i++){ s += a * (1. - abs(vnoise2(p) * 2. - 1.)); p = p * 2.1 + 3.1; a *= .5; }
  return s;
}

void main(){
  vec2 uv = screenUV();
  float dm = MZ - uCamZ;                 // distance to membrane
  float after = smoothstep(-.3, .6, -dm);  // 0 feed side … 1 permeate side
  vec3 col = vec3(0.);

  // background: turbulent concentrate ahead / calm luminous permeate beyond
  float turb = fbm2(uv * 2.2 + vec2(uGT * .15, -uGT * .1) + fbm2(uv * 3. - uGT * .2));
  vec3 feedBg = mix(NAVY * .6, SLATE * .12, turb) + SEA * .03 * turb * uPressure;
  float calm = fbm2(uv * 1.2 + uGT * .03);
  vec3 permBg = mix(BLUE * .12, AQUA * .22, calm) * (1. - .5 * length(uv));
  permBg += ICE * .05 * pow(SAT(1. - length(uv * vec2(.6, 1.))), 3.);
  col = mix(feedBg, permBg, after);

  float memTrans = 1.;
  const float TILT = 1.15;   // the sheet recedes upward: a vast plane, not a wall
  // the membrane itself, rushing closer until the camera breaks through
  if (dm > 0. && uv.y < .8 / TILT) {
    float Dm = dm / (1. - uv.y * TILT);
    vec2 P = vec2(uv.x * Dm, uv.y * Dm + (uCamZ + Dm) * .8);
    float px = Dm / uRes.y;
    float r = ridge(P * 3.);
    float fine = ridge(P * 14. + 7.);
    vec2 sc = floor(P * 40.);
    float sparkle = step(.985, h21(sc)) * pow(fract(uGT * 1.3 + h21(sc + 4.)), 8.) * smoothstep(.35, .05, length(fract(P * 40.) - .5));
    float aa = smoothstep(.08, .01, px);          // detail fades out into the distance
    float a = SAT(.5 + .35 * r) * smoothstep(14., 3., dm);
    vec3 mc = mix(SLATE, vec3(.2, .24, .27), .3) * (.12 + .8 * pow(r, 1.5) * mix(.7, fine, aa));
    mc += mix(AQUA, SEA, .35) * pow(1. - r, 4.) * .22 * (1. + uBeat);     // permeate light glowing through the valleys
    mc += mix(AQUA, ICE, .6) * sparkle * 2.5 * aa;
    mc = mix(mc, BLUE * .08 + AQUA * .02, 1. - exp(-Dm * .04));
    col = mix(col, mc, a);
    memTrans = 1. - a * .85;
  }
  // breakthrough
  col += mix(AQUA, ICE, .8) * exp(-dm * dm * 12.) * 1.1;
  // permeate: soft rays of light ahead
  if (after > 0.) {
    vec2 dirv = normalize(uv + 1e-4);
    float rays = pow(vnoise(vec3(dirv * 5., uGT * .15)), 4.) * exp(-length(uv) * 1.2);
    col += mix(AQUA, ICE, .5) * rays * .5 * after * (1. + .5 * uBar);
  }

  // particles: dense ions and organics before the membrane, sparse after
  for (int i = 0; i < 34; i++){
    float fi = float(i);
    float kz = floor(uCamZ / .32) + 1. + fi;
    float zw = kz * .32;
    float D = zw - uCamZ;
    vec2 P = uv * D;
    bool feed = zw < MZ;
    float mzHere = MZ + P.y * TILT;
    feed = zw < mzHere;
    float nearM = feed ? smoothstep(mzHere - 1.5, mzHere, zw) : 0.;
    vec2 Q = P + vec2(h11(kz), h11(kz + 5.)) * 30.;
    // turbulence on the feed side; concentrate slides along the membrane
    if (feed) {
      Q += .35 * vec2(vnoise(vec3(Q * .8, uGT * .5)) - .5, vnoise(vec3(Q * .8 + 7., uGT * .5)) - .5) * (1. + uPressure);
      Q.x += nearM * uGT * 1.8;
    } else {
      Q += vec2(uGT * .05, uGT * .12);
    }
    float cellS = feed ? .3 : .8;
    vec2 cell = floor(Q / cellS);
    vec2 f = Q / cellS - cell;
    vec3 rnd = h33(vec3(cell, kz));
    float dens = feed ? mix(.55, .9, nearM) : .1;
    if (rnd.z > dens) continue;
    vec2 cc = .3 + .4 * h22(cell + kz);
    vec2 d = (f - cc) * cellS;
    float r = feed ? mix(.004, .014, rnd.x) : .007;
    float Rr = r + min(abs(D - 1.8) * .01, .06) + 1.3 * D / uRes.y;
    vec2 dir = normalize(P + 1e-4);
    float sl = feed ? min(uSpeed * .02 * length(P) / max(D, .3), .12) : 0.;
    float al = dot(d, dir), pe = dot(d, vec2(-dir.y, dir.x));
    float dist = length(vec2(max(abs(al) - sl * .5, 0.), pe));
    float b = bokeh(dist, Rr) * r * r / (Rr * Rr) * (Rr / (Rr + sl)) * smoothstep(.2 * cellS, .12 * cellS, dist);
    vec3 pc = feed ? mix(SLATE * 2.5, mix(SEA, AQUA, rnd.y), step(.55, rnd.y)) * (.7 + .8 * uBeat)
                   : mix(AQUA, ICE, .6) * 1.8;
    float fade = smoothstep(.1, 1., D) * exp(-D * .14);
    if (!feed) fade *= mix(memTrans, 1., after);
    col += pc * b * fade * (feed ? 1.3 : 1.);
  }
  // pressure fronts rushing toward the membrane on each beat
  if (dm > 0.) {
    float ring = exp(-abs(length(uv) - fract(uGT * 2.) * 1.2) * 30.) * uBeat * uPressure;
    col += SEA * ring * .15;
  }
  fragColor = vec4(finish(col), 1.);
}
`;
