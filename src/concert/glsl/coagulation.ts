import { HEAD } from "./common";

// COAGULATION / FLOCCULATION — inside a steel pipe. Fine suspended particles
// drift, collide and gather into soft flocs, which then sink away from a
// clarified core of flowing water.
export const COAGULATION = /* glsl */ `${HEAD}
uniform float uCamZ;
uniform float uFloc;  // 0 dispersed … 1 fully flocculated
uniform float uSep;   // flocs settle out of the flow 0..1
const float R = 2.4;
const float DZ = .42;
const int L = 30;
const float CELL = .62;

vec3 pipeWall(vec3 ro, vec3 rd, out float tw){
  float a = dot(rd.xy, rd.xy), b = dot(ro.xy, rd.xy), c = dot(ro.xy, ro.xy) - R * R;
  tw = (-b + sqrt(max(b * b - a * c, 0.))) / a;
  vec3 p = ro + rd * tw;
  float ang = atan(p.y, p.x);
  float z = p.z;
  float flange = smoothstep(.0, .06, fract(z / 7.)) * smoothstep(.2, .1, fract(z / 7.));
  float ringL = exp(-abs(fract(z / 14. + .5) - .5) * 14. * 7.);
  float seam = exp(-abs(sin(ang * 3.)) * 40.);
  float wet = fbm2(vec2(ang * 5., z * .6 - uGT * .3));
  vec3 n = normalize(vec3(-p.xy, 0.));
  float spec = pow(SAT(dot(reflect(rd, n), normalize(vec3(0., .2, 1.)))), 12.) * wet;
  vec3 col = SLATE * (.012 + .03 * wet) + ICE * spec * .15 + SLATE * flange * .15;
  col += mix(AQUA, SEA, .3) * ringL * (1.6 + 2.5 * uBar) + ICE * seam * .02;
  col *= exp(-tw * .06);
  return col;
}

void main(){
  vec2 uv = screenUV();
  vec3 ro = uCamPos;
  vec3 rd = camRay(uv);
  float tw;
  vec3 col = pipeWall(ro, rd, tw);

  // clarified water core: calm luminous streaks along the pipe
  vec2 cp = uv * 1.1;
  float ang = atan(cp.y, cp.x);
  float core = exp(-length(cp) * 3.2);
  float streak = pow(vnoise(vec3(cos(ang) * 4., sin(ang) * 4., length(cp) * 2. - uGT * 2.5)), 4.);
  col += mix(SEA, AQUA, .6) * (core * .2 + streak * core * .8) * (.3 + .7 * uSep) * (1. + .6 * uBeat);

  float k = uFloc;
  for (int i = 0; i < L; i++){
    float fi = float(i);
    float kz = floor(uCamZ / DZ) + 1. + fi;
    float D = kz * DZ - uCamZ;
    if (D > tw * .98) break;
    vec2 P = ro.xy + (rd.xy / rd.z) * D;
    vec2 Q = P + vec2(h11(kz), h11(kz + 3.7)) * 40.;
    Q.y += uSep * (1.2 + h11(kz + 1.1)) * 1.4;         // flocs sink
    Q += .15 * vec2(sin(uGT * .5 + kz), cos(uGT * .4 + kz * 1.3));
    vec2 cell = floor(Q / CELL);
    vec2 f = Q / CELL - cell;
    vec3 rnd = h33(vec3(cell, kz));
    if (rnd.z > .38) continue;
    vec2 cc = .35 + .3 * h22(cell * 1.3 + kz);
    float fade = smoothstep(.5, 2.2, D) * exp(-D * .15);
    float inPipe = smoothstep(R, R - .5, length(P));
    // collision flicker as particles meet
    float meet = exp(-abs(k - rnd.x * .8 - .1) * 22.) * step(.02, k);
    vec3 acc = vec3(0.);
    for (int j = 0; j < 5; j++){
      vec2 hj = h22(cell * 7.1 + float(j) * 13.7 + kz);
      vec2 o = (hj - .5) * .5 * (1. - k) + (h22(hj * 9.1) - .5) * .09 * k;
      o += .03 * (1. - k) * vec2(sin(uGT * 1.3 + hj.x * 6.), cos(uGT * 1.1 + hj.y * 6.));
      vec2 d = (f - cc - o) * CELL;
      float r = mix(.008, .026, k) * (.6 + .8 * hj.y);
      float coc = min(abs(D - 2.5) * .01, .05);
      float Rr = r + coc + 1.3 * D / uRes.y;
      float dist = length(d);
      float b = bokeh(dist, Rr) * r * r / (Rr * Rr) * smoothstep(.3 * CELL, .2 * CELL, dist);
      vec3 c = mix(SLATE * 2.4, SEA * .9, .25 + .5 * k * hj.x);
      c += AQUA * .4 * smoothstep(Rr * .9, Rr * .5, dist) * smoothstep(Rr * .2, Rr * .6, dist) * k;
      acc += c * b;
    }
    acc += mix(SEA, ICE, .5) * meet * .05 * exp(-dot(f - cc, f - cc) * 40.);
    col += acc * fade * inPipe * mix(1.5, .9, k);
  }
  fragColor = vec4(finish(col), 1.);
}
`;
