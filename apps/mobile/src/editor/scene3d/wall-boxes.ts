import type { Opening } from "@buildit/core";

/** One solid block of wall, in the wall's own space: `x` along it from its start, `y` up from the floor. */
export interface WallBox {
  x0: number;
  x1: number;
  y0: number;
  y1: number;
}

/** A wall's solid parts: full-height stretches between openings, and the wall above and below each opening. Doors reach the floor. */
export function wallBoxes(length: number, height: number, openings: Opening[]): WallBox[] {
  const boxes: WallBox[] = [];
  let at = 0;
  for (const o of [...openings].sort((a, b) => a.offset - b.offset)) {
    const [x0, x1] = [Math.max(at, o.offset), Math.min(length, o.offset + o.width)];
    if (x0 - at > 0.001) boxes.push({ x0: at, x1: x0, y0: 0, y1: height });
    const [bottom, top] = o.type === "window" ? [Math.max(0, o.sill), Math.min(height, o.sill + o.height)] : [0, Math.min(height, o.height)];
    if (bottom > 0.001) boxes.push({ x0, x1, y0: 0, y1: bottom });
    if (height - top > 0.001) boxes.push({ x0, x1, y0: top, y1: height });
    at = Math.max(at, x1);
  }
  if (length - at > 0.001) boxes.push({ x0: at, x1: length, y0: 0, y1: height });
  return boxes;
}
