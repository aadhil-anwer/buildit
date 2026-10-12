import { describe, expect, test } from "vitest";
import { findNoFit } from "../src/agent";
import { largestFree } from "../src/layout/free-space";
import { createScene, objectFromCatalogId } from "../src/scene";
import { rectangularRoom, sampleBedroom } from "../src/templates";
import type { Scene } from "../src/types";
import { call, collect, finish, say, scriptedModel, use } from "./agent-helpers";

const small = (): Scene => createScene(rectangularRoom({ name: "Study", width: 3.2, length: 3, height: 2.6, openings: [] }));
const tiny = (): Scene => createScene(rectangularRoom({ name: "Nook", width: 2.4, length: 2, height: 2.6, openings: [] }));
const put = (s: Scene, id: string, x: number, z: number): Scene => ({ ...s, objects: [...s.objects, objectFromCatalogId(s, id, { x, z, rotation: 0 })] });

describe("findNoFit", () => {
  test("a table for ten does not fit a small room: it says what it needs, what there is, and a smaller one that does fit", () => {
    const r = findNoFit(small(), "dining_table_10")!;
    expect(r.type).toBe("dining_table");
    expect(r.need).toEqual({ w: 4.5, d: 2.6 }); // 3.0 x 1.1 plus 75 cm to pull chairs out on each side
    expect(r.largest.w).toBeGreaterThan(2.9);
    expect(r.alternative).toBeDefined();
    expect(r.alternative!.catalogId).not.toBe("dining_table_10");
    expect(r.alternative!.w + 1.5).toBeLessThanOrEqual(Math.max(r.largest.w, r.largest.d));
  });

  test("a piece that does fit gives nothing to explain", () => {
    expect(findNoFit(small(), "side_table")).toBeNull();
    expect(findNoFit(small(), "no_such_item")).toBeNull();
  });

  test("it names the one movable piece whose removal would free the most floor, and not a locked one", () => {
    const s = put(put(small(), "wardrobe_4", 1.6, 0.3), "bookshelf", 3.0, 2.0);
    const r = findNoFit(s, "dining_table_10")!;
    expect(r.without).toBeDefined();
    expect(r.without!.w * r.without!.d).toBeGreaterThan(r.largest.w * r.largest.d);
    const lockedAll = { ...s, objects: s.objects.map((o) => ({ ...o, locked: true })) };
    expect(findNoFit(lockedAll, "dining_table_10")!.without).toBeUndefined();
  });

  test("its numbers are the engine's own measurement of the room", () => {
    const s = small();
    const free = largestFree(s);
    expect(findNoFit(s, "dining_table_10")!.largest).toEqual({ w: Math.round(free.w * 10) / 10, d: Math.round(free.d * 10) / 10 });
  });
});

describe("in the loop", () => {
  test("a failed add that cannot fit ends with the measured reason, and the room is unchanged", async () => {
    const scene = tiny();
    const { model } = scriptedModel([use(call("add_object", { catalog_id: "dining_table_10" })), say("It will not fit.")]);
    const done = finish(await collect(model, { scene, message: "fit a dining table for 10" }))!;
    expect(done.verdict).toBe("unchanged");
    expect(done.nofit).toMatchObject({ catalogId: "dining_table_10", type: "dining_table" });
    expect(done.scene).toBe(scene);
  });

  test("a request that worked has no nofit", async () => {
    const { model } = scriptedModel([use(call("add_object", { catalog_id: "side_table" })), say("Added.")]);
    expect(finish(await collect(model, { scene: sampleBedroom(), message: "add a side table" }))!.nofit).toBeNull();
  });
});
