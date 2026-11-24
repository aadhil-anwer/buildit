import { describe, expect, test } from "vitest";
import { dropObject, sampleBedroom } from "../src";

describe("dropObject", () => {
  test("a free spot is used as is", () => {
    const r = dropObject(sampleBedroom(), "bed_1", { x: 2, z: 1.4, rotation: 0 });
    expect(r.ok).toBe(true);
    expect(r.scene.objects.find((o) => o.id === "bed_1")).toMatchObject({ x: 2, z: 1.4 });
  });

  test("dropped onto a nightstand, the bed slides to the nearest free spot instead of bouncing back", () => {
    const r = dropObject(sampleBedroom(), "bed_1", { x: 1.7, z: 1.075, rotation: 0 });
    expect(r.ok).toBe(true);
    const bed = r.scene.objects.find((o) => o.id === "bed_1")!;
    expect(Math.hypot(bed.x - 1.7, bed.z - 1.075)).toBeLessThan(0.6);
    expect(bed.rotation).toBe(0);
  });

  test("a locked piece is still refused", () => {
    const s = sampleBedroom();
    const locked = { ...s, objects: s.objects.map((o) => (o.id === "bed_1" ? { ...o, locked: true } : o)) };
    expect(dropObject(locked, "bed_1", { x: 2, z: 1.4, rotation: 0 }).ok).toBe(false);
  });
});
