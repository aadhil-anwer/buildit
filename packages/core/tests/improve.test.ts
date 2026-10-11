import { describe, expect, test } from "vitest";
import { improveLayout, improveLayoutSliced } from "../src/layout/improve";
import { RECT_WALL, makeOpening } from "../src/room";
import { objectFromCatalogId } from "../src/scene";
import { emptyRoom } from "../src/templates";
import type { Scene } from "../src/types";

// A wardrobe overlapping the edge of the south door's swing: small moves can fix it.
function blocked(): Scene {
  const s = emptyRoom({ name: "T", width: 4, length: 4, height: 2.8, openings: [makeOpening("door", RECT_WALL.south, 0.3, 0.9)] });
  return { ...s, objects: [objectFromCatalogId(s, "wardrobe_3", { x: 2.3, z: 3.6, rotation: 0 })] };
}

describe("excluding pieces (show another option)", () => {
  test("a piece that is excluded never moves", () => {
    const res = improveLayout(blocked(), { excludeIds: ["wardrobe_1"] });
    expect(res.moved).toEqual([]);
  });

  test("the first option moves the wardrobe; a second option without it moves nothing else", () => {
    const first = improveLayout(blocked());
    expect(first.moved.map((m) => m.id)).toEqual(["wardrobe_1"]);
    const second = improveLayout(blocked(), { excludeIds: first.moved.map((m) => m.id) });
    expect(second.moved.map((m) => m.id)).not.toContain("wardrobe_1");
  });
});

const tick = () => Promise.resolve();

describe("time slicing", () => {
  test("gives the same answer as the blocking version", async () => {
    const [sync, sliced] = [improveLayout(blocked()), await improveLayoutSliced(blocked(), {}, { pause: tick })];
    expect(sliced.moved).toEqual(sync.moved);
    expect(sliced.after.cost).toBeCloseTo(sync.after.cost, 6);
  });

  test("pauses so the UI thread is never blocked for long", async () => {
    const stamps: number[] = [];
    const pause = () => {
      stamps.push(Date.now());
      return Promise.resolve();
    };
    const start = Date.now();
    await improveLayoutSliced(blocked(), {}, { sliceMs: 2, pause });
    const stretches = [start, ...stamps].map((t, i, all) => t - (all[i - 1] ?? t)).slice(1);
    expect(stamps.length).toBeGreaterThan(0);
    expect(Math.max(...stretches)).toBeLessThan(100); // generous for slow CI; the budget on a phone is 8 ms
  });

  test("the time budget still ends the search", async () => {
    const res = await improveLayoutSliced(blocked(), { budgetMs: 0 }, { pause: tick });
    expect(res.moved).toEqual([]);
  });
});
