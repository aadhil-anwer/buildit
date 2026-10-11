import { describe, expect, test } from "vitest";
import { design } from "../src/design.generated";
import { restyle, STYLE_KEYS } from "../src/styles";
import { sampleBedroom } from "../src/templates";

const moved = (a: { objects: { id: string; x: number; z: number; rotation: number }[] }) => a.objects.map((o) => [o.id, o.x, o.z, o.rotation]);

describe("restyle", () => {
  test("offers the design's five styles", () => expect(STYLE_KEYS).toEqual(["scandi", "japan", "arab", "modern", "classic"]));

  test("changes colours and finishes but never moves anything", () => {
    const before = sampleBedroom();
    const res = restyle(before, "japan");
    expect(res.ok).toBe(true);
    expect(moved(res.scene)).toEqual(moved(before));
    expect(res.scene.room.wallColor).toBe(design.styles.japan.wall);
    expect(res.scene.room.floorColor).toBe(design.materials.floor[design.styles.japan.floor as keyof typeof design.materials.floor]);
    expect(res.scene.objects.find((o) => o.type === "bed")?.color).toBe(design.styles.japan.items.bed);
  });

  test("reports which pieces changed, and leaves types the style does not cover alone", () => {
    const before = sampleBedroom();
    const res = restyle(before, "modern");
    expect(res.changed).toEqual(expect.arrayContaining(["bed_1", "wardrobe_1"]));
    expect(res.scene.objects.find((o) => o.type === "office_chair")?.color).toBe(before.objects.find((o) => o.type === "office_chair")?.color);
  });

  test("restyling twice with the same style changes no pieces", () => expect(restyle(restyle(sampleBedroom(), "arab").scene, "arab").changed).toEqual([]));
});
