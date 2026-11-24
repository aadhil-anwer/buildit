import { draggedTo, pieceAtFloor, type Drag } from "./interaction";

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

const chair = { id: "c", x: 1, z: 1, w: 0.4, d: 0.4, rotation: 0 } as never;
const sofa = { id: "s", x: 3, z: 1, w: 2, d: 0.9, rotation: 90 } as never;

test("a fingertip a little outside a small chair still picks it, and a bare spot picks nothing", () => {
  expect(pieceAtFloor([chair, sofa], { x: 1.3, z: 1 })).toBe("c");
  expect(pieceAtFloor([chair, sofa], { x: 2, z: 2 })).toBeNull();
});

test("a turned piece is hit along its turned footprint", () => {
  expect(pieceAtFloor([sofa], { x: 3, z: 1.9 })).toBe("s"); // the sofa's 2 m length runs along z once turned 90 degrees
  expect(pieceAtFloor([sofa], { x: 3.9, z: 1 })).toBeNull();
});
