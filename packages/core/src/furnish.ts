/**
 * "Furnish it for me": a starter set for a room kind, placed by the engine piece by piece
 * (every pose is checked like a manual move), plus the room's essentials and how many are in.
 * A piece that doesn't fit is skipped and named, never squeezed in.
 */
import { roomCheck } from "./check";
import { getCatalogItem } from "./catalog";
import { addObject, type OpResult } from "./ops";
import type { Placement } from "./layout/placement";
import { getWalls, roomBounds, type Wall } from "./room";
import type { FurnitureType, Scene } from "./types";

export const ROOM_KINDS = ["bedroom", "living", "majlis", "office"] as const;
export type RoomKind = (typeof ROOM_KINDS)[number];

/** The pieces that make a room of this kind usable, in the order the checklist shows them. */
export const ESSENTIALS: Record<RoomKind, FurnitureType[]> = {
  bedroom: ["bed", "nightstand", "wardrobe", "rug", "floor_lamp"],
  living: ["sofa", "coffee_table", "tv_unit", "rug", "armchair", "floor_lamp"],
  majlis: ["majlis_seat", "rug", "coffee_table", "side_table"],
  office: ["desk", "office_chair", "bookshelf", "floor_lamp", "plant"],
};

/** The kind a room's furniture says it is, or null while it says nothing yet. */
export function inferKind(scene: Scene): RoomKind | null {
  const has = (t: FurnitureType) => scene.objects.some((o) => o.type === t);
  if (has("bed")) return "bedroom";
  if (has("majlis_seat")) return "majlis";
  if (has("sofa") || has("tv_unit")) return "living";
  if (has("desk")) return "office";
  return null;
}

export interface Essentials {
  kind: RoomKind;
  done: FurnitureType[];
  missing: FurnitureType[];
}

export function essentials(scene: Scene, kind: RoomKind): Essentials {
  const list = ESSENTIALS[kind];
  const done = list.filter((t) => scene.objects.some((o) => o.type === t));
  return { kind, done, missing: list.filter((t) => !done.includes(t)) };
}

/** Walls for big pieces: no door on them, fewer windows first, then the longest. */
function wallsByFit(scene: Scene): Wall[] {
  const openings = (w: Wall, type: string) => scene.room.openings.filter((o) => o.wall === w.index && o.type === type).length;
  return getWalls(scene.room)
    .filter((w) => openings(w, "door") === 0 && w.length >= 1.6)
    .sort((a, b) => openings(a, "window") - openings(b, "window") || b.length - a.length);
}

/** Where a piece may go, best first. The engine tries each; "anywhere it fits" is always the last resort. */
type Step = { catalogId: string; place: (ids: Record<string, string>, walls: Wall[]) => Placement[] };
type Side = "left" | "right" | "front" | "under";

const onWalls = (...order: number[]) => (_: Record<string, string>, walls: Wall[]): Placement[] =>
  order.filter((i) => walls[i]).map((i) => ({ type: "against_wall", wall: walls[i].id, slide_toward: "center", facing: "into_room" }));
const beside = (target: string, sides: Side[], gap_m?: number, facing?: "toward_target" | "same_as_target") => (ids: Record<string, string>): Placement[] =>
  ids[target] ? sides.map((side) => ({ type: "next_to", target: ids[target], side, gap_m, facing })) : [];
const anywhere = (): Placement[] => [];

function kit(kind: RoomKind, scene: Scene): Step[] {
  const b = roomBounds(scene.room);
  const short = Math.min(b.maxX - b.minX, b.maxZ - b.minZ);
  const bed = short < 2.8 ? "bed_single" : short < 3.4 ? "bed_double" : "bed_queen";
  const sofa = short < 3.2 ? "sofa_2_seat" : "sofa_3_seat";
  const KITS: Record<RoomKind, Step[]> = {
    bedroom: [
      { catalogId: bed, place: onWalls(0, 1, 2) },
      { catalogId: "nightstand", place: beside("bed", ["left"], 0.05, "same_as_target") },
      { catalogId: "nightstand", place: beside("bed", ["right"], 0.05, "same_as_target") },
      { catalogId: "rug_bedroom", place: beside("bed", ["under"]) },
      { catalogId: "wardrobe_2", place: onWalls(1, 2, 3, 0) },
      { catalogId: "floor_lamp", place: beside("nightstand", ["left", "right"], 0.05) }, // a reading light by the bed
    ],
    living: [
      { catalogId: sofa, place: onWalls(0, 1, 2) },
      { catalogId: "coffee_table_rect", place: beside("sofa", ["front"], 0.4, "same_as_target") },
      { catalogId: "rug_medium", place: beside("coffee_table", ["under"]) },
      { catalogId: "tv_unit", place: beside("sofa", ["front"], 2.2, "toward_target") },
      { catalogId: "armchair", place: beside("coffee_table", ["left", "right"], 0.4, "toward_target") },
      { catalogId: "floor_lamp", place: beside("sofa", ["right", "left"], 0.1) },
      { catalogId: "plant", place: anywhere },
    ],
    majlis: [
      { catalogId: "majlis_seat_3m", place: onWalls(0, 1) },
      { catalogId: "majlis_seat_2m", place: onWalls(1, 2, 3) },
      { catalogId: "majlis_seat_2m", place: onWalls(2, 3, 1) },
      { catalogId: "rug_large", place: anywhere },
      { catalogId: "coffee_table_rect", place: beside("majlis_seat", ["front"], 0.6, "same_as_target") },
      { catalogId: "side_table", place: beside("majlis_seat", ["right", "left"], 0.1) },
    ],
    office: [
      { catalogId: "desk", place: onWalls(0, 1, 2) },
      { catalogId: "office_chair", place: beside("desk", ["front"], 0.1, "toward_target") },
      { catalogId: "bookshelf", place: onWalls(1, 2, 3) },
      { catalogId: "floor_lamp", place: beside("desk", ["right", "left"], 0.1) },
      { catalogId: "plant", place: anywhere },
    ],
  };
  return KITS[kind];
}

export interface FurnishResult {
  scene: Scene;
  /** One scene per piece added, in order, so the app can show them arriving one by one. */
  frames: Scene[];
  added: string[];
  /** Catalog ids that did not fit anywhere sensible. */
  skipped: string[];
}

/** How badly a room fails its own check: the summed weight of failing rules (0 = passes). */
const failWeight = (scene: Scene) =>
  roomCheck(scene).rules.reduce((sum, r) => sum + (r.status === "fail" ? r.weight : 0), 0);

/** The first spot that keeps the room passing; failing that, the one that hurts it least. Yields between attempts. */
function* placeStep(scene: Scene, catalogId: string, options: Placement[]): Generator<null, OpResult | null> {
  const baseline = failWeight(scene);
  let best: { res: OpResult; cost: number } | null = null;
  for (const placement of [...options, undefined]) {
    yield null;
    const res = addObject(scene, catalogId, placement);
    if (!res.ok) continue;
    const cost = failWeight(res.scene);
    if (cost === 0) return res;
    if (!best || cost < best.cost) best = { res, cost };
  }
  return best && best.cost <= baseline ? best.res : null; // never make a passing room fail
}

/**
 * Furnishes step by step: yields `null` between attempts (so the app can pause for a frame) and the room
 * each time a piece lands (so it can show pieces arriving as they are placed). Returns the summary.
 */
export function* furnishSteps(scene: Scene, kind: RoomKind): Generator<Scene | null, FurnishResult> {
  const walls = wallsByFit(scene);
  const ids: Record<string, string> = {};
  const frames: Scene[] = [];
  const added: string[] = [];
  const skipped: string[] = [];
  let working = scene;
  for (const step of kit(kind, scene)) {
    const res = yield* placeStep(working, step.catalogId, step.place(ids, walls));
    if (!res) {
      skipped.push(step.catalogId);
      continue;
    }
    working = res.scene;
    const id = res.changed[0];
    const type = working.objects.find((o) => o.id === id)!.type;
    ids[type] ??= id; // the first of each kind is what later pieces line up with
    added.push(id);
    frames.push(working);
    yield working;
  }
  return { scene: working, frames, added, skipped };
}

/** Runs the whole thing at once (tests, server). */
export function furnishRoom(scene: Scene, kind: RoomKind): FurnishResult {
  const run = furnishSteps(scene, kind);
  let step = run.next();
  while (!step.done) step = run.next();
  return step.value;
}

/** One missing essential, placed the way the starter set would place it (next to the bed, against a wall...). */
export function* addEssentialSteps(scene: Scene, kind: RoomKind, type: FurnitureType): Generator<null, OpResult | null> {
  const step = kit(kind, scene).find((s) => getCatalogItem(s.catalogId)?.type === type);
  if (!step) return null;
  const ids: Record<string, string> = {};
  for (const o of scene.objects) ids[o.type] ??= o.id;
  return yield* placeStep(scene, step.catalogId, step.place(ids, wallsByFit(scene)));
}
