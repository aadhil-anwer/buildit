import { sampleBedroom } from "@buildit/core";
import { planGeometry } from "./plan";

const scene = sampleBedroom(); // 4.0 x 3.6 m
const g = planGeometry(scene, 360, 196, 12);
const xs = g.wall.split(" ").map((p) => Number(p.split(",")[0]));
const zs = g.wall.split(" ").map((p) => Number(p.split(",")[1]));

test("the room fits inside the box with the padding, centred, at one scale for both axes", () => {
  expect(Math.min(...xs)).toBeGreaterThanOrEqual(12 - 0.01);
  expect(Math.max(...xs)).toBeLessThanOrEqual(360 - 12 + 0.01);
  expect(Math.min(...zs)).toBeGreaterThanOrEqual(12 - 0.01);
  expect(Math.max(...zs)).toBeLessThanOrEqual(196 - 12 + 0.01);
  expect((Math.max(...xs) - Math.min(...xs)) / 4.0).toBeCloseTo((Math.max(...zs) - Math.min(...zs)) / 3.6, 3);
  expect((Math.min(...xs) + Math.max(...xs)) / 2).toBeCloseTo(180, 1);
});

test("every piece is drawn at the room's scale", () => {
  const scale = (Math.max(...xs) - Math.min(...xs)) / 4.0;
  const bed = scene.objects.find((o) => o.type === "bed")!;
  const drawn = g.items.find((i) => i.id === bed.id)!;
  expect(g.items).toHaveLength(scene.objects.length);
  expect(drawn.w).toBeCloseTo(bed.w * scale, 3);
  expect(drawn.d).toBeCloseTo(bed.d * scale, 3);
  expect(drawn.color).toBe(bed.color);
});

test("rotation turns counter-clockwise as seen from above, so the drawing turns the other way", () => {
  const wardrobe = scene.objects.find((o) => o.type === "wardrobe")!; // rotation 270
  expect(g.items.find((i) => i.id === wardrobe.id)!.rotation).toBe(-270);
});

test("an empty room still draws its walls", () => {
  const empty = planGeometry({ ...scene, objects: [] }, 360, 196, 12);
  expect(empty.items).toEqual([]);
  expect(empty.wall.split(" ")).toHaveLength(scene.room.corners.length);
});
