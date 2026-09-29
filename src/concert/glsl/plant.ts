import { HEAD } from "./common";

// CLEAN WATER → INFRASTRUCTURE — a stylised composite treatment facility at
// night: clarifiers, membrane halls, storage and elevated tanks, reservoirs,
// pipe racks with light pulsing through them. Not any real Envirotech site.
export const PLANT = /* glsl */ `${HEAD}
const float CS = 24.;      // block size
const float EXTENT = 7.;   // blocks from the centre

// block type: 0 clarifiers, 1 membrane hall, 2 reservoir, 3 storage + elevated tank
float blockType(vec2 id){
  if (id.x == 0. && id.y == 0.) return 2.;
  return floor(h21(id + 17.) * 4.);
}

float sdCyl(vec3 p, float r, float h){ vec2 d = vec2(length(p.xz) - r, abs(p.y - h * .5) - h * .5); return min(max(d.x, d.y), 0.) + length(max(d, 0.)); }

float mapPlant(vec3 p, out float m, out vec2 bid){
  bid = floor(p.xz / CS);
  vec2 q = p.xz - (bid + .5) * CS;
  float d = p.y; m = 0.;
  if (length(bid + .5) > EXTENT) return d;
  float ty = blockType(bid);
  float h = h21(bid);
  if (ty == 0.) {
    vec2 qq = abs(q) - 5.8;
    float r = length(qq) - 4.6;
    float shell = max(abs(r) - .25, p.y - 2.6);
    if (shell < d) { d = shell; m = 1.; }
    float water = max(r, p.y - 2.3);
    if (water < d) { d = water; m = 4.; }
  } else if (ty == 1.) {
    float hall = sdBox(vec3(q.x, p.y - 3., q.y), vec3(9., 3., 4.2));
    float hall2 = sdBox(vec3(q.x, p.y - 2.2, q.y - 7.), vec3(8., 2.2, 1.6));
    float b = min(hall, hall2);
    if (b < d) { d = b; m = 2.; }
  } else if (ty == 2.) {
    float basin = sdBox(vec3(q.x, p.y - .3, q.y), vec3(9.5, .3, 9.5));
    float rim = max(basin, -sdBox(vec3(q.x, p.y - .5, q.y), vec3(9.1, .6, 9.1)));
    if (rim < d) { d = rim; m = 1.; }
    float water = sdBox(vec3(q.x, p.y - .2, q.y), vec3(9.1, .02, 9.1));
    if (water < d) { d = water; m = 4.; }
  } else {
    vec3 pp = vec3(q.x, p.y, q.y);
    float tanks = min(sdCyl(pp - vec3(-5., 0., -4.), 3.2, 7. + 3. * h), sdCyl(pp - vec3(3., 0., -4.), 3.2, 7.));
    vec3 ep = (pp - vec3(4., 15., 5.)) / vec3(3.4, 2.4, 3.4);
    float el = min((length(ep) - 1.) * 2.4, sdCyl(pp - vec3(4., 0., 5.), .9, 15.));
    float s = min(tanks, el);
    if (s < d) { d = s; m = 3.; }
  }
  // pipe racks along block edges
  float px = length(vec2(p.y - .9, abs(q.y) - 11.2)) - .45;
  float pz = length(vec2(p.y - 1.5, abs(q.x) - 11.2)) - .35;
  float pr = min(px, pz);
  if (pr < d) { d = pr; m = 5.; }
  return d;
}

float mapD(vec3 p){ float m; vec2 b; return mapPlant(p, m, b); }

void main(){
  vec2 uv = screenUV();
  vec3 ro = uCamPos, rd = camRay(uv);
  float t = .05, m = 0.;
  vec2 bid;
  bool hit = false;
  const float TOPY = 18.5;
  if (ro.y > TOPY) {
    if (rd.y >= 0.) t = 1e4; else t = (ro.y - TOPY) / -rd.y;
  }
  for (int i = 0; i < 120; i++){
    if (t > 600.) break;
    vec3 p = ro + rd * t;
    float d = mapPlant(p, m, bid);
    if (d < .0012 * t) { hit = true; break; }
    t += d * .9;
    if (p.y > TOPY + .5 && rd.y > 0.) { t = 1e4; break; }
  }
  // night sky: navy, with an aqua glow on the horizon from the facility
  vec3 sky = mix(BLUE * .06, NAVY * .3, SAT(rd.y * 3.)) + AQUA * .03 * exp(-abs(rd.y) * 14.);
  vec3 col = sky;
  vec3 Ld = normalize(vec3(-.4, .5, .3));
  if (hit) {
    vec3 p = ro + rd * t;
    vec2 e = vec2(.003 + t * .0004, 0.);
    vec3 n = normalize(vec3(mapD(p + e.xyy) - mapD(p - e.xyy), mapD(p + e.yxy) - mapD(p - e.yxy), mapD(p + e.yyx) - mapD(p - e.yyx)));
    float dif = SAT(dot(n, Ld));
    float fres = pow(1. - SAT(dot(-rd, n)), 5.);
    vec2 q = p.xz - (bid + .5) * CS;
    float hb = h21(bid);
    float rip = length(bid + .5) * 1.4;
    // the whole facility pulses outward from its heart on every bar
    float wave = exp(-abs(fract(rip * .05 - uGT * .5) - .5) * 10.) * (.5 + 2. * uBar);
    if (m == 0.) {
      float grid = smoothstep(.985, 1., max(fract(p.x / 6.), fract(p.z / 6.)));
      float inside = step(length(bid + .5), EXTENT);
      col = SLATE * (.008 + .012 * fbm2(p.xz * .1)) + BLUE * grid * .015 * inside;
    } else if (m == 1.) {
      col = SLATE * (.03 + .08 * dif) + ICE * fres * .05;
      col += mix(SEA, AQUA, hb) * exp(-abs(p.y - 2.55) * 20.) * (.5 + wave);
    } else if (m == 2.) {
      // membrane hall: dark cladding, glazed band showing lit skids inside
      float glaze = step(abs(p.y - 3.3), .7) * step(abs(n.y), .5);
      float mull = step(.12, fract((p.x + p.z) * .8));
      col = SLATE * (.02 + .06 * dif);
      col += mix(AQUA, ICE, .5) * glaze * mull * (.5 + .5 * wave) * 1.2;
      col += ICE * step(.9, n.y) * .01;
    } else if (m == 3.) {
      col = SLATE * (.04 + .12 * dif) + ICE * fres * .12;
      col += AQUA * exp(-abs(fract(p.y * .25) - .5) * 40.) * .05;
      col += ICE * step(14.5, p.y) * exp(-abs(p.y - 17.9) * 6.) * (1. + wave) * .6;
    } else if (m == 4.) {
      // clean water: luminous from within, rippling reflections
      float caus = caustic(p.xz * 1.6, uGT * .35);
      float rpl = fbm2(p.xz * .3 + uGT * .05);
      col = mix(NAVY * .4, BLUE * .12, rpl) + mix(AQUA, ICE, .5) * caus * .6 * (.4 + .6 * rpl);
      col += sky * 2. * pow(1. - SAT(-rd.y), 4.);
      col *= .6 + .6 * wave;
    } else {
      float flow = exp(-abs(fract((p.x + p.z) * .02 - uGT * .6) - .5) * 60.);
      col = SLATE * (.03 + .1 * dif) + mix(AQUA, SEA, step(1.2, p.y)) * (flow * (.5 + 1.2 * uBeat) + .015);
    }
    col = mix(col, sky + BLUE * .02, 1. - exp(-t * .006));
  }

  // atmosphere: low haze and searchlight beams rising from the plant
  float tMax = min(t, 320.);
  float jit = h21(gl_FragCoord.xy + fract(uGT) * 37.);
  vec3 fog = vec3(0.);
  for (int i = 0; i < 20; i++){
    float s = (float(i) + jit) / 20. * tMax;
    vec3 p = ro + rd * s;
    float dens = .004 * exp(-max(p.y, 0.) * .06);
    float beams = 0.;
    for (int b = 0; b < 4; b++){
      float fb = float(b);
      float a = fb * 1.57 + .6;
      vec3 o = vec3(cos(a), 0., sin(a)) * 55.;
      vec3 dir = normalize(vec3(sin(uGT * .4 + fb * 1.3) * .45, 1., cos(uGT * .33 + fb * 2.) * .45));
      vec3 v = p - o;
      float al = dot(v, dir);
      float rad = length(v - dir * al);
      beams += step(0., al) * exp(-rad * rad / (.4 + al * al * .0012));
    }
    fog += (BLUE * .12 + ICE * beams * (.6 + 2.2 * uBar) * uEnergy) * dens * tMax / 20.;
  }
  col += fog;
  fragColor = vec4(finish(col), 1.);
}
`;
