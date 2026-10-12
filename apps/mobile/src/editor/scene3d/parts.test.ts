import { CATALOG, objectFromCatalog, sampleBedroom, type FurnitureType } from "@buildit/core";
import { partsFor } from "./parts";

const scene = sampleBedroom();
const pose = { x: 0, z: 0, rotation: 0 };
const sample = CATALOG.filter((c) => !c.product).map((c) => objectFromCatalog(scene, c, pose));

test("every kind of furniture in the catalog is drawn with at least one part", () => {
  const kinds = new Set<FurnitureType>(sample.map((o) => o.type));
  expect(kinds.size).toBeGreaterThan(15);
  for (const o of sample) expect(partsFor(o).length).toBeGreaterThan(0);
});

test("parts stay inside the piece's footprint (handles and screens may stand a few cm proud) and its height", () => {
  for (const o of sample) {
    for (const p of partsFor(o)) {
      expect(Math.abs(p.x) + p.w / 2).toBeLessThanOrEqual(o.w / 2 + 0.06);
      expect(Math.abs(p.z) + p.d / 2).toBeLessThanOrEqual(o.d / 2 + 0.06);
      expect(p.y + p.h).toBeLessThanOrEqual(o.h + 0.7);
      expect(p.y).toBeGreaterThanOrEqual(0);
    }
  }
});

test("no piece needs more than eight parts, to keep draw calls down", () => {
  for (const o of sample) expect(partsFor(o).length).toBeLessThanOrEqual(8);
});

test("a bed's headboard is at its back and as tall as the bed", () => {
  const bed = sample.find((o) => o.type === "bed")!;
  const headboard = partsFor(bed).find((p) => p.z < 0 && p.h === bed.h)!;
  expect(headboard.z).toBeCloseTo(-bed.d / 2 + 0.05);
});
