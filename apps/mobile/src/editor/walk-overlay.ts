import type { ClearanceReport } from "@buildit/core";

/** The two kinds of floor the overlay marks. */
export type WalkKind = "walkable" | "tight";
export interface WalkRun {
  kind: WalkKind;
  /** Metres, in room coordinates. */
  x: number;
  z: number;
  w: number;
  d: number;
}

const KIND: Record<number, WalkKind | undefined> = { 1: "walkable", 2: "tight" };

/** The marked floor as horizontal runs of equal cells, so a plan draws a few hundred rectangles instead of thousands. */
export function overlayRuns(c: ClearanceReport): WalkRun[] {
  const runs: WalkRun[] = [];
  for (let row = 0; row < c.rows; row++) {
    for (let col = 0; col < c.cols; ) {
      const code = c.overlay[row * c.cols + col];
      let end = col + 1;
      while (end < c.cols && c.overlay[row * c.cols + end] === code) end++;
      const kind = KIND[code];
      if (kind) runs.push({ kind, x: c.originX + col * c.cell, z: c.originZ + row * c.cell, w: (end - col) * c.cell, d: c.cell });
      col = end;
    }
  }
  return runs;
}

/** The same cells as an RGBA picture for the 3D floor. Row 0 of the picture is the room's south edge (the plane is drawn upright from the south). */
export function overlayPixels(c: ClearanceReport, rgba: Record<WalkKind, [number, number, number, number]>): Uint8Array {
  const out = new Uint8Array(c.cols * c.rows * 4);
  for (let row = 0; row < c.rows; row++) {
    for (let col = 0; col < c.cols; col++) {
      const kind = KIND[c.overlay[row * c.cols + col]];
      if (kind) out.set(rgba[kind], ((c.rows - 1 - row) * c.cols + col) * 4);
    }
  }
  return out;
}
