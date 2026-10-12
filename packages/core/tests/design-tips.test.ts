import { describe, expect, test } from "vitest";
import { createScene, objectFromCatalogId } from "../src/scene";
import { designTips, DESIGN_RULES } from "../src/rules/design-tips";
import { rectangularRoom } from "../src/templates";
import type { Scene } from "../src/types";

const room = () => rectangularRoom({ name: "Living", width: 6, length: 6, height: 2.6, openings: [] });
const put = (s: Scene, catalogId: string, x: number, z: number, rotation = 0): Scene => ({ ...s, objects: [...s.objects, objectFromCatalogId(s, catalogId, { x, z, rotation })] });
const empty = () => createScene(room());
const tip = (s: Scene, id: string) => designTips(s).find((t) => t.id === id);

// Rotation 0 faces south (+z). A sofa at z=1 faces a coffee table to its south.
const sofaAndTable = (tableZ: number) => put(put(empty(), "sofa_3_seat", 3, 1, 0), "coffee_table_rect", 3, tableZ);

describe("coffee table gap", () => {
  test("a 40 cm gap between the sofa's front and the table is fine", () => {
    const t = tip(sofaAndTable(1 + 0.45 + 0.4 + 0.3), "coffee_table_gap")!; // sofa half-depth 0.45, table half-depth 0.3
    expect(t.ok).toBe(true);
    expect(t.value).toBeCloseTo(0.4, 2);
  });

  test("a table pushed against the sofa, or far away, is flagged with the measured gap", () => {
    expect(tip(sofaAndTable(1 + 0.45 + 0.1 + 0.3), "coffee_table_gap")!.ok).toBe(false);
    expect(tip(sofaAndTable(1 + 0.45 + 1.2 + 0.3), "coffee_table_gap")).toMatchObject({ ok: false, ideal: DESIGN_RULES.coffee_table_gap.range });
  });

  test("a sofa that does not face the table gives no tip about it", () => {
    expect(tip(put(put(empty(), "sofa_3_seat", 3, 1, 180), "coffee_table_rect", 3, 2.2), "coffee_table_gap")).toBeUndefined();
  });
});

describe("TV distance", () => {
  const tv = (sofaZ: number) => put(put(empty(), "tv_unit", 3, 0.3, 0), "sofa_3_seat", 3, sofaZ, 180); // TV unit faces south; sofa faces north to it

  test("a 55 inch TV (1.40 m diagonal) is comfortable 2.1 to 3.5 m away", () => {
    expect(tip(tv(0.3 + 2.8), "tv_distance")!.ok).toBe(true);
    expect(tip(tv(0.3 + 1.2), "tv_distance")).toMatchObject({ ok: false });
    expect(tip(tv(0.3 + 4.2), "tv_distance")).toMatchObject({ ok: false });
  });

  test("the range scales with the screen: a 65 inch TV wants more room", () => {
    const big = put(put(empty(), "tv_unit_large", 3, 0.3, 0), "sofa_3_seat", 3, 0.3 + 2.2, 180);
    const small = put(put(empty(), "tv_unit", 3, 0.3, 0), "sofa_3_seat", 3, 0.3 + 2.2, 180);
    expect(tip(small, "tv_distance")!.ok).toBe(true);
    expect(tip(big, "tv_distance")!.ok).toBe(false); // 65 inch needs 2.5 m or more
  });
});

test("seats that face each other too far apart are flagged; close ones pass", () => {
  const pair = (z2: number) => put(put(empty(), "sofa_3_seat", 3, 1, 0), "armchair", 3, z2, 180);
  expect(tip(pair(2.6), "conversation_distance")!.ok).toBe(true);
  expect(tip(pair(5.2), "conversation_distance")).toMatchObject({ ok: false });
});

describe("rug under seating", () => {
  const withRug = (rugZ: number) => put(put(empty(), "sofa_3_seat", 3, 2, 0), "rug_bedroom", 3, rugZ);

  test("the sofa's front legs on the rug pass; a rug that stops short of the front fails", () => {
    expect(tip(withRug(2.6), "rug_under_seating")!.ok).toBe(true); // rug covers the sofa's front edge (z=2.45)
    expect(tip(withRug(1.2), "rug_under_seating")).toMatchObject({ ok: false }); // rug behind the sofa, only touching its back
  });

  test("with no rug under the sofa there is nothing to say", () => {
    expect(tip(withRug(4.5), "rug_under_seating")).toBeUndefined();
  });
});

test("a room with none of these pieces has no tips", () => expect(designTips(empty())).toEqual([]));

test("the scene summary handed to the AI carries each tip with its measured value and source, so the AI quotes the engine", async () => {
  const { summarizeScene } = await import("../src/summary");
  const s = sofaAndTable(1 + 0.45 + 0.1 + 0.3);
  const summary = summarizeScene(s);
  expect(summary.design_tips).toEqual([expect.objectContaining({ rule: "coffee_table_gap", meets_rule: false, measured_m: 0.1, comfortable_m: [0.3, 0.55] })]);
  expect(summary.design_tips[0].source).toContain("common practice");
});

describe("dining chair pull-out", () => {
  // Chair at rotation 0 faces south, so its back (the pull-out side) is north.
  test("a chair with 75 cm clear behind it passes; one against a wall fails", () => {
    expect(tip(put(empty(), "dining_chair", 3, 3, 0), "dining_pullout")!.ok).toBe(true);
    expect(tip(put(empty(), "dining_chair", 3, 0.25, 0), "dining_pullout")!.ok).toBe(false);
  });

  test("a sofa right behind the chair fails it", () => {
    expect(tip(put(put(empty(), "dining_chair", 3, 3, 0), "sofa_3_seat", 3, 2.2, 0), "dining_pullout")!.ok).toBe(false);
  });
});

describe("bed foot", () => {
  test("60 cm free at the foot of the bed passes; a wall there fails", () => {
    expect(tip(put(empty(), "bed_double", 3, 2, 180), "bed_foot")!.ok).toBe(true);
    expect(tip(put(empty(), "bed_double", 3, 4.7, 0), "bed_foot")!.ok).toBe(false);
  });
});

describe("bed pair", () => {
  const bed = () => put(empty(), "bed_double", 3, 2, 180);
  test("a nightstand on one side only is flagged; both sides pass", () => {
    const one = put(bed(), "nightstand", 3 - 0.95, 1.2, 180);
    expect(tip(one, "bed_pair")!.ok).toBe(false);
    expect(tip(put(one, "nightstand", 3 + 0.95, 1.2, 180), "bed_pair")!.ok).toBe(true);
  });

  test("a single bed is not asked for two", () => expect(tip(put(empty(), "bed_single", 3, 2, 180), "bed_pair")).toBeUndefined());
});

describe("headboard under a window", () => {
  test("no window, no tip", () => expect(tip(put(empty(), "bed_double", 3, 2, 180), "headboard_window")).toBeUndefined());
});

test("improve moves a coffee table jammed against the sofa into the comfortable gap", async () => {
  const { improveLayout } = await import("../src/layout/improve");
  const r = improveLayout(sofaAndTable(1 + 0.45 + 0.1 + 0.3), { budgetMs: 2000 });
  expect(tip(r.scene, "coffee_table_gap")!.ok).toBe(true);
});
