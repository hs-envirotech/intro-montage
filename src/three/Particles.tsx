import React, { useMemo } from "react";
import * as THREE from "three";

let sprite: THREE.Texture | null = null;
export const getSprite = () => {
  if (sprite) return sprite;
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const g = c.getContext("2d")!;
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, "rgba(255,255,255,1)");
  grad.addColorStop(0.35, "rgba(255,255,255,0.55)");
  grad.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  sprite = new THREE.CanvasTexture(c);
  return sprite;
};

/**
 * A point cloud whose positions are recomputed every frame by `write`, which
 * fills a Float32Array (x,y,z per particle). Deterministic — no simulation state.
 */
export const Particles: React.FC<{
  count: number;
  write: (out: Float32Array) => void;
  color?: string;
  size?: number;
  opacity?: number;
  additive?: boolean;
}> = ({ count, write, color = "#CFEFF4", size = 0.04, opacity = 0.8, additive = true }) => {
  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(count * 3), 3));
    return g;
  }, [count]);
  const attr = geometry.getAttribute("position") as THREE.BufferAttribute;
  write(attr.array as Float32Array);
  attr.needsUpdate = true;
  geometry.computeBoundingSphere();
  if (opacity <= 0) return null;
  return (
    <points geometry={geometry} frustumCulled={false}>
      <pointsMaterial
        map={getSprite()}
        color={color}
        size={size}
        sizeAttenuation
        transparent
        opacity={opacity}
        depthWrite={false}
        blending={additive ? THREE.AdditiveBlending : THREE.NormalBlending}
        toneMapped={false}
      />
    </points>
  );
};
