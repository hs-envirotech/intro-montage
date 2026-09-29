// Smooth camera paths: Catmull-Rom through timed keys.
export type Vec3 = [number, number, number];
export type Key = [number, Vec3];

const cr = (p0: number, p1: number, p2: number, p3: number, u: number) =>
  0.5 * (2 * p1 + (-p0 + p2) * u + (2 * p0 - 5 * p1 + 4 * p2 - p3) * u * u + (-p0 + 3 * p1 - 3 * p2 + p3) * u * u * u);

/** Position on a Catmull-Rom spline through `keys` at time t (clamped). */
export const spline = (keys: Key[], t: number): Vec3 => {
  if (t <= keys[0][0]) return keys[0][1];
  const n = keys.length;
  if (t >= keys[n - 1][0]) return keys[n - 1][1];
  let i = 0;
  while (i < n - 2 && t > keys[i + 1][0]) i++;
  const k0 = keys[Math.max(i - 1, 0)][1];
  const k1 = keys[i][1];
  const k2 = keys[i + 1][1];
  const k3 = keys[Math.min(i + 2, n - 1)][1];
  const u = (t - keys[i][0]) / (keys[i + 1][0] - keys[i][0]);
  return [0, 1, 2].map((a) => cr(k0[a], k1[a], k2[a], k3[a], u)) as Vec3;
};

export const smooth = (a: number, b: number, x: number) => {
  const u = Math.min(Math.max((x - a) / (b - a), 0), 1);
  return u * u * (3 - 2 * u);
};
export const clamp01 = (x: number) => Math.min(Math.max(x, 0), 1);
export const lerp = (a: number, b: number, u: number) => a + (b - a) * u;
export const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
