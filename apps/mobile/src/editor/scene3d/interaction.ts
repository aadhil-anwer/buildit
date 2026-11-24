import { Plane, Raycaster, Vector2, Vector3, type Object3D } from "three";
import type { SceneObject } from "@buildit/core";
import type { RootState } from "@react-three/fiber";
import { GRID } from "../plan-edit";

const raycaster = new Raycaster();
const floor = new Plane(new Vector3(0, 1, 0), 0);

const aim = (state: RootState, x: number, y: number) => {
  raycaster.setFromCamera(new Vector2((x / state.size.width) * 2 - 1, -(y / state.size.height) * 2 + 1), state.camera);
  return raycaster;
};

/** The id of the piece of furniture under a touch (a point in the canvas, in pixels), or null for bare floor and walls. */
export function pickPiece(state: RootState, x: number, y: number): string | null {
  const group = state.scene.getObjectByName("pieces");
  if (!group) return null;
  const hit = aim(state, x, y).intersectObjects(group.children, true)[0];
  let node: Object3D | null = hit?.object ?? null;
  while (node && node.parent !== group) node = node.parent;
  return node?.name ?? null;
}

/** Where a touch lands on the floor, in room coordinates (metres), or null when it points at the sky. */
export function floorPoint(state: RootState, x: number, y: number): { x: number; z: number } | null {
  const hit = aim(state, x, y).ray.intersectPlane(floor, new Vector3());
  return hit && { x: hit.x, z: hit.z };
}

/** Slack round a piece's footprint, in metres, so a small chair can be grabbed with a fingertip. */
const REACH = 0.18;

/** The piece whose footprint (grown by a fingertip) holds a floor point; the one whose centre is nearest wins. Used when the ray misses every mesh. */
export function pieceAtFloor(pieces: readonly SceneObject[], at: { x: number; z: number }): string | null {
  let best: [string | null, number] = [null, Infinity];
  for (const o of pieces) {
    const [dx, dz, a] = [at.x - o.x, at.z - o.z, (o.rotation * Math.PI) / 180];
    const [lx, lz] = [dx * Math.cos(a) - dz * Math.sin(a), dx * Math.sin(a) + dz * Math.cos(a)];
    const dist = Math.hypot(dx, dz);
    if (Math.abs(lx) <= o.w / 2 + REACH && Math.abs(lz) <= o.d / 2 + REACH && dist < best[1]) best = [o.id, dist];
  }
  return best[0];
}

/** A piece being dragged: where it started, and the floor point the finger first touched. */
export interface Drag {
  id: string;
  grab: { x: number; z: number };
  from: { x: number; z: number; rotation: number };
}

const step = (metres: number) => Math.round(metres / GRID) * GRID;

/** The pose a dragged piece takes when the finger is over `here`: moved by the same distance, in whole 5 cm steps. */
export const draggedTo = (d: Drag, here: { x: number; z: number }) => ({ x: d.from.x + step(here.x - d.grab.x), z: d.from.z + step(here.z - d.grab.z), rotation: d.from.rotation });
