import { describe, expect, test } from "vitest";
import { frontDir, obbInsidePolygon, obbOf, obbOverlap } from "../src/geometry";
import { analyzeClearance } from "../src/layout/clearance";
import { resolvePlacement } from "../src/layout/placement";
import { checkPose, findGeometryIssues } from "../src/layout/validate";
import { addObject, applyLayout, arrangeObjectsAround, improve, moveObject, removeObject, replaceObject, rotateObject, setLocked } from "../src/ops";
import { RECT_WALL, getWalls, makeOpening } from "../src/room";
import { createScene, getObject, objectFromCatalogId } from "../src/scene";
import { emptyRoom, rectangularRoom, sampleLivingRoom } from "../src/templates";
import type { Scene } from "../src/types";

function room(width: number, length: number, openings = [makeOpening("door", RECT_WALL.south, 0.3, 0.9)]): Scene {
  return emptyRoom({ name: "Test", width, length, height: 2.8, openings });
}

function put(scene: Scene, catalogId: string, x: number, z: number, rotation = 0): Scene {
  scene.objects.push(objectFromCatalogId(scene, catalogId, { x, z, rotation }));
  return scene;
}

describe("geometry", () => {
  test("rotation 0 faces south, 90 east", () => {
    expect(frontDir(0).z).toBeCloseTo(1);
    expect(frontDir(90).x).toBeCloseTo(1);
    expect(frontDir(180).z).toBeCloseTo(-1);
  });

  test("rotated boxes overlap and separate", () => {
    const a = obbOf({ x: 0, z: 0, rotation: 0 }, 2, 1);
    const b = obbOf({ x: 1.4, z: 0, rotation: 90 }, 2, 1);
    expect(obbOverlap(a, b)).toBeGreaterThan(0);
    const c = obbOf({ x: 1.6, z: 0, rotation: 90 }, 2, 1);
    expect(obbOverlap(a, c)).toBe(0);
  });

  test("box in the notch of an L-shaped room is outside", () => {
    // L-shape: 4x4 square missing its south-east 2x2 quarter.
    const L = [
      { x: 0, z: 0 },
      { x: 4, z: 0 },
      { x: 4, z: 2 },
      { x: 2, z: 2 },
      { x: 2, z: 4 },
      { x: 0, z: 4 },
    ];
    expect(obbInsidePolygon(obbOf({ x: 1, z: 1, rotation: 0 }, 1, 1), L)).toBe(true);
    expect(obbInsidePolygon(obbOf({ x: 2, z: 2, rotation: 0 }, 1, 1), L)).toBe(false);
    expect(obbInsidePolygon(obbOf({ x: 3, z: 3, rotation: 0 }, 0.5, 0.5), L)).toBe(false);
  });
});

describe("room", () => {
  test("rectangle walls are named by compass side and face inward", () => {
    const walls = getWalls(room(5, 4).room);
    expect(walls.map((w) => w.id)).toEqual(["north", "east", "south", "west"]);
    expect(walls.map((w) => w.facingRotation)).toEqual([0, 270, 180, 90]);
  });

  test("L-shaped room gets numbered duplicate sides", () => {
    const s = createScene({
      ...rectangularRoom({ name: "L", width: 4, length: 4, height: 2.8, openings: [] }),
      corners: [
        { x: 0, z: 0 },
        { x: 4, z: 0 },
        { x: 4, z: 2 },
        { x: 2, z: 2 },
        { x: 2, z: 4 },
        { x: 0, z: 4 },
      ],
    });
    const ids = getWalls(s.room).map((w) => w.id);
    expect(ids).toContain("south_1");
    expect(ids).toContain("east_2");
  });
});

describe("validation", () => {
  test("detects overlap, wall clipping and a blocked door", () => {
    const s = room(4, 3);
    put(s, "sofa_3_seat", 2, 1.5);
    put(s, "armchair", 2.5, 1.6);
    put(s, "bookshelf", -0.1, 1, 90);
    // Door on the south wall spans x 2.8..3.7 (offset measured from the east end).
    put(s, "side_table", 3.2, 2.7);
    const kinds = findGeometryIssues(s).map((i) => i.kind);
    expect(kinds).toContain("collision");
    expect(kinds).toContain("outside_room");
    expect(kinds).toContain("blocks_door");
  });

  test("chairs may tuck under a table but not into a sofa", () => {
    const s = room(4, 4);
    put(s, "dining_table_4", 2, 2);
    put(s, "dining_chair", 2, 2.55, 180);
    put(s, "sofa_2_seat", 2, 0.6);
    const chair = s.objects[1];
    expect(checkPose(s, chair, chair).ok).toBe(true);
    expect(checkPose(s, chair, { x: 2, z: 1.2, rotation: 0 }).ok).toBe(false);
  });
});

describe("clearance", () => {
  test("measures a corridor between two wardrobes", () => {
    // Wardrobes facing each other across an 80 cm gap.
    const s = room(4, 3, [makeOpening("door", RECT_WALL.west, 1.0, 0.9)]);
    put(s, "wardrobe_4", 2.5, 0.3, 0);
    put(s, "wardrobe_4", 2.5, 1.7, 180);
    const r = analyzeClearance(s);
    const a = r.access.find((x) => x.objectId === "wardrobe_1")!;
    expect(a.width).toBeGreaterThan(0.75);
    expect(a.width).toBeLessThan(0.85);
  });

  test("names the two objects forming a pinch", () => {
    const s = room(4, 3.6);
    put(s, "bed_queen", 2.0, 1.075, 0);
    put(s, "desk", 0.3, 2.9, 90);
    put(s, "office_chair", 0.85, 2.9, 270);
    const r = analyzeClearance(s);
    const desk = r.access.find((a) => a.objectId === "desk_1")!;
    expect(desk.width).toBeCloseTo(0.45, 1);
    expect(desk.between).toEqual(expect.arrayContaining(["bed_1", "office_chair_1"]));
    expect(r.issues.some((i) => i.objectIds.includes("desk_1"))).toBe(true);
  });

  test("an object walled in has no access", () => {
    const s = room(4, 3, [makeOpening("door", RECT_WALL.east, 1.0, 0.9)]);
    put(s, "armchair", 0.45, 1.5, 90);
    put(s, "bookshelf", 1.1, 1.5, 90);
    put(s, "bookshelf", 0.45, 0.6, 0);
    put(s, "bookshelf", 0.45, 2.4, 180);
    const r = analyzeClearance(s);
    const chair = r.access.find((a) => a.objectId === "armchair_1")!;
    expect(chair.width).toBeLessThan(0.45);
    expect(r.issues.find((i) => i.objectIds.includes("armchair_1"))?.kind).toBe("no_access");
  });

  test("a narrow door does not flag every object", () => {
    const s = room(5, 4, [makeOpening("door", RECT_WALL.south, 0.5, 0.7)]);
    put(s, "sofa_3_seat", 2.5, 0.45, 0);
    const r = analyzeClearance(s);
    expect(r.access[0].width).toBeGreaterThan(0.8);
    expect(r.issues).toHaveLength(0);
  });
});

describe("placement", () => {
  test("against a wall: back to the wall, facing into the room", () => {
    const s = room(5, 4);
    put(s, "sofa_3_seat", 2.5, 2, 0);
    const res = moveObject(s, "sofa_1", { type: "against_wall", wall: "west" });
    expect(res.ok).toBe(true);
    const sofa = getObject(res.scene, "sofa_1")!;
    expect(sofa.rotation).toBe(90);
    expect(sofa.x).toBeCloseTo(0.45, 2);
    expect(sofa.z).toBeCloseTo(2, 1);
  });

  test("against a wall slides away from the door swing", () => {
    // South wall offsets run from the east end: this door spans x 2.5..3.4,
    // right where a centred sofa would go.
    const s = room(5, 4, [makeOpening("door", RECT_WALL.south, 1.6, 0.9)]);
    put(s, "sofa_3_seat", 2.5, 2);
    const res = moveObject(s, "sofa_1", { type: "against_wall", wall: "south" });
    expect(res.ok).toBe(true);
    const sofa = getObject(res.scene, "sofa_1")!;
    expect(sofa.rotation).toBe(180);
    expect(sofa.x + 1.1).toBeLessThanOrEqual(2.5 + 1e-6);
    expect(findGeometryIssues(res.scene)).toHaveLength(0);
  });

  test("a sofa too long for the space beside a door is refused", () => {
    const s = room(4, 4, [makeOpening("door", RECT_WALL.south, 1.55, 0.9)]);
    put(s, "sofa_3_seat", 2, 2);
    const res = moveObject(s, "sofa_1", { type: "against_wall", wall: "south" });
    expect(res.ok).toBe(false);
    expect(res.message).toMatch(/door_1/);
  });

  test("next_to front keeps the coffee-table gap", () => {
    const s = room(5, 4);
    put(s, "sofa_3_seat", 2.5, 0.45, 0);
    put(s, "coffee_table_rect", 1, 3);
    const res = moveObject(s, "coffee_table_1", { type: "next_to", target: "sofa_1", side: "front" });
    expect(res.ok).toBe(true);
    const t = getObject(res.scene, "coffee_table_1")!;
    // Sofa front at z = 0.9, gap 0.45, half depth 0.3 -> 1.65.
    expect(t.z).toBeCloseTo(1.65, 1);
    expect(t.x).toBeCloseTo(2.5, 1);
  });

  test("reports why nothing fits", () => {
    const s = room(2, 2);
    put(s, "sofa_3_seat", 1, 1);
    const res = resolvePlacement(s, s.objects[0], { type: "against_wall", wall: "north" });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.reason).toMatch(/too short/);
  });

  test("nudge stops before a collision", () => {
    const s = room(5, 4);
    put(s, "armchair", 1, 2);
    put(s, "bookshelf", 2.5, 2, 90);
    const res = moveObject(s, "armchair_1", { type: "nudge", direction: "east", distance_m: 2 });
    expect(res.ok).toBe(true);
    const chair = getObject(res.scene, "armchair_1")!;
    expect(chair.x).toBeLessThan(2.5 - 0.175 - 0.42);
    expect(res.message).toMatch(/of the 200 cm asked/);
  });

  test("locked objects refuse to move", () => {
    const s = setLocked(sampleLivingRoom(), "tv_unit_1", true).scene;
    const res = moveObject(s, "tv_unit_1", { type: "against_wall", wall: "west" });
    expect(res.ok).toBe(false);
    expect(res.message).toMatch(/locked/);
  });
});

describe("ops", () => {
  test("applyLayout lifts pieces so they can swap places", () => {
    const s = room(5, 4);
    put(s, "sofa_3_seat", 2.5, 0.45, 0); // north wall
    put(s, "sideboard", 2.5, 3.775, 180); // south wall
    const res = applyLayout(s, [
      { object_id: "sideboard_1", placement: { type: "against_wall", wall: "north" } },
      { object_id: "sofa_1", placement: { type: "against_wall", wall: "south" } },
    ]);
    expect(res.ok).toBe(true);
    expect(getObject(res.scene, "sideboard_1")!.z).toBeLessThan(1);
    expect(getObject(res.scene, "sofa_1")!.z).toBeGreaterThan(3);
    expect(findGeometryIssues(res.scene).filter((i) => i.severity === "error")).toHaveLength(0);
  });

  test("arranges chairs around a dining table without collisions", () => {
    const s = room(5, 5);
    put(s, "dining_table_6", 2.5, 2.5);
    const res = arrangeObjectsAround(s, "dining_table_1", [], { catalog_id: "dining_chair", count: 6 });
    expect(res.ok).toBe(true);
    const chairs = res.scene.objects.filter((o) => o.type === "dining_chair");
    expect(chairs).toHaveLength(6);
    expect(findGeometryIssues(res.scene).filter((i) => i.severity === "error")).toHaveLength(0);
    // Every chair faces the table.
    for (const c of chairs) {
      const f = frontDir(c.rotation);
      const toTable = { x: 2.5 - c.x, z: 2.5 - c.z };
      expect(f.x * toTable.x + f.z * toTable.z).toBeGreaterThan(0);
    }
  });

  test("add, replace, rotate and remove", () => {
    let s = room(5, 4);
    const added = addObject(s, "sofa_2_seat", { type: "against_wall", wall: "north" });
    expect(added.ok).toBe(true);
    s = added.scene;
    const replaced = replaceObject(s, "sofa_1", "sofa_3_seat");
    expect(replaced.ok).toBe(true);
    const sofa = getObject(replaced.scene, "sofa_1")!;
    expect(sofa.w).toBe(2.2);
    expect(sofa.z).toBeCloseTo(0.45, 2);
    const rotated = rotateObject(replaced.scene, "sofa_1", { facing: "east" });
    expect(rotated.ok).toBe(true);
    expect(getObject(rotated.scene, "sofa_1")!.rotation).toBe(90);
    expect(findGeometryIssues(rotated.scene)).toHaveLength(0);
    const removed = removeObject(rotated.scene, "sofa_1");
    expect(removed.scene.objects).toHaveLength(0);
  });

  test("improve widens a tight walkway without new problems", () => {
    const s = room(4, 3, [makeOpening("door", RECT_WALL.west, 1.0, 0.9)]);
    put(s, "wardrobe_4", 2.5, 0.3, 0);
    put(s, "armchair", 2.5, 1.55, 180);
    const before = analyzeClearance(s).access.find((a) => a.objectId === "wardrobe_1")!.width;
    const res = improve(s, {});
    expect(res.ok).toBe(true);
    const after = analyzeClearance(res.scene).access.find((a) => a.objectId === "wardrobe_1")!.width;
    expect(after).toBeGreaterThan(before);
    expect(findGeometryIssues(res.scene).filter((i) => i.severity === "error")).toHaveLength(0);
  });
});

describe("adding from the catalog", () => {
  test("a new piece is placed where it can be used", () => {
    const s = sampleLivingRoom();
    const res = addObject(s, "accent_chair");
    expect(res.ok).toBe(true);
    const id = res.changed[0];
    const access = analyzeClearance(res.scene).access.find((a) => a.objectId === id)!;
    expect(access.width).toBeGreaterThanOrEqual(0.45);
    expect(findGeometryIssues(res.scene).filter((i) => i.objectIds.includes(id))).toEqual([]);
  });
});
