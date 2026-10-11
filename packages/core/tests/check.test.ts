import { describe, expect, test } from "vitest";
import { roomCheck, scoreOf, widthStatus, type Rule } from "../src/check";
import { improve } from "../src/ops";
import { RECT_WALL, makeOpening } from "../src/room";
import { objectFromCatalogId } from "../src/scene";
import { emptyRoom, sampleBedroom } from "../src/templates";
import type { Scene } from "../src/types";

const room = (openings = [makeOpening("door", RECT_WALL.south, 0.3, 0.9)]) => emptyRoom({ name: "Test", width: 4, length: 4, height: 2.8, openings });
const put = (scene: Scene, catalogId: string, x: number, z: number, rotation = 0): Scene => ({
  ...scene,
  objects: [...scene.objects, objectFromCatalogId(scene, catalogId, { x, z, rotation })],
});
const status = (scene: Scene, id: string) => roomCheck(scene).rules.find((r) => r.id === id)?.status;
const rule = (id: Rule["id"], status: Rule["status"], weight: number): Rule => ({ id, status, weight, objectIds: [] });

describe("score", () => {
  test("a fail costs its weight and a tight half, times 1.4, off 100", () => {
    expect(scoreOf([rule("walkway", "fail", 10)], 150)).toBe(86);
    expect(scoreOf([rule("walkway", "tight", 10)], 150)).toBe(93);
    expect(scoreOf([rule("walkway", "pass", 10)], 150)).toBe(100);
  });
  test("a narrowest gap under 100 cm takes 3 more, and the score never goes below 0", () => {
    expect(scoreOf([], 90)).toBe(97);
    expect(scoreOf([rule("door", "fail", 80)], 150)).toBe(0);
  });
});

test.each([
  [0.95, 0.9, "pass"],
  [0.8, 0.9, "tight"],
  [0.8, 0.75, "pass"],
  [0.55, 0.9, "fail"],
])("a %f m walkway against a %f m preference is %s", (width, need, expected) => expect(widthStatus(width, need)).toBe(expected));

describe("room check", () => {
  test("lists only the rules that apply", () => {
    expect(roomCheck(room()).rules.map((r) => r.id)).toEqual(["walkway", "door"]);
    expect(roomCheck(sampleBedroom()).rules.map((r) => r.id)).toEqual(["walkway", "door", "bed", "storage", "light"]);
  });

  test("the sample bedroom: tight wardrobe and desk fail walkway and storage", () => {
    const check = roomCheck(sampleBedroom());
    expect(check.rules.map((r) => [r.id, r.status])).toEqual([
      ["walkway", "fail"], ["door", "pass"], ["bed", "pass"], ["storage", "fail"], ["light", "pass"],
    ]);
    expect(check.rules[0]).toMatchObject({ cm: 45, need: 80, objectIds: ["desk_1"] });
    expect(check.narrowest).toMatchObject({ cm: 45, objectId: "desk_1" });
    expect(check.score).toBe(75); // 100 - 1.4 * (10 + 6) - 3
  });

  test("an empty room is perfect", () => expect(roomCheck(room())).toMatchObject({ score: 100, narrowest: null }));

  test("a piece in the door's swing fails the door rule and names the piece", () => {
    const blocked = put(room(), "wardrobe_3", 3.25, 3.6); // the south door sits at x 2.8-3.7 (offsets run from the east end)
    const door = roomCheck(blocked).rules.find((r) => r.id === "door");
    expect(door).toMatchObject({ status: "fail", objectIds: ["wardrobe_1"] });
  });

  test("a tall piece in front of a window fails the light rule", () => {
    const base = room([makeOpening("door", RECT_WALL.south, 0.3, 0.9), makeOpening("window", RECT_WALL.north, 1.0, 1.6)]);
    expect(status(base, "light")).toBe("pass");
    expect(status(put(base, "wardrobe_3", 1.8, 0.3), "light")).toBe("fail");
  });

  test("the walkway preference moves the threshold", () => {
    const scene = sampleBedroom();
    const wide = { ...scene, constraints: { minWalkway: 0.4 } };
    expect(roomCheck(wide).rules[0].status).toBe("pass");
  });

  test("small automatic moves can fix a blocked door and raise the score", () => {
    const before = put(room(), "wardrobe_3", 2.3, 3.6); // overlaps only the edge of the swing
    const after = roomCheck(improve(before, {}).scene);
    expect(after.rules.find((r) => r.id === "door")?.status).toBe("pass");
    expect(after.score).toBeGreaterThan(roomCheck(before).score);
  });
});

test("skipping the walking-space overlay changes nothing but speed", async () => {
  const { analyzeClearance } = await import("../src/layout/clearance");
  const [full, lean] = [analyzeClearance(sampleBedroom()), analyzeClearance(sampleBedroom(), { overlay: false })];
  expect(lean.access).toEqual(full.access);
  expect(lean.issues).toEqual(full.issues);
  expect(lean.overlay).toHaveLength(0);
  expect(full.overlay.length).toBeGreaterThan(0);
});
