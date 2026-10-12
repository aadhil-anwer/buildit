import { analyzeClearance, sampleBedroom, type ClearanceReport } from "@buildit/core";
import { overlayPixels, overlayRuns } from "./walk-overlay";

const report = (cols: number, rows: number, cells: number[]): ClearanceReport => ({ cell: 0.5, cols, rows, originX: 1, originZ: 2, overlay: Uint8Array.from(cells), access: [], freeFloorRatio: 1, walkableRatio: 1, issues: [] });

test("equal neighbouring cells in a row become one run, in room coordinates", () => {
  const runs = overlayRuns(report(4, 2, [1, 1, 0, 2, 0, 2, 2, 2]));
  expect(runs).toEqual([
    { kind: "walkable", x: 1, z: 2, w: 1, d: 0.5 },
    { kind: "tight", x: 2.5, z: 2, w: 0.5, d: 0.5 },
    { kind: "tight", x: 1.5, z: 2.5, w: 1.5, d: 0.5 },
  ]);
});

test("cells that are not marked produce nothing", () => expect(overlayRuns(report(2, 1, [0, 0]))).toEqual([]));

test("the picture has one pixel per cell and its first row is the south edge", () => {
  const rgba = { walkable: [1, 2, 3, 4], tight: [5, 6, 7, 8] } as Record<"walkable" | "tight", [number, number, number, number]>;
  const px = overlayPixels(report(2, 2, [1, 0, 0, 2]), rgba);
  expect(px).toHaveLength(2 * 2 * 4);
  expect(Array.from(px.slice(0, 4))).toEqual([0, 0, 0, 0]); // south-west cell is empty
  expect(Array.from(px.slice(4, 8))).toEqual([5, 6, 7, 8]); // south-east is tight
  expect(Array.from(px.slice(8, 12))).toEqual([1, 2, 3, 4]); // north-west is walkable (last row of the picture)
});

test("a real room has walkable floor and no cell is both", () => {
  const c = analyzeClearance(sampleBedroom(), { cell: 0.05, overlay: true });
  const runs = overlayRuns(c);
  expect(runs.some((r) => r.kind === "walkable")).toBe(true);
  expect(runs.every((r) => r.w > 0 && r.d > 0)).toBe(true);
});
