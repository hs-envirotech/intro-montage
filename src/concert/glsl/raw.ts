import { HEAD } from "./common";

// RAW WATER — near-darkness, suspended sediment and bubbles drifting in a
// vast body of water. Light blooms from below; particles gather into a
// luminous stream flowing away beneath the camera.
// Also used, dimmed, as the atmosphere behind the brand reveal.
export const RAW = /* glsl */ `${HEAD}
uniform float uReveal;  // overall visibility 0..1
uniform float uLight;   // aqua light from below 0..1
uniform float uFlow;    // particles gather into the stream 0..1
uniform float uCamZ;    // camera travel (world units)
uniform float uSpeed;   // camera speed, for motion streaks
uniform float uStream;  // luminous stream band 0..1
uniform float uNavy;    // navy wash behind the brand reveal

const float DZ = 0.55;
const int L = 30;
const float FOCUS = 3.2;
const float CELL = 0.8;
const vec2 AXIS = vec2(0., -1.25);

void main(){
  vec2 uv = screenUV();
  uv = rot(.025 * sin(uGT * .07)) * uv;
  float rev = uReveal;
  vec3 col = vec3(0.);

  // deep water: faint navy haze
  float haze = fbm2(uv * 1.3 + vec2(uGT * .012, -uGT * .018));
  col += BLUE * .045 * rev * (.35 + haze) * smoothstep(-.9, .5, uv.y + .3);

  col += NAVY * uNavy * (1.2 - .7 * length(uv * vec2(.7, 1.)));

  // aqua light welling up from below
  float below = exp(-pow((uv.y + .66) * 2.1, 2.)) * (.45 + .55 * fbm2(vec2(uv.x * 1.7 + uGT * .04, uGT * .09)));
  col += AQUA * below * .22 * uLight * (1. + .5 * uBar);

  // faint light rays from the surface far above
  float ang = atan(uv.x, uv.y + 1.9);
  float rays = fbm2(vec2(ang * 11., uGT * .06));
  col += BLUE * .09 * rev * pow(rays, 3.) * smoothstep(-.55, .55, uv.y);

  // luminous stream flowing away under the camera
  if (uStream > 0. && uv.y < -.005) {
    float D = -AXIS.y / -uv.y;
    float x = uv.x * D;
    float w = .22 + .2 * uFlow;
    float z = D + uCamZ;
    float tex = fbm2(vec2(x * 2.6, z * .55 - uGT * 1.2));
    float core = exp(-pow(x / w, 2.)) * (.45 + .9 * tex);
    float wide = exp(-pow(x / (w * 5.), 2.)) * .12;
    float fade = exp(-D * .07) * smoothstep(.5, 2.5, D);
    float pulse = 1. + .8 * uBeat * exp(-abs(fract(z * .05 - uGT * .5) - .5) * 6.);
    col += mix(SEA, AQUA, tex) * (core + wide) * fade * uStream * .9 * pulse;
  }

  // particle volume: fixed world layers, the camera travels through them
  float conv = uFlow * .8;
  for (int i = 0; i < L; i++){
    float fi = float(i);
    float kz = floor(uCamZ / DZ) + 1. + fi;
    float D = kz * DZ - uCamZ;
    vec2 P = uv * D;
    vec2 Q = AXIS + (P - AXIS) / (1. - conv);
    Q += vec2(sin(uGT * .09 + kz) * .35, uGT * .04) + vec2(h11(kz), h11(kz + 7.3)) * CELL * 9.;
    vec2 cell = floor(Q / CELL);
    vec2 f = Q / CELL - cell;
    vec3 rnd = h33(vec3(cell, kz));
    if (rnd.z > .34) continue;
    vec2 pp = .3 + .4 * h22(cell + kz * 1.7);
    float shrink = 1. - conv;
    vec2 d = (f - pp) * CELL * shrink;
    float margin = .3 * CELL * shrink;

    float r = mix(.005, .026, rnd.x * rnd.x) * mix(1., .6, conv);
    float coc = min(abs(D - FOCUS) * .011, .09) * shrink;
    float R = r + coc + 1.3 * D / uRes.y;

    // motion streak toward the vanishing point
    vec2 dir = normalize(P - AXIS * .2 + 1e-4);
    float sl = min(uSpeed * .03 * length(P) / max(D, .4), .5) * shrink;
    float along = dot(d, dir), perp = dot(d, vec2(-dir.y, dir.x));
    float dist = length(vec2(max(abs(along) - sl * .5, 0.), perp));

    float energy = r * r / (R * R) * (R / (R + sl));
    float fade = smoothstep(.2, 1.6, D) * exp(-D * .13) * smoothstep(float(L) * DZ, float(L) * DZ * .7, D);
    float edge = smoothstep(margin, margin * .6, dist);

    float lit = .3 + 1.6 * smoothstep(.2, -1.4, P.y) * uLight + .5 * conv;
    vec3 c;
    if (rnd.y > .95) {             // bubble: bright rim
      float ring = smoothstep(R * .35, 0., abs(dist - R * .65)) + .15 * bokeh(dist, R);
      c = mix(AQUA, ICE, .3) * ring;
    } else if (rnd.y > .72) {       // droplet / light fleck
      c = mix(AQUA, SEA, rnd.x) * bokeh(dist, R) * 1.4;
    } else {                        // sediment
      c = mix(SLATE * 1.6, BLUE * .8, rnd.x) * bokeh(dist, R);
    }
    col += c * energy * fade * edge * lit * rev * 1.3;
  }
  fragColor = vec4(finish(col), 1.);
}
`;
