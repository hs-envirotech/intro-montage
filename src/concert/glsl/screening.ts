import { HEAD } from "./common";

// SCREENING — a monumental intake channel lined with bar screens, backlit
// through mist. Mostly analytic geometry (planes, cylinders), so it stays
// cheap enough to afford volumetric light shafts. Ends at a vast intake pipe.
export const SCREENING = /* glsl */ `${HEAD}
uniform float uZEnd;     // z of the intake wall
const float W = 5.;      // screen walls at x = ±W
const float BACK = 8.5;  // light wall behind the screens
const float TOP = 15.;   // ceiling
const vec2 HOLE = vec2(0., 2.6);
const float HOLE_R = 2.3;

// 1 where the bar screen is open, 0 on steel. z runs along the channel.
float gap(float z, float y){
  float b = fract(z / .55);
  float v = smoothstep(.55, .61, b) * smoothstep(.99, .93, b);
  float h = smoothstep(.0, .05, fract(y / 3.4)) * smoothstep(1., .95, fract(y / 3.4));
  return v * h;
}

vec3 backlight(vec3 p){
  float n = fbm2(vec2(p.z * .05, p.y * .12 - uGT * .08));
  float lamp = exp(-pow((p.y - 7.) * 1.1, 2.)) * (.5 + .5 * sin(p.z * .21 + uGT * .7));
  float pulse = 1. + 1.4 * uBeat;
  return (BLUE * .03 + mix(AQUA, ICE, .6) * (3. * pow(n, 4.) + 1.2 * lamp)) * pulse * smoothstep(TOP, 3., p.y) * step(p.z, uZEnd);
}

// Shade the scene along a ray, without the water floor (used for reflections too).
vec3 sceneNoFloor(vec3 ro, vec3 rd, out float tHit){
  tHit = 1e4;
  vec3 col = vec3(0.);
  int kind = 0;
  // end wall
  if (rd.z > 0.) {
    float t = (uZEnd - ro.z) / rd.z;
    if (t > 0.) { tHit = t; kind = 1; }
  }
  // ceiling
  if (rd.y > 0.) {
    float t = (TOP - ro.y) / rd.y;
    if (t > 0. && t < tHit) { tHit = t; kind = 2; }
  }
  // overhead pipes along z at (±2.6, 11.5)
  for (int s = 0; s < 2; s++) {
    vec2 c = vec2(s == 0 ? -2.8 : 2.8, 11.2);
    vec2 o = ro.xy - c;
    float a = dot(rd.xy, rd.xy), b = dot(o, rd.xy), cc = dot(o, o) - 1.1 * 1.1;
    float h = b * b - a * cc;
    if (h > 0.) {
      float t = (-b - sqrt(h)) / a;
      if (t > 0. && t < tHit && ro.z + rd.z * t < uZEnd) { tHit = t; kind = 3 + s; }
    }
  }
  // screens: steel bars blended with the backlight seen through them
  float wallG = 0.;
  vec3 wallBack = vec3(0.);
  if (abs(rd.x) > 1e-4) {
    float side = sign(rd.x);
    float t = (side * W - ro.x) / rd.x;
    vec3 p = ro + rd * t;
    if (t > 0. && t < tHit && p.y < TOP && p.z < uZEnd) {
      float fw = t / (uRes.y * uFocal) / max(abs(rd.x), .05) / .55;
      wallG = mix(gap(p.z, p.y), .36, smoothstep(.25, .9, fw));
      float t2 = (side * BACK - ro.x) / rd.x;
      wallBack = backlight(ro + rd * t2) * .6;
      tHit = t; kind = 5;
    }
  }
  vec3 p = ro + rd * tHit;
  if (kind == 1) {
    float r = length(p.xy - HOLE);
    if (r < HOLE_R) {
      // into the pipe: dark, ring lights receding
      float tt = 0.;
      for (int k = 1; k < 6; k++) {
        float z = uZEnd + float(k) * 3.5;
        float t = (z - ro.z) / rd.z;
        vec3 q = ro + rd * t;
        float rr = length(q.xy - HOLE);
        tt += exp(-abs(rr - HOLE_R * .95) * 30.) * exp(-float(k) * .5);
      }
      col = AQUA * tt * 1.5 * (1. + uBar);
    } else {
      float rim = exp(-(r - HOLE_R) * 3.) ;
      float conc = .5 + .5 * fbm2(p.xy * .6);
      col = SLATE * .05 * conc + AQUA * rim * .6 * (1. + uBeat);
      col += ICE * exp(-abs(r - HOLE_R - .12) * 40.) * .8;
    }
  } else if (kind == 2) {
    float gird = smoothstep(.9, 1., fract(p.z / 9.));
    col = SLATE * .015 + BLUE * .05 * gird;
  } else if (kind == 3 || kind == 4) {
    vec2 c = vec2(kind == 3 ? -2.8 : 2.8, 11.2);
    vec3 n = normalize(vec3(p.xy - c, 0.));
    float band = smoothstep(.93, 1., fract(p.z / 6.));
    float rimL = pow(SAT(dot(n, normalize(vec3(-sign(c.x), -.3, 0.)))), 3.);
    col = SLATE * .04 + mix(AQUA, ICE, .3) * rimL * .5 + ICE * band * .05;
    col += ICE * pow(SAT(reflect(rd, n).y), 18.) * .25;
  } else if (kind == 5) {
    // backlit steel bar: dark body, light wrapping its edges
    float b = fract(p.z / .55);
    float e = min(abs(b - .58), abs(b - .96));
    float wrap = exp(-e * 55.);
    float fw = tHit / (uRes.y * uFocal) / max(abs(rd.x), .05) / .55;
    wrap = mix(wrap, .08, smoothstep(.25, .9, fw));
    vec3 steel = SLATE * .02 + mix(AQUA, ICE, .6) * wrap * .6 * (1. + uBeat);
    col = mix(steel * smoothstep(TOP, TOP - 4., p.y), wallBack, wallG);
  }
  return col;
}

float fogDensity(vec3 p){
  float n = vnoise(p * vec3(.25, .35, .12) + vec3(0., -uGT * .15, -uGT * .6));
  return (.0008 + .006 * n * n * n) * exp(-p.y * .04) + .02 * exp(-p.y * 1.4) * n;
}

// Light arriving at p through both bar screens, travelling inward and down.
float shafts(vec3 p){
  float s = 0.;
  for (int k = 0; k < 2; k++) {
    float side = k == 0 ? -1. : 1.;
    float dw = W - side * p.x;
    if (dw < 0.) continue;
    vec3 L = normalize(vec3(-side, -.5, .32));
    float tt = dw / abs(L.x);
    vec3 w = p - L * tt;
    if (w.y > TOP || w.z > uZEnd) continue;
    s += mix(gap(w.z, w.y), .36, .45) * exp(-dw * .12) * smoothstep(TOP, TOP - 5., w.y);
  }
  return s;
}

void main(){
  vec2 uv = screenUV();
  vec3 ro = uCamPos, rd = camRay(uv);
  float tHit;
  vec3 col;
  float tFloor = rd.y < 0. ? -ro.y / rd.y : 1e4;
  vec3 dummy;
  float tScene;
  vec3 sc = sceneNoFloor(ro, rd, tScene);
  float tEnd = tScene;
  if (tFloor < tScene && ro.z + rd.z * tFloor < uZEnd) {
    tEnd = tFloor;
    vec3 p = ro + rd * tFloor;
    // flowing water surface
    vec2 fp = p.xz * vec2(1.4, .45) - vec2(0., uGT * 3.2);
    float e = .06;
    float h0 = fbm2(fp), hx = fbm2(fp + vec2(e, 0.)), hz = fbm2(fp + vec2(0., e));
    vec3 n = normalize(vec3(-(hx - h0) / e * .12, 1., -(hz - h0) / e * .12));
    vec3 rr = reflect(rd, n);
    float tR;
    vec3 refl = sceneNoFloor(p + n * .01, rr, tR);
    float fres = .04 + .96 * pow(1. - SAT(dot(-rd, n)), 5.);
    float foam = smoothstep(.62, .8, fbm2(fp * 2.3 + 3.)) * .08;
    col = NAVY * .08 + refl * mix(.25, 1., fres) + mix(AQUA, ICE, .5) * foam * (.4 + shafts(p + vec3(0, .2, 0)));
  } else {
    col = sc;
  }

  // volumetric mist with light shafts and sweeping beams
  float tMax = min(tEnd, 70.);
  const int N = 30;
  float dt = tMax / float(N);
  float jit = h21(gl_FragCoord.xy + fract(uGT) * 91.);
  vec3 fog = vec3(0.);
  float trans = 1.;
  for (int i = 0; i < N; i++) {
    float t = (float(i) + jit) * dt;
    vec3 p = ro + rd * t;
    if (p.z > uZEnd) break;
    float d = fogDensity(p);
    float sh = shafts(p) * (1. + 1.2 * uBeat);
    // two beams sweeping down from the ceiling ahead of the camera
    float beams = 0.;
    for (int b = 0; b < 2; b++) {
      float fb = float(b);
      vec3 o = vec3((fb * 2. - 1.) * 2.5, TOP - .5, ro.z + 16. + fb * 9.);
      vec3 dir = normalize(vec3(sin(uGT * .6 + fb * 2.) * .6, -1., cos(uGT * .45 + fb) * .4));
      vec3 v = p - o;
      float along = dot(v, dir);
      float rad = length(v - dir * along);
      beams += step(0., along) * exp(-rad * rad / (.02 + along * along * .004)) * .8;
    }
    vec3 L = mix(AQUA, ICE, .5) * sh * sh * 2.6 + ICE * beams * (.5 + uBar);
    fog += trans * d * dt * (L + BLUE * .02);
    trans *= exp(-d * dt);
  }
  col = col * trans + fog;
  fragColor = vec4(finish(col), 1.);
}
`;
