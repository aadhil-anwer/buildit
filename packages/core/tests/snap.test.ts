import { describe, expect, test } from "vitest";
import { snapToWalls, SNAP_DISTANCE } from "../src/layout/snap";
import { sampleBedroom } from "../src/templates";

const room = sampleBedroom().room; // 4.0 x 3.6, corners at 0 and the far sides
const piece = { w: 1, d: 0.5 };
const at = (x: number, z: number, rotation = 0) => ({ x, z, rotation });

describe("snapToWalls", () => {
  test("a piece a few centimetres off a wall is pulled flush against it", () => {
    const out = snapToWalls(room, piece, at(2, 0.25 + 0.05)); // back edge 5 cm off the north wall
    expect(out.z).toBeCloseTo(0.25);
    expect(out.x).toBe(2);
  });

  test("in a corner it snaps to both walls", () => {
    const out = snapToWalls(room, piece, at(0.5 + 0.04, 0.25 + 0.06));
    expect(out.x).toBeCloseTo(0.5);
    expect(out.z).toBeCloseTo(0.25);
  });

  test("a piece farther away than the snap distance is left alone", () => {
    const pose = at(2, 0.25 + SNAP_DISTANCE + 0.05);
    expect(snapToWalls(room, piece, pose)).toEqual(pose);
  });

  test("a piece already flush, or the middle of the room, does not move", () => {
    expect(snapToWalls(room, piece, at(2, 0.25))).toEqual(at(2, 0.25));
    expect(snapToWalls(room, piece, at(2, 1.8))).toEqual(at(2, 1.8));
  });

  test("a turned piece snaps by its real edge, not its unturned box", () => {
    const out = snapToWalls(room, piece, at(2, 0.5 + 0.05, 90)); // turned: 0.5 wide, 1 deep, so 0.5 from centre to the wall
    expect(out.z).toBeCloseTo(0.5);
  });
});
