import type { Vec3 } from "../lib/anim";

// Hollow-fibre UF bundle shared by scene 1 (particles forming the fibres) and
// scene 2 (the solid membrane), so the cut between them is a physical match.
export const FIBRE_RADIUS = 0.34;
export const FIBRE_Z: [number, number] = [-60, -8];
export const FIBRE_CENTRES: [number, number][] = (() => {
  const out: [number, number][] = [[0, 0]];
  for (let ring = 1; ring <= 2; ring++) {
    const n = ring * 6;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + (ring === 2 ? Math.PI / 12 : 0);
      out.push([Math.cos(a) * ring * 0.95, Math.sin(a) * ring * 0.95]);
    }
  }
  return out;
})();
export const BUNDLE_Y = -2.2;

/** Camera pose at the scene 1 → scene 2 cut. */
export const CUT_CAMERA = { pos: [2.2, BUNDLE_Y + 1.1, -2.5] as Vec3, target: [0, BUNDLE_Y, -18] as Vec3, fov: 38 };
