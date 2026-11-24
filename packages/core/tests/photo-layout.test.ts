import { readFileSync } from "node:fs";
import { expect, test } from "vitest";
import { importRoomPlan } from "../src/importers/roomplan";
import { getWalls } from "../src/room";
import { parseScene } from "../src/schema";

// Written by tools/capture-worker/tests/test_layout.py from a synthetic 4.2 x 3.6 m room photographed at an angle.
const fixture: unknown = JSON.parse(readFileSync(new URL("./fixtures/photo-layout-rect.json", import.meta.url), "utf8"));

test("the photo worker's output goes through the RoomPlan importer unchanged and keeps the room's real size", () => {
  const { scene, notes } = importRoomPlan(fixture, "Bedroom");
  expect(parseScene(scene)).not.toBeNull();
  expect(notes.some((n) => n.includes("bounding rectangle"))).toBe(false); // the walls closed on their own
  const lengths = getWalls(scene.room).map((w) => w.length).sort((a, b) => a - b);
  expect(lengths[0]).toBeCloseTo(3.6, 1);
  expect(lengths[1]).toBeCloseTo(3.6, 1);
  expect(lengths[2]).toBeCloseTo(4.2, 1);
  expect(lengths[3]).toBeCloseTo(4.2, 1);
  expect(scene.room.height).toBeCloseTo(2.7, 1);
});
