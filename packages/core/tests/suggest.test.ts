import { describe, expect, test } from "vitest";
import { roomCheck } from "../src/check";
import { design } from "../src/design.generated";
import { nextSteps, suggestions, applyChange } from "../src/suggest";
import { RECT_WALL, makeOpening } from "../src/room";
import { objectFromCatalogId } from "../src/scene";
import { emptyRoom, sampleBedroom } from "../src/templates";
import type { Scene } from "../src/types";

const withObject = (s: Scene, id: string, x: number, z: number): Scene => ({ ...s, objects: [...s.objects, objectFromCatalogId(s, id, { x, z, rotation: 0 })] });
const idsOf = (s: Scene, dismissed: string[] = []) => suggestions(s, dismissed).map((x) => x.id);

describe("suggestions (the side card)", () => {
  test("the sample bedroom has a desk but no lamp, a bed but no rug", () => {
    const bedroom = sampleBedroom();
    bedroom.objects = bedroom.objects.filter((o) => o.type !== "rug");
    expect(idsOf(bedroom)).toEqual(["lamp", "rug"]);
  });

  test("a floor lamp near the desk is applied through the engine", () => {
    const bedroom = sampleBedroom();
    const lamp = suggestions(bedroom, []).find((s) => s.id === "lamp");
    const res = applyChange(bedroom, lamp!.change);
    expect(res.ok).toBe(true);
    expect(res.scene.objects.some((o) => o.type === "floor_lamp")).toBe(true);
  });

  test("chalk walls suggest sand and a sage headboard suggests clay", () => {
    const room = emptyRoom({ name: "T", width: 4, length: 4, height: 2.8, openings: [makeOpening("door", RECT_WALL.south, 0.3, 0.9)] });
    const chalk = { ...room, room: { ...room.room, wallColor: design.materials.wall.chalk } };
    const change = suggestions(chalk, []).find((s) => s.id === "wall")?.change;
    expect(change).toEqual({ op: "finish", wall: design.materials.wall.sand });
    const sage = withObject(chalk, "bed_queen", 2, 1);
    sage.objects[0].color = design.materials.furniture.sage;
    expect(suggestions(sage, []).find((s) => s.id === "headboard")?.change).toEqual({ op: "color", ids: ["bed_1"], color: design.materials.furniture.clay });
  });

  test("a dismissed suggestion does not come back, and a stocked room has none", () => {
    expect(idsOf(sampleBedroom(), ["lamp"])).not.toContain("lamp");
    const full = withObject(sampleBedroom(), "floor_lamp", 0.3, 0.3);
    expect(idsOf(full)).not.toContain("lamp");
  });
});

describe("suggested next (the Ask tab)", () => {
  const ui = { walkOn: false, unsaved: false, styled: false };
  const bedroom = sampleBedroom();
  const check = roomCheck(bedroom);

  test("the first failing rule leads, then a rug, walking space, saving, a style", () => {
    const ids = nextSteps(bedroom, check, { ...ui, unsaved: true }).map((n) => n.id);
    expect(ids).toEqual(["fix", "walk", "save"]); // bedroom already has a rug; only three are shown
  });

  test("names the rule to fix", () => expect(nextSteps(bedroom, check, ui)[0]).toEqual({ id: "fix", ruleId: "walkway" }));

  test("offers a rug when there is none, and a style when none was tried", () => {
    const bare = { ...bedroom, objects: bedroom.objects.filter((o) => o.type !== "rug") };
    expect(nextSteps(bare, roomCheck(bare), { walkOn: true, unsaved: false, styled: false }).map((n) => n.id)).toEqual(["fix", "rug", "style"]);
  });

  test("a finished room has nothing left to suggest", () => {
    const calm = roomCheck({ ...bedroom, objects: [] });
    expect(nextSteps({ ...bedroom, objects: [] }, calm, { walkOn: true, unsaved: false, styled: true }).map((n) => n.id)).toEqual(["rug"]);
  });
});
