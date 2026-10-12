import { getWalls, makeOpening, RECT_WALL, rectangularRoom } from "@buildit/core";
import { doorSwings, swingArc } from "./door-swing";

const room = () => rectangularRoom({ name: "R", width: 4, length: 3.5, height: 2.5, openings: [makeOpening("door", RECT_WALL.south, 0.3, 0.9), makeOpening("window", RECT_WALL.north, 1, 1.4)] });

test("only doors swing, one swing per door", () => {
  expect(doorSwings(room())).toHaveLength(1);
});

test("the swing opens into the room, from the door's own wall", () => {
  const r = room();
  const [swing] = doorSwings(r);
  const wall = getWalls(r)[RECT_WALL.south];
  expect(swing.into).toEqual(wall.inward);
  expect(swing.radius).toBe(0.9);
  expect(swing.hinge.z).toBeCloseTo(wall.start.z);
});

test("the arc starts along the wall, ends at right angles to it, and stays one door-width from the hinge", () => {
  const [swing] = doorSwings(room());
  const arc = swingArc(swing);
  const [first, last] = [arc[0], arc[arc.length - 1]];
  expect(first.x).toBeCloseTo(swing.hinge.x + swing.along.x * 0.9);
  expect(last.z).toBeCloseTo(swing.hinge.z + swing.into.z * 0.9);
  for (const p of arc) expect(Math.hypot(p.x - swing.hinge.x, p.z - swing.hinge.z)).toBeCloseTo(0.9);
});
