import { describe, expect, test } from "vitest";
import { placeObject, setLocked } from "../src/ops";
import { sampleBedroom } from "../src/templates";

describe("placeObject", () => {
  const scene = sampleBedroom();
  const bed = scene.objects.find((o) => o.type === "bed")!;
  const at = (dx: number) => ({ x: bed.x + dx, z: bed.z, rotation: bed.rotation });

  test("puts a piece at an exact pose", () => {
    const res = placeObject(scene, bed.id, at(0.05));
    expect(res.ok).toBe(true);
    expect(res.scene.objects.find((o) => o.id === bed.id)!.x).toBeCloseTo(bed.x + 0.05);
    expect(res.changed).toEqual([bed.id]);
  });

  test("refuses a pose outside the room and leaves the scene as it was", () => {
    const res = placeObject(scene, bed.id, { ...at(0), x: -5 });
    expect(res.ok).toBe(false);
    expect(res.scene).toBe(scene);
  });

  test("refuses to move a locked piece", () => {
    const locked = setLocked(scene, bed.id, true).scene;
    expect(placeObject(locked, bed.id, at(0.05)).ok).toBe(false);
  });

  test("refuses an unknown piece", () => expect(placeObject(scene, "nope", at(0)).ok).toBe(false));
});
