import { describe, expect, test } from "vitest";
import { executeTool, SYSTEM_PROMPT, TOOL_DEFS, TOOL_NAMES } from "../src/agent";
import { design } from "../src/design.generated";
import { sampleBedroom, sampleLivingRoom } from "../src/templates";

type Json = { type?: string; properties?: Record<string, Json>; items?: Json; anyOf?: Json[]; oneOf?: Json[]; description?: string; enum?: unknown[] };

/** Every property in a JSON schema, with its path, descending into objects, arrays and unions. */
function properties(schema: Json, path = ""): { path: string; name: string; schema: Json }[] {
  const own = Object.entries(schema.properties ?? {}).flatMap(([name, s]) => [{ path: `${path}.${name}`, name, schema: s }, ...properties(s, `${path}.${name}`)]);
  const nested = [schema.items, ...(schema.anyOf ?? []), ...(schema.oneOf ?? [])].filter((s): s is Json => !!s).flatMap((s) => properties(s, path));
  return [...own, ...nested];
}
const all = TOOL_DEFS.flatMap((tool) => properties(tool.inputSchema as Json, tool.name));

describe("the AI never supplies coordinates, sizes, prices or colour codes", () => {
  test("no tool has a field for a position, size, price or colour code", () => {
    const banned = /^(x|y|z|position|coordinates?|width|depth|height|size|width_m|depth_m|height_m|price|cost|colou?r|hex|rgb|meters|minWalkway|target_walkway_m)$/i;
    expect(all.filter((p) => banned.test(p.name)).map((p) => p.path)).toEqual([]);
  });

  test("no tool takes a free colour string: colours are named from the design palette", () => {
    for (const tool of TOOL_NAMES) {
      const named = TOOL_DEFS.find((t) => t.name === tool)!;
      expect(JSON.stringify(named.inputSchema)).not.toMatch(/#[0-9a-f]{6}|\^#/i);
    }
    const colourFields = all.filter((p) => /^(set_color|set_room_finish|restyle_room|add_object)\.(palette|wall|floor|style)$/.test(p.path));
    expect(colourFields.length).toBeGreaterThan(0);
    for (const f of colourFields) expect(f.schema.enum ?? f.schema.anyOf, f.path).toBeTruthy();
  });

  test("every number the model can send is a distance or angle the person gave, or a count", () => {
    const numeric = all.filter((p) => p.schema.type === "number" || p.schema.type === "integer" || p.schema.anyOf?.some((s) => s.type === "number"));
    const allowed = new Set(["gap_m", "distance_m", "by_degrees", "add_count"]);
    expect(numeric.filter((p) => !allowed.has(p.name)).map((p) => p.path)).toEqual([]);
    for (const p of numeric.filter((p) => p.name !== "add_count")) expect(p.schema.description, p.path).toMatch(/person gave|only if/i);
  });

  test("there is no tool that resizes a piece or changes the walkway rule", () => {
    expect(TOOL_NAMES).not.toContain("resize_object");
    expect(TOOL_NAMES).not.toContain("set_min_walkway");
  });

  test("the system prompt names palettes, not colour codes, and forbids quoting numbers from memory", () => {
    expect(SYSTEM_PROMPT).not.toMatch(/#[0-9a-f]{6}/i);
    expect(SYSTEM_PROMPT).toMatch(/Never invent or quote numbers/);
    for (const name of Object.keys(design.materials.furniture)) expect(SYSTEM_PROMPT).toContain(name);
  });
});

describe("executeTool", () => {
  test("a named colour becomes the design palette's colour", () => {
    const scene = sampleBedroom();
    const bed = scene.objects.find((o) => o.type === "bed")!;
    const out = executeTool(scene, "set_color", { object_ids: [bed.id], palette: "clay" });
    expect(out.ok).toBe(true);
    expect(out.scene.objects.find((o) => o.id === bed.id)!.color).toBe(design.materials.furniture.clay);
  });

  test("a hex code or an unknown palette name is refused, the scene untouched", () => {
    const scene = sampleBedroom();
    const out = executeTool(scene, "set_color", { object_ids: [scene.objects[0].id], palette: "#ff0000" });
    expect(out.ok).toBe(false);
    expect(out.scene).toBe(scene);
  });

  test("a style restyles without moving anything", () => {
    const scene = sampleLivingRoom();
    const out = executeTool(scene, "restyle_room", { style: "japan" });
    expect(out.ok).toBe(true);
    expect(out.scene.objects.map((o) => [o.x, o.z])).toEqual(scene.objects.map((o) => [o.x, o.z]));
  });

  test("an unknown tool or a bad input is reported to the model, not thrown", () => {
    const scene = sampleBedroom();
    expect(executeTool(scene, "teleport", {}).ok).toBe(false);
    expect(executeTool(scene, "move_object", { object_id: "bed_1" }).ok).toBe(false);
    expect(executeTool(scene, "resize_object", { object_id: "bed_1", width_m: 3 }).ok).toBe(false);
  });

  test("a move the engine refuses comes back as FAILED, and the scene is unchanged", () => {
    const scene = sampleBedroom();
    const bed = scene.objects.find((o) => o.type === "bed")!;
    const out = executeTool(scene, "move_object", { object_id: bed.id, placement: { type: "against_wall", wall: "nowhere" } });
    expect(out.ok).toBe(false);
    expect(out.content).toMatch(/^FAILED/);
    expect(out.scene).toBe(scene);
  });
});
