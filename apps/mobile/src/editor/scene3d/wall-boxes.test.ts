import type { Opening } from "@buildit/core";
import { wallBoxes } from "./wall-boxes";

const opening = (type: Opening["type"], offset: number, width: number, height: number, sill = 0): Opening => ({ id: "o", type, wall: 0, offset, width, height, sill });
const area = (boxes: ReturnType<typeof wallBoxes>) => boxes.reduce((s, b) => s + (b.x1 - b.x0) * (b.y1 - b.y0), 0);

test("a wall with no openings is one block", () => {
  expect(wallBoxes(4, 2.5, [])).toEqual([{ x0: 0, x1: 4, y0: 0, y1: 2.5 }]);
});

test("a door leaves a gap to the floor and wall above it", () => {
  const boxes = wallBoxes(4, 2.5, [opening("door", 1, 0.9, 2.1)]);
  expect(area(boxes)).toBeCloseTo(4 * 2.5 - 0.9 * 2.1);
  expect(boxes.some((b) => b.x0 === 1 && b.y0 === 0)).toBe(false);
});

test("a window keeps wall below the sill and above the head", () => {
  const boxes = wallBoxes(4, 2.5, [opening("window", 1, 1.4, 1.3, 0.9)]);
  expect(area(boxes)).toBeCloseTo(4 * 2.5 - 1.4 * 1.3);
  expect(boxes.filter((b) => b.x0 === 1)).toHaveLength(2);
});

test("openings in any order, and one touching the end of the wall, leave no gaps or overlaps", () => {
  const boxes = wallBoxes(4, 2.5, [opening("window", 2.6, 1.4, 1.3, 0.9), opening("door", 0, 0.9, 2.1)]);
  expect(area(boxes)).toBeCloseTo(4 * 2.5 - 1.4 * 1.3 - 0.9 * 2.1);
});

test("an opening taller than the wall cannot cut above it", () => {
  const boxes = wallBoxes(4, 2.5, [opening("door", 1, 0.9, 3)]);
  expect(boxes.every((b) => b.y1 <= 2.5)).toBe(true);
  expect(area(boxes)).toBeCloseTo(4 * 2.5 - 0.9 * 2.5);
});
