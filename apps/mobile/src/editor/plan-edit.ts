import type { Pose, SceneObject } from "@buildit/core";

/** A piece as drawn: centre, size and clockwise turn in pixels and degrees (what `planGeometry` returns). */
export interface DrawnItem {
  id: string;
  cx: number;
  cy: number;
  w: number;
  d: number;
  rotation: number;
}

/** The topmost piece under a point, or null. Runs on the UI thread during a drag. */
export function hitItem(items: DrawnItem[], x: number, y: number): string | null {
  "worklet";
  for (let i = items.length - 1; i >= 0; i--) {
    const it = items[i];
    const a = (it.rotation * Math.PI) / 180;
    const [dx, dy] = [x - it.cx, y - it.cy];
    const [lx, ly] = [dx * Math.cos(a) + dy * Math.sin(a), -dx * Math.sin(a) + dy * Math.cos(a)];
    if (Math.abs(lx) <= it.w / 2 && Math.abs(ly) <= it.d / 2) return it.id;
  }
  return null;
}

/** The editor's grid: a drag moves a piece in whole 5 cm steps. */
export const GRID = 0.05;
const snap = (metres: number) => Math.round(metres / GRID) * GRID;

/** Where a piece ends up when dragged `dx`, `dy` pixels at `scale` pixels per metre: the same turn, moved by whole steps. */
export const draggedPose = (o: SceneObject, dx: number, dy: number, scale: number): Pose => ({
  x: o.x + snap(dx / scale),
  z: o.z + snap(dy / scale),
  rotation: o.rotation,
});
