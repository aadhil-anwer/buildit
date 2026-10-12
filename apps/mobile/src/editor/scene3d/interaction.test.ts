import { draggedTo, type Drag } from "./interaction";

const drag: Drag = { id: "a", grab: { x: 1, z: 1 }, from: { x: 2, z: 3, rotation: 90 } };

test("a drag moves the piece by the distance the finger travelled, in 5 cm steps, and keeps its turn", () => {
  const to = draggedTo(drag, { x: 1.52, z: 0.74 });
  expect(to.rotation).toBe(90);
  expect(to.x).toBeCloseTo(2.5);
  expect(to.z).toBeCloseTo(2.75);
});

test("a finger that has not moved a full step leaves the piece where it was", () => {
  expect(draggedTo(drag, { x: 1.02, z: 0.98 })).toEqual({ x: 2, z: 3, rotation: 90 });
});
