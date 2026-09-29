import * as THREE from "three";
import { VIDEO } from "../config";
import type { Vec3 } from "./anim";

const cam = new THREE.PerspectiveCamera(35, VIDEO.width / VIDEO.height, 0.01, 2000);
const v = new THREE.Vector3();

/** Project a 3D point to screen pixels for a given camera, so 2D labels can track 3D equipment. */
export const project = (p: Vec3, camera: { pos: Vec3; target: Vec3; fov: number }) => {
  cam.fov = camera.fov;
  cam.position.set(...camera.pos);
  cam.lookAt(...camera.target);
  cam.updateProjectionMatrix();
  cam.updateMatrixWorld();
  v.set(...p).project(cam);
  return { x: ((v.x + 1) / 2) * VIDEO.width, y: ((1 - v.y) / 2) * VIDEO.height, visible: v.z < 1 };
};
