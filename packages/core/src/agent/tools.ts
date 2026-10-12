/**
 * The tools the AI designer may call. The model states intent only: wall and object ids, sides, catalog ids, palette
 * names and style names. It never supplies a coordinate, a size, a price or a colour code; the engine resolves those.
 * The one exception is a distance the person gave in their own words ("30 cm to the left"): `gap_m`, `distance_m` and
 * the walkway target. `tools-audit.test.ts` fails if any other number-bearing field appears.
 */
import { z } from "zod";
import { design } from "../design.generated";
import { FACINGS, SIDES } from "../layout/placement";
import { addObject, applyLayout, arrangeObjectsAround, improve, moveObject, removeObject, replaceObject, rotateObject, setColor, setFinish, setLocked, type OpResult } from "../ops";
import { restyle, STYLE_KEYS, type StyleKey } from "../styles";
import { layoutReport, summarizeScene } from "../summary";
import { totalSeats } from "../scene";
import type { Scene } from "../types";

const compass = ["north", "south", "east", "west"] as const;
const furniturePalette = Object.keys(design.materials.furniture) as [keyof typeof design.materials.furniture, ...(keyof typeof design.materials.furniture)[]];
const wallPalette = Object.keys(design.materials.wall) as [keyof typeof design.materials.wall, ...(keyof typeof design.materials.wall)[]];
const floorPalette = Object.keys(design.materials.floor) as [keyof typeof design.materials.floor, ...(keyof typeof design.materials.floor)[]];

const facing = z.enum(FACINGS).describe("Which way the object's front should face. into_room: away from the wall it stands against. toward_target / away_from_target / same_as_target: relative to the placement target. along_wall: side against the wall. keep: unchanged. Or a compass direction.");

const placement = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("against_wall"),
    wall: z.string().describe("Wall id from the scene, e.g. 'west' or 'north_2'."),
    slide_toward: z.enum([...compass, "center"]).optional().describe("Which end of the wall to prefer. Default: centred."),
    align_with: z.string().optional().describe("Object or opening id to line up with, e.g. put the sofa opposite tv_unit_1."),
    gap_m: z.number().min(0).max(1).optional().describe("Gap from the wall, only if the person gave one. Default 0."),
    facing: facing.optional(),
  }).describe("Back against a wall."),
  z.object({
    type: z.literal("next_to"),
    target: z.string().describe("Object id (or opening id with a compass side)."),
    side: z.enum(SIDES).describe("front/back/left/right are relative to the target object (left/right as seen by someone using it); compass sides are absolute; under is for rugs."),
    gap_m: z.number().min(-0.3).max(5).optional().describe("Distance between the two objects' edges, only if the person gave one. Otherwise leave it out and the engine uses its design defaults."),
    facing: facing.optional(),
  }).describe("Relative to another object."),
  z.object({
    type: z.literal("near"),
    target: z.string().describe("Object id, opening id (e.g. window_1), wall id, 'center', or a corner: corner_nw, corner_ne, corner_sw, corner_se."),
    facing: facing.optional(),
  }).describe("As close as possible to a target, anywhere it fits."),
  z.object({
    type: z.literal("nudge"),
    direction: z.enum([...compass, "toward_target", "away_from_target"]),
    target: z.string().optional().describe("Needed for toward_target / away_from_target."),
    distance_m: z.number().min(0).max(6).describe("A distance the person gave."),
  }).describe("Shift by a distance the person gave. Stops early if blocked and says so."),
]);

const step = z.object({ object_id: z.string(), placement });

const schemas = {
  get_layout_report: z.object({}).describe("Fresh analysis of the room: objects, positions, issues, walkway widths, seats, and the design tips with their measured values."),
  apply_layout: z.object({ steps: z.array(step).min(1).max(30).describe("Placements in order. Put anchor pieces first.") }).describe("Rearrange several objects at once. All listed objects are lifted out first, then placed in order, so they don't block each other's new spots. Best tool for 'rearrange', 'arrange for…', 'make it less cramped'."),
  move_object: z.object({ object_id: z.string(), placement }).describe("Move one object."),
  rotate_object: z.object({
    object_id: z.string(),
    by_degrees: z.number().min(-360).max(360).optional().describe("Turn by this many degrees, only if the person gave an angle (positive = counter-clockwise seen from above)."),
    facing: facing.optional(),
    target: z.string().optional().describe("Target for toward_target / away_from_target / same_as_target."),
  }).describe("Turn an object in place (shifts slightly if it would otherwise collide)."),
  add_object: z.object({
    catalog_id: z.string().describe("Id from the catalog."),
    placement: placement.optional().describe("Where to put it. Omit to let the engine find free space near the centre."),
    palette: z.enum(furniturePalette).optional().describe("A named colour from the design palette."),
  }).describe("Add a new piece from the catalog."),
  remove_object: z.object({ object_id: z.string() }).describe("Remove an object from the room."),
  replace_object: z.object({ object_id: z.string(), catalog_id: z.string() }).describe("Swap an object for another catalog item in the same spot and facing (e.g. a smaller coffee table)."),
  arrange_around: z.object({
    center_id: z.string().describe("Table or other centre object."),
    object_ids: z.array(z.string()).default([]).describe("Existing objects to seat around it."),
    add_catalog_id: z.string().optional().describe("Catalog id of extra pieces to add, e.g. dining_chair."),
    add_count: z.number().int().min(0).max(16).optional(),
  }).describe("Seat chairs or other seating evenly around a table, each facing it. Can add new chairs. The engine picks the gap."),
  improve_layout: z.object({
    only_ids: z.array(z.string()).optional().describe("Restrict which objects may move."),
  }).describe("Small automatic adjustments (moves up to ~50 cm, quarter turns) to fix collisions and widen tight walkways. Locked objects stay put."),
  set_color: z.object({ object_ids: z.array(z.string()).min(1), palette: z.enum(furniturePalette) }).describe("Recolour objects with a named colour from the design palette."),
  set_room_finish: z.object({ wall: z.enum(wallPalette).optional(), floor: z.enum(floorPalette).optional() }).describe("Change the wall or floor finish to a named one from the design palette."),
  restyle_room: z.object({ style: z.enum(STYLE_KEYS as [string, ...string[]]) }).describe("Apply a whole style (walls, floor and furniture colours together). Never moves anything."),
  lock_object: z.object({ object_id: z.string(), locked: z.boolean() }).describe("Lock an object so nothing moves it (use when the person says keep X where it is)."),
} as const;

export type ToolName = keyof typeof schemas;
export const TOOL_NAMES = Object.keys(schemas) as ToolName[];

/** What a model API needs: a name, a description and a JSON Schema for the input. */
export interface ToolDef {
  name: ToolName;
  description: string;
  inputSchema: Record<string, unknown>;
}

export const TOOL_DEFS: ToolDef[] = TOOL_NAMES.map((name) => {
  const json = z.toJSONSchema(schemas[name], { target: "draft-7", io: "input" }) as Record<string, unknown>;
  delete json.$schema;
  delete json.description;
  return { name, description: schemas[name].description ?? name, inputSchema: json };
});

const MUTATING = new Set<string>(TOOL_NAMES.filter((n) => n !== "get_layout_report"));

/** One line per problem, worst first, capped. */
function layoutStatus(scene: Scene): string {
  const report = layoutReport(scene, 0.1);
  const errors = report.issues.filter((i) => i.severity === "error");
  const warnings = report.issues.filter((i) => i.severity === "warning");
  const lines = [...errors, ...warnings].slice(0, 6).map((i) => `- ${i.severity}: ${i.message}`);
  const head = `Layout now: ${errors.length} error(s), ${warnings.length} warning(s), ${totalSeats(scene)} seats.`;
  return lines.length ? `${head}\n${lines.join("\n")}` : `${head} No problems.`;
}

export interface ToolOutcome {
  scene: Scene;
  ok: boolean;
  /** Text returned to the model. */
  content: string;
  /** Short line for the user-facing action log. */
  summary: string;
  changed: string[];
  mutating: boolean;
}

const refused = (scene: Scene, content: string, summary: string): ToolOutcome => ({ scene, ok: false, content, summary, changed: [], mutating: false });

type Input<N extends ToolName> = z.infer<(typeof schemas)[N]>;

type Run = (scene: Scene, raw: never) => OpResult;
const palette = <K extends string>(table: Record<K, string>, key: K | undefined) => (key === undefined ? undefined : table[key]);

const rotate = (scene: Scene, d: Input<"rotate_object">): OpResult => rotateObject(scene, d.object_id, { by_degrees: d.by_degrees, facing: d.facing, target: d.target });

/** Each tool's op, reading its already-validated input. */
const RUN: Record<Exclude<ToolName, "get_layout_report">, Run> = {
  apply_layout: (scene, d: Input<"apply_layout">): OpResult => applyLayout(scene, d.steps),
  move_object: (scene, d: Input<"move_object">): OpResult => moveObject(scene, d.object_id, d.placement),
  rotate_object: (scene, d: Input<"rotate_object">): OpResult => rotate(scene, d),
  add_object: (scene, d: Input<"add_object">): OpResult => addObject(scene, d.catalog_id, d.placement, palette(design.materials.furniture, d.palette)),
  remove_object: (scene, d: Input<"remove_object">): OpResult => removeObject(scene, d.object_id),
  replace_object: (scene, d: Input<"replace_object">): OpResult => replaceObject(scene, d.object_id, d.catalog_id),
  arrange_around: (scene, d: Input<"arrange_around">): OpResult => arrangeObjectsAround(scene, d.center_id, d.object_ids, d.add_catalog_id && d.add_count ? { catalog_id: d.add_catalog_id, count: d.add_count } : undefined),
  improve_layout: (scene, d: Input<"improve_layout">): OpResult => improve(scene, { onlyIds: d.only_ids }),
  set_color: (scene, d: Input<"set_color">): OpResult => setColor(scene, d.object_ids, design.materials.furniture[d.palette]),
  set_room_finish: (scene, d: Input<"set_room_finish">): OpResult => setFinish(scene, { wall_color: palette(design.materials.wall, d.wall), floor_color: palette(design.materials.floor, d.floor) }),
  restyle_room: (scene, d: Input<"restyle_room">): OpResult => restyle(scene, d.style as StyleKey),
  lock_object: (scene, d: Input<"lock_object">): OpResult => setLocked(scene, d.object_id, d.locked),
};

/** Validates the model's input, runs the tool on the engine and reports back in plain words, with the layout's status. */
export function executeTool(scene: Scene, name: string, rawInput: unknown): ToolOutcome {
  if (!(name in schemas)) return refused(scene, `Unknown tool ${name}`, `Unknown tool ${name}`);
  const tool = name as ToolName;
  const parsed = schemas[tool].safeParse(rawInput ?? {});
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join(".") || "input"}: ${i.message}`).join("; ");
    return refused(scene, `Invalid input for ${tool}: ${issues}. Received: ${JSON.stringify(rawInput)}`, `${tool}: invalid input`);
  }
  if (tool === "get_layout_report") return { scene, ok: true, content: JSON.stringify(summarizeScene(scene, layoutReport(scene, 0.1))), summary: "Checked the layout", changed: [], mutating: false };
  const res = RUN[tool](scene, parsed.data as never);
  return { scene: res.scene, ok: res.ok, content: res.ok ? `${res.message}\n${layoutStatus(res.scene)}` : `FAILED: ${res.message}`, summary: res.message.split("\n")[0], changed: res.changed, mutating: MUTATING.has(tool) };
}
