import { sampleBedroom } from "@buildit/core";
import { planGeometry, wallLabels } from "./plan";

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

test("also gives each corner's position, for labelling the walls", () => {
  expect(g.corners).toHaveLength(scene.room.corners.length);
  expect(g.corners.map((c) => `${c.x},${c.y}`).join(" ")).toBe(g.wall);
});

describe("wallLabels", () => {
  const box = planGeometry(sampleBedroom(), 360, 296, 48);
  const labels = wallLabels(box.corners);

  test("puts one label beside each wall, on the outside, in wall order (north, east, south, west)", () => {
    const c = box.corners;
    expect(labels).toHaveLength(4);
    expect(labels[0].y).toBeLessThan(c[0].y); // above the north wall
    expect(labels[1].x).toBeGreaterThan(c[1].x); // right of the east wall
    expect(labels[2].y).toBeGreaterThan(c[2].y); // below the south wall
    expect(labels[3].x).toBeLessThan(c[3].x); // left of the west wall
  });

  test("each label sits level with the middle of its wall", () => {
    const c = box.corners;
    expect(labels[0].x).toBeCloseTo((c[0].x + c[1].x) / 2);
    expect(labels[1].y).toBeCloseTo((c[1].y + c[2].y) / 2);
  });

  test("labels stay inside the drawing box when it is padded enough", () => {
    for (const l of labels) expect(l.x >= 0 && l.x <= 360 && l.y >= 0 && l.y <= 296).toBe(true);
  });
});
