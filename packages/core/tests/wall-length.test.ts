import { describe, expect, test } from "vitest";
import { adjustWallLength, getWalls, RECT_WALL, makeOpening, rectangleCorners } from "../src/room";
import { rectangularRoom } from "../src/templates";

const room = (w = 4, d = 3, openings = [makeOpening("door", RECT_WALL.south, 0.3, 0.9)]) => rectangularRoom({ name: "T", width: w, length: d, height: 2.8, openings });
const lengths = (r: ReturnType<typeof room>) => getWalls(r).map((w) => Math.round(w.length * 100) / 100);

describe("adjustWallLength", () => {
  test("lengthening the north wall makes the room wider, keeping the north-west corner", () => {
    const r = adjustWallLength(room(), RECT_WALL.north, 0.05)!;
    expect(lengths(r)).toEqual([4.05, 3, 4.05, 3]);
    expect(r.corners[0]).toEqual(room().corners[0]);
  });

  test("lengthening the east wall makes it longer", () => expect(lengths(adjustWallLength(room(), RECT_WALL.east, 0.05)!)).toEqual([4, 3.05, 4, 3.05]));

  test("every wall can be stepped, in both directions, and stepping back restores the room", () => {
    for (const wall of [0, 1, 2, 3]) {
      const there = adjustWallLength(room(), wall, 0.05)!;
      const back = adjustWallLength(there, wall, -0.05)!;
      expect(lengths(there)[wall]).toBeCloseTo(lengths(room())[wall] + 0.05, 2);
      expect(lengths(back)).toEqual(lengths(room()));
    }
  });

  test("a wall cannot shrink below 1 m", () => {
    expect(adjustWallLength(room(1.2, 3, []), RECT_WALL.north, -0.25)).toBeNull();
    expect(adjustWallLength(room(1.2, 3, []), RECT_WALL.north, -0.2)).not.toBeNull();
  });

  test("shrinking is refused when a door or window would no longer fit its wall", () => {
    const tight = room(4, 3, [makeOpening("door", RECT_WALL.south, 0.3, 0.9), makeOpening("window", RECT_WALL.north, 0.2, 3.6)]);
    expect(adjustWallLength(tight, RECT_WALL.north, -0.25)).toBeNull();
    expect(adjustWallLength(tight, RECT_WALL.north, 0.25)).not.toBeNull();
  });

  test("a wall that does not exist is refused", () => expect(adjustWallLength(room(), 9, 0.05)).toBeNull());

  test("works on an L-shaped room: only the next wall's corners move, along the wall", () => {
    const l = { ...room(), corners: [{ x: 0, z: 0 }, { x: 4, z: 0 }, { x: 4, z: 2 }, { x: 2, z: 2 }, { x: 2, z: 4 }, { x: 0, z: 4 }], openings: [] };
    const r = adjustWallLength(l, 0, 0.5)!;
    expect(r.corners).toEqual([{ x: 0, z: 0 }, { x: 4.5, z: 0 }, { x: 4.5, z: 2 }, { x: 2, z: 2 }, { x: 2, z: 4 }, { x: 0, z: 4 }]);
  });
});

test("rectangleCorners is the clockwise rectangle these tests assume", () => expect(rectangleCorners(4, 3)[1]).toEqual({ x: 4, z: 0 }));
