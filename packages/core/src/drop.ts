import { checkPose } from "./layout/validate";
import { placeObject, type OpResult } from "./ops";
import { getObject } from "./scene";
import type { Pose, Scene } from "./types";

const STEP = 0.05;

/** The poses on the square ring `ring` steps out from `pose`, nearest first, same turn. */
const ring = (pose: Pose, n: number): Pose[] => {
  const out: Pose[] = [];
  for (let i = -n; i <= n; i++) for (let j = -n; j <= n; j++) if (Math.max(Math.abs(i), Math.abs(j)) === n) out.push({ x: pose.x + i * STEP, z: pose.z + j * STEP, rotation: pose.rotation });
  return out.sort((a, b) => Math.hypot(a.x - pose.x, a.z - pose.z) - Math.hypot(b.x - pose.x, b.z - pose.z));
};

/** Drop a dragged piece: where it was let go if that spot is free, else the nearest free spot within `reach` metres, keeping its turn. Refused only when nothing nearby fits. */
export function dropObject(scene: Scene, id: string, pose: Pose, reach = 1): OpResult {
  const first = placeObject(scene, id, pose);
  const obj = getObject(scene, id);
  if (first.ok || !obj || obj.locked) return first;
  for (let n = 1; n * STEP <= reach + 1e-9; n++) {
    const free = ring(pose, n).find((p) => checkPose(scene, obj, p).ok);
    if (free) return placeObject(scene, id, free);
  }
  return first;
}
