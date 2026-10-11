import { describe, expect, test } from "vitest";
import { fits, largestFree } from "../src/layout/free-space";
import { RECT_WALL, makeOpening } from "../src/room";
import { createScene, objectFromCatalogId } from "../src/scene";
import { emptyRoom, sampleBedroom } from "../src/templates";
import type { Scene } from "../src/types";

const room = (w = 4, l = 3) => emptyRoom({ name: "T", width: w, length: l, height: 2.8, openings: [makeOpening("door", RECT_WALL.south, 0.3, 0.9)] });
const put = (s: Scene, id: string, x: number, z: number, rotation = 0): Scene => ({ ...s, objects: [...s.objects, objectFromCatalogId(s, id, { x, z, rotation })] });
const area = (r: { w: number; d: number }) => r.w * r.d;

describe("largestFree", () => {
  test("an empty room is free all the way across", () => {
    const f = largestFree(room());
    expect(f.w).toBeCloseTo(4, 1);
    expect(f.d).toBeCloseTo(3, 1);
  });

  test("furniture in the middle leaves the biggest strip beside it", () => {
    const f = largestFree(put(room(4, 4), "wardrobe_3", 2, 2)); // 1.5 x 0.6 wardrobe in the centre
    expect(area(f)).toBeGreaterThan(4 * 1.6); // a full-width strip beside the wardrobe
    expect(area(f)).toBeLessThan(16);
  });

  test("floor-level pieces (rugs) do not take up space", () => {
    expect(area(largestFree(put(room(), "rug_small", 2, 1.5)))).toBeCloseTo(12, 0);
  });

  test("can ignore chosen pieces, to say what would fit without them", () => {
    const withDesk = put(room(4, 4), "desk", 2, 2);
    expect(area(largestFree(withDesk, { without: ["desk_1"] }))).toBeGreaterThan(area(largestFree(withDesk)));
  });

  test("follows an L-shaped room instead of its bounding box", () => {
    const l = createScene({ ...room().room, corners: [{ x: 0, z: 0 }, { x: 4, z: 0 }, { x: 4, z: 2 }, { x: 2, z: 2 }, { x: 2, z: 4 }, { x: 0, z: 4 }], openings: [] });
    expect(area(largestFree(l))).toBeCloseTo(8, 0);
  });

  test("reports where the free rectangle is", () => {
    const f = largestFree(sampleBedroom());
    expect(f.x - f.w / 2).toBeGreaterThanOrEqual(0);
    expect(f.z + f.d / 2).toBeLessThanOrEqual(3.6 + 0.05);
  });
});

test("fits tries both orientations", () => {
  const free = { w: 2, d: 1, x: 0, z: 0 };
  expect(fits(free, 1.9, 0.9)).toBe(true);
  expect(fits(free, 0.9, 1.9)).toBe(true);
  expect(fits(free, 2.1, 0.5)).toBe(false);
});
