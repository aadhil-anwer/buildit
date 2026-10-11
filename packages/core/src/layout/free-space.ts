import { typeInfo } from "../catalog";
import { bounds, pointInObb, pointInPolygon } from "../geometry";
import { objectObb } from "../scene";
import type { Scene } from "../types";

/** An axis-aligned free rectangle: size (w along x, d along z) and centre, in metres. */
export interface FreeRect {
  w: number;
  d: number;
  x: number;
  z: number;
}

/** Rows of cells; true where the floor is inside the room and not under standing furniture. */
function freeGrid(scene: Scene, cell: number, without: string[]) {
  const { minX, maxX, minZ, maxZ } = bounds(scene.room.corners);
  const solids = scene.objects.filter((o) => !typeInfo(o.type).floorLevel && !without.includes(o.id)).map((o) => objectObb(o));
  const rows = Array.from({ length: Math.ceil((maxZ - minZ) / cell) }, (_, r) =>
    Array.from({ length: Math.ceil((maxX - minX) / cell) }, (_, c) => {
      const p = { x: minX + (c + 0.5) * cell, z: minZ + (r + 0.5) * cell };
      return pointInPolygon(p, scene.room.corners) && !solids.some((b) => pointInObb(p, b));
    }),
  );
  return { rows, minX, minZ };
}

/** The biggest rectangle of free floor, found row by row with a histogram stack (linear in the grid size). */
export function largestFree(scene: Scene, { cell = 0.05, without = [] }: { cell?: number; without?: string[] } = {}): FreeRect {
  const { rows, minX, minZ } = freeGrid(scene, cell, without);
  const heights = new Array<number>(rows[0]?.length ?? 0).fill(0);
  let best = { area: 0, left: 0, bottom: 0, w: 0, h: 0 };
  rows.forEach((row, r) => {
    row.forEach((free, c) => (heights[c] = free ? heights[c] + 1 : 0));
    const stack: number[] = [];
    for (let c = 0; c <= heights.length; c++) {
      const h = c === heights.length ? 0 : heights[c];
      while (stack.length && heights[stack[stack.length - 1]] >= h) {
        const height = heights[stack.pop() as number];
        const left = stack.length ? stack[stack.length - 1] + 1 : 0;
        if (height * (c - left) > best.area) best = { area: height * (c - left), left, bottom: r, w: c - left, h: height };
      }
      stack.push(c);
    }
  });
  const [w, d] = [best.w * cell, best.h * cell];
  return { w, d, x: minX + best.left * cell + w / 2, z: minZ + (best.bottom + 1) * cell - d / 2 };
}

/** Can a w x d footprint go in this free rectangle, either way round? */
export const fits = (free: FreeRect, w: number, d: number) => (free.w >= w && free.d >= d) || (free.w >= d && free.d >= w);
