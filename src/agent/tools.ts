/**
 * Tools the AI designer can call. Each tool validates its input, runs a
 * scene operation from core/ops and reports back in plain words, including
 * any problems the change caused, so the model can react.
 */
import type Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { FACINGS, SIDES } from "@/core/layout/placement";
import {
  addObject,
  applyLayout,
  arrangeObjectsAround,
  improve,
  moveObject,
  removeObject,
  replaceObject,
  resizeObject,
  rotateObject,
  setColor,
  setFinish,
  setLocked,
  setMinWalkway,
  type OpResult,
} from "@/core/ops";
import { layoutReport, summarizeScene } from "@/core/summary";
import { totalSeats } from "@/core/scene";
import type { Scene } from "@/core/types";

const compass = ["north", "south", "east", "west"] as const;
const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/, "colour must be #rrggbb");

const facing = z
  .enum(FACINGS)
  .describe(
    "Which way the object's front should face. into_room: away from the wall it stands against. toward_target / away_from_target / same_as_target: relative to the placement target. along_wall: side against the wall. keep: unchanged. Or a compass direction.",
  );

const placement = z.discriminatedUnion("type", [
  z
    .object({
      type: z.literal("against_wall"),
      wall: z.string().describe("Wall id from the scene, e.g. 'west' or 'north_2'."),
      slide_toward: z.enum([...compass, "center"]).optional().describe("Which end of the wall to prefer. Default: centred."),
      align_with: z.string().optional().describe("Object or opening id to line up with, e.g. put the sofa opposite tv_unit_1."),
      gap_m: z.number().min(0).max(1).optional().describe("Gap from the wall. Default 0."),
      facing: facing.optional(),
    })
    .describe("Back against a wall."),
  z
    .object({
      type: z.literal("next_to"),
      target: z.string().describe("Object id (or opening id with a compass side)."),
      side: z
        .enum(SIDES)
        .describe(
          "front/back/left/right are relative to the target object (left/right as seen by someone using it); compass sides are absolute; under is for rugs.",
        ),
      gap_m: z
        .number()
        .min(-0.3)
        .max(5)
        .optional()
        .describe("Distance between the two objects' edges. Defaults: coffee table 0.45, seating in front of a TV 2.4, chairs at a table -0.1 (tucked), beside 0.05-0.1."),
      facing: facing.optional(),
    })
    .describe("Relative to another object."),
  z
    .object({
      type: z.literal("near"),
      target: z
        .string()
        .describe("Object id, opening id (e.g. window_1), wall id, 'center', or a corner: corner_nw, corner_ne, corner_sw, corner_se."),
      facing: facing.optional(),
    })
    .describe("As close as possible to a target, anywhere it fits."),
  z
    .object({
      type: z.literal("nudge"),
      direction: z.enum([...compass, "toward_target", "away_from_target"]),
      target: z.string().optional().describe("Needed for toward_target / away_from_target."),
      distance_m: z.number().min(0).max(6),
    })
    .describe("Shift by a distance the user gave. Stops early if blocked and says so."),
]);

const step = z.object({ object_id: z.string(), placement });

const schemas = {
  get_layout_report: z.object({}).describe("Fresh analysis of the room: objects, positions, issues, walkway widths, seats."),
  apply_layout: z
    .object({
      steps: z.array(step).min(1).max(30).describe("Placements in order. Put anchor pieces first."),
    })
    .describe(
      "Rearrange several objects at once. All listed objects are lifted out first, then placed in order, so they don't block each other's new spots. Best tool for 'rearrange', 'arrange for…', 'make it less cramped'.",
    ),
  move_object: z.object({ object_id: z.string(), placement }).describe("Move one object."),
  rotate_object: z
    .object({
      object_id: z.string(),
      by_degrees: z.number().min(-360).max(360).optional().describe("Turn by this many degrees (positive = counter-clockwise seen from above)."),
      facing: facing.optional(),
      target: z.string().optional().describe("Target for toward_target / away_from_target / same_as_target."),
    })
    .describe("Turn an object in place (shifts slightly if it would otherwise collide)."),
  add_object: z
    .object({
      catalog_id: z.string().describe("Id from the catalog."),
      placement: placement.optional().describe("Where to put it. Omit to let the engine find free space near the centre."),
      color: hex.optional(),
    })
    .describe("Add a new piece from the catalog."),
  remove_object: z.object({ object_id: z.string() }).describe("Remove an object from the room."),
  replace_object: z
    .object({ object_id: z.string(), catalog_id: z.string() })
    .describe("Swap an object for another catalog item in the same spot and facing (e.g. a smaller coffee table)."),
  arrange_around: z
    .object({
      center_id: z.string().describe("Table or other centre object."),
      object_ids: z.array(z.string()).default([]).describe("Existing objects to seat around it."),
      add_catalog_id: z.string().optional().describe("Catalog id of extra pieces to add, e.g. dining_chair."),
      add_count: z.number().int().min(0).max(16).optional(),
      gap_m: z.number().min(-0.3).max(1.5).optional().describe("Override the gap to the centre object."),
    })
    .describe("Seat chairs or other seating evenly around a table, each facing it. Can add new chairs."),
  improve_layout: z
    .object({
      target_walkway_m: z.number().min(0.5).max(1.5).optional().describe("Walkway width to aim for. Default: the room's minimum."),
      only_ids: z.array(z.string()).optional().describe("Restrict which objects may move."),
    })
    .describe("Small automatic adjustments (moves up to ~50 cm, quarter turns) to fix collisions and widen tight walkways. Locked objects stay put."),
  set_color: z.object({ object_ids: z.array(z.string()).min(1), color: hex }).describe("Recolour objects (upholstery/finish)."),
  set_room_finish: z
    .object({ floor_color: hex.optional(), wall_color: hex.optional() })
    .describe("Change floor or wall colour."),
  lock_object: z
    .object({ object_id: z.string(), locked: z.boolean() })
    .describe("Lock an object so nothing moves it (use when the user says keep X where it is)."),
  resize_object: z
    .object({
      object_id: z.string(),
      width_m: z.number().min(0.1).max(6).optional(),
      depth_m: z.number().min(0.1).max(6).optional(),
      height_m: z.number().min(0.01).max(3).optional(),
    })
    .describe("Set real dimensions the user gives for their own furniture."),
  set_min_walkway: z
    .object({ meters: z.number().min(0.5).max(1.5) })
    .describe("Change the minimum comfortable walkway used for checks (default 0.8)."),
} as const;

export type ToolName = keyof typeof schemas;

function toInputSchema(schema: z.ZodType): Anthropic.Tool["input_schema"] {
  const json = z.toJSONSchema(schema, { target: "draft-7", io: "input" }) as Record<string, unknown>;
  delete json.$schema;
  delete json.description;
  return json as Anthropic.Tool["input_schema"];
}

export const TOOLS: Anthropic.Tool[] = (Object.keys(schemas) as ToolName[]).map((name) => ({
  name,
  description: schemas[name].description ?? name,
  input_schema: toInputSchema(schemas[name]),
  eager_input_streaming: true,
}));

export const MUTATING: ReadonlySet<ToolName> = new Set(
  (Object.keys(schemas) as ToolName[]).filter((n) => n !== "get_layout_report"),
);

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

function formatIssues(error: z.ZodError): string {
  return error.issues.map((i) => `${i.path.join(".") || "input"}: ${i.message}`).join("; ");
}

export function executeTool(scene: Scene, name: string, rawInput: unknown): ToolOutcome {
  if (!(name in schemas)) {
    return { scene, ok: false, content: `Unknown tool ${name}`, summary: `Unknown tool ${name}`, changed: [], mutating: false };
  }
  const tool = name as ToolName;
  const parsed = schemas[tool].safeParse(rawInput ?? {});
  if (!parsed.success) {
    const msg = `Invalid input for ${tool}: ${formatIssues(parsed.error)}. Received: ${JSON.stringify(rawInput)}`;
    return { scene, ok: false, content: msg, summary: `${tool}: invalid input`, changed: [], mutating: false };
  }
  if (tool === "get_layout_report") {
    const content = JSON.stringify(summarizeScene(scene, layoutReport(scene, 0.1)));
    return { scene, ok: true, content, summary: "Checked the layout", changed: [], mutating: false };
  }

  let res: OpResult;
  const input = parsed.data as Record<string, unknown>;
  switch (tool) {
    case "apply_layout": {
      const d = parsed.data as z.infer<(typeof schemas)["apply_layout"]>;
      res = applyLayout(scene, d.steps);
      break;
    }
    case "move_object": {
      const d = parsed.data as z.infer<(typeof schemas)["move_object"]>;
      res = moveObject(scene, d.object_id, d.placement);
      break;
    }
    case "rotate_object": {
      const d = parsed.data as z.infer<(typeof schemas)["rotate_object"]>;
      res = rotateObject(scene, d.object_id, d);
      break;
    }
    case "add_object": {
      const d = parsed.data as z.infer<(typeof schemas)["add_object"]>;
      res = addObject(scene, d.catalog_id, d.placement, d.color);
      break;
    }
    case "remove_object":
      res = removeObject(scene, input.object_id as string);
      break;
    case "replace_object":
      res = replaceObject(scene, input.object_id as string, input.catalog_id as string);
      break;
    case "arrange_around": {
      const d = parsed.data as z.infer<(typeof schemas)["arrange_around"]>;
      const add = d.add_catalog_id && d.add_count ? { catalog_id: d.add_catalog_id, count: d.add_count } : undefined;
      res = arrangeObjectsAround(scene, d.center_id, d.object_ids, add, d.gap_m);
      break;
    }
    case "improve_layout": {
      const d = parsed.data as z.infer<(typeof schemas)["improve_layout"]>;
      res = improve(scene, { targetWalkway: d.target_walkway_m, onlyIds: d.only_ids });
      break;
    }
    case "set_color": {
      const d = parsed.data as z.infer<(typeof schemas)["set_color"]>;
      res = setColor(scene, d.object_ids, d.color);
      break;
    }
    case "set_room_finish":
      res = setFinish(scene, parsed.data as z.infer<(typeof schemas)["set_room_finish"]>);
      break;
    case "lock_object":
      res = setLocked(scene, input.object_id as string, input.locked as boolean);
      break;
    case "resize_object": {
      const d = parsed.data as z.infer<(typeof schemas)["resize_object"]>;
      res = resizeObject(scene, d.object_id, { w: d.width_m, d: d.depth_m, h: d.height_m });
      break;
    }
    case "set_min_walkway":
      res = setMinWalkway(scene, input.meters as number);
      break;
  }

  const content = res.ok ? `${res.message}\n${layoutStatus(res.scene)}` : `FAILED: ${res.message}`;
  const summary = res.message.split("\n")[0];
  return { scene: res.scene, ok: res.ok, content, summary, changed: res.changed, mutating: true };
}
