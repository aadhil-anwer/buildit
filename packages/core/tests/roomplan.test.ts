import { describe, expect, test } from "vitest";
import { importRoomPlan } from "../src/importers/roomplan";
import { findGeometryIssues } from "../src/layout/validate";
import { getWalls, roomArea } from "../src/room";
import { parseScene } from "../src/schema";

function syntheticScan() {
  const yaw = (30 * Math.PI) / 180;
  const c = Math.cos(yaw);
  const s = Math.sin(yaw);
  // Rotation about Y applied to local X gives (c, 0, -s) in ARKit terms;
  // we only need the floor-plane axis, so build the matrix from it.
  const place = (x: number, y: number, z: number, angle = 0) => {
    const a = yaw + angle;
    const ca = Math.cos(a);
    const sa = Math.sin(a);
    // world = R(yaw) * local; translation also rotated by yaw
    const wx = x * c - z * s;
    const wz = x * s + z * c;
    return [ca, 0, sa, 0, 0, 1, 0, 0, -sa, 0, ca, 0, wx + 3, y - 1.4, wz - 2, 1];
  };
  const W = 5;
  const L = 4;
  const H = 2.7;
  const wall = (x: number, z: number, angle: number, len: number) => ({
    category: { wall: {} },
    dimensions: [len, H, 0],
    transform: place(x, H / 2, z, angle),
    confidence: { high: {} },
  });
  return {
    version: 2,
    walls: [
      wall(W / 2, 0, 0, W),
      wall(W, L / 2, Math.PI / 2, L),
      wall(W / 2, L, 0, W),
      wall(0, L / 2, Math.PI / 2, L),
    ],
    doors: [{ category: { door: { isOpen: false } }, dimensions: [0.9, 2.05, 0], transform: place(4, 1.025, L, 0) }],
    windows: [{ category: { window: {} }, dimensions: [1.6, 1.2, 0], transform: place(2.5, 1.5, 0, 0) }],
    openings: [],
    objects: [
      { category: { sofa: {} }, dimensions: [2.1, 0.85, 0.9], transform: place(2.5, 0.425, L - 0.5, Math.PI) },
      { category: { table: {} }, dimensions: [1.1, 0.42, 0.6], transform: place(2.5, 0.21, 2.4, 0) },
      { category: { storage: {} }, dimensions: [1.8, 0.5, 0.45], transform: place(2.5, 0.25, 0.25, 0) },
      { category: { television: {} }, dimensions: [1.25, 0.75, 0.08], transform: place(2.5, 0.9, 0.25, 0) },
      { category: { refrigerator: {} }, dimensions: [0.7, 1.8, 0.7], transform: place(0.4, 0.9, 0.4, 0) },
    ],
  };
}

describe("RoomPlan import", () => {
  test("rebuilds the room outline, openings and furniture", () => {
    const { scene, notes } = importRoomPlan(syntheticScan(), "Scan");
    expect(parseScene(scene)).not.toBeNull();
    expect(getWalls(scene.room)).toHaveLength(4);
    expect(roomArea(scene.room)).toBeCloseTo(20, 0);
    expect(scene.room.height).toBeCloseTo(2.7, 1);
    expect(scene.room.openings.map((o) => o.type).sort()).toEqual(["door", "window"]);
    const window = scene.room.openings.find((o) => o.type === "window")!;
    expect(window.sill).toBeCloseTo(0.9, 1);

    const types = scene.objects.map((o) => o.type).sort();
    expect(types).toEqual(["coffee_table", "fixture", "sofa", "tv_unit"]);
    expect(scene.objects.find((o) => o.type === "fixture")?.locked).toBe(true);
    // Furniture lands inside the room without overlaps.
    expect(findGeometryIssues(scene).filter((i) => i.kind === "outside_room" || i.kind === "collision")).toEqual([]);
    // Sofa and TV face each other (backs to opposite walls).
    const sofa = scene.objects.find((o) => o.type === "sofa")!;
    const tv = scene.objects.find((o) => o.type === "tv_unit")!;
    expect((sofa.rotation - tv.rotation + 360) % 360).toBeCloseTo(180, 0);
    expect(notes[0]).toMatch(/Imported 4 walls/);
  });

  test("rejects files that are not scans", () => {
    expect(() => importRoomPlan({ hello: 1 })).toThrow(/not a RoomPlan scan/);
  });
});

