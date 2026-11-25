/**
 * "Furnish it for me": a starter set for a room kind, placed by the engine piece by piece
 * (every pose is checked like a manual move), plus the room's essentials and how many are in.
 * A piece that doesn't fit is skipped and named, never squeezed in.
 */
import { roomCheck } from "./check";
import { getCatalogItem } from "./catalog";
import { addObject, type OpResult } from "./ops";
import type { Placement } from "./layout/placement";
import { frontDir } from "./geometry";
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
/** `catalogId` may list alternatives, best first: a smaller piece that fits beats a bigger one that blocks a walkway. */
type Step = {
  catalogId: string | string[];
  place: (ids: Record<string, string>, walls: Wall[], scene: Scene) => Placement[];
  /** Anchors (bed, sofa, desk...) may go anywhere they fit; an accent piece out of its place (an armchair blocking the TV) is worse than none. */
  anchor?: true;
};
type Side = "left" | "right" | "front" | "under";

const onWalls = (...order: number[]) => (_: Record<string, string>, walls: Wall[]): Placement[] =>
  order.filter((i) => walls[i]).map((i) => ({ type: "against_wall", wall: walls[i].id, slide_toward: "center", facing: "into_room" }));
const beside = (target: string, sides: Side[], gap_m?: number, facing?: "toward_target" | "same_as_target") => (ids: Record<string, string>): Placement[] =>
  ids[target] ? sides.map((side) => ({ type: "next_to", target: ids[target], side, gap_m, facing })) : [];
const anywhere = (): Placement[] => [];
type Places = Step["place"];
/** The options of several rules, in order. */
const either = (...rules: Places[]): Places => (ids, walls, scene) => rules.flatMap((rule) => rule(ids, walls, scene));
/** Against the wall a piece looks at, lined up with it: a TV opposite the sofa. Then "in front of it" as a fallback. */
const facing = (target: string, gap_m: number) => (ids: Record<string, string>, walls: Wall[], scene: Scene): Placement[] => {
  const o = scene.objects.find((x) => x.id === ids[target]);
  if (!o) return [];
  const front = frontDir(o.rotation);
  const opposite = getWalls(scene.room).filter((w) => w.inward.x * front.x + w.inward.z * front.z < -0.9);
  return [
    ...opposite.map((w): Placement => ({ type: "against_wall", wall: w.id, align_with: o.id, facing: "into_room" })),
    { type: "next_to", target: o.id, side: "front", gap_m, facing: "toward_target" },
  ];
};

/** A bed and sofa that suit the room's short side. */
function sized(scene: Scene) {
  const b = roomBounds(scene.room);
  const short = Math.min(b.maxX - b.minX, b.maxZ - b.minZ);
  return { bed: short < 2.8 ? "bed_single" : short < 3.4 ? "bed_double" : "bed_queen", sofa: short < 3.2 ? "sofa_2_seat" : "sofa_3_seat" };
}

function kit(kind: RoomKind, scene: Scene): Step[] {
  const { bed, sofa } = sized(scene);
  const KITS: Record<RoomKind, Step[]> = {
    bedroom: [
      { catalogId: bed, place: onWalls(0, 1, 2), anchor: true },
      { catalogId: "nightstand", place: beside("bed", ["left"], 0.05, "same_as_target") },
      { catalogId: "nightstand", place: beside("bed", ["right"], 0.05, "same_as_target") },
      { catalogId: "rug_bedroom", place: beside("bed", ["under"]) },
      { catalogId: "wardrobe_2", place: onWalls(1, 2, 3, 0), anchor: true },
      { catalogId: "floor_lamp", place: beside("nightstand", ["left", "right"], 0.05) }, // a reading light by the bed
    ],
    living: [
      { catalogId: sofa, place: onWalls(0, 1, 2), anchor: true },
      { catalogId: ["coffee_table_rect", "coffee_table_small", "coffee_table_round"], place: beside("sofa", ["front"], 0.4, "same_as_target") },
      { catalogId: "rug_medium", place: beside("coffee_table", ["under"]) },
      { catalogId: "tv_unit", place: facing("sofa", 2.2) },
      { catalogId: ["armchair", "accent_chair"], place: either(beside("coffee_table", ["left", "right"], 0.35, "toward_target"), beside("sofa", ["left", "right"], 0.25, "same_as_target")) },
      { catalogId: "floor_lamp", place: either(beside("sofa", ["right", "left"], 0.1), beside("armchair", ["left", "right"], 0.1), beside("tv_unit", ["right", "left"], 0.1)) },
      { catalogId: "plant", place: beside("tv_unit", ["left", "right"], 0.1) },
    ],
    majlis: [
      { catalogId: "majlis_seat_3m", place: onWalls(0, 1), anchor: true },
      { catalogId: "majlis_seat_2m", place: onWalls(1, 2, 3), anchor: true },
      { catalogId: "majlis_seat_2m", place: onWalls(2, 3, 1), anchor: true },
      { catalogId: "coffee_table_rect", place: beside("majlis_seat", ["front"], 0.6, "same_as_target") },
      { catalogId: ["rug_large", "rug_medium"], place: either(beside("coffee_table", ["under"]), anywhere), anchor: true }, // centred under the table
      { catalogId: "side_table", place: beside("majlis_seat", ["right", "left"], 0.1) },
    ],
    office: [
      { catalogId: "desk", place: onWalls(0, 1, 2), anchor: true },
      { catalogId: "office_chair", place: beside("desk", ["front"], 0.1, "toward_target") },
      { catalogId: "bookshelf", place: onWalls(1, 2, 3), anchor: true },
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

/**
 * How far a room is from "All rules pass": failing rules count their weight, warnings half (0 = every rule passes).
 * Warnings count because the room-check chip shows them in red too; a starter set should look clean.
 */
const failWeight = (scene: Scene) =>
  roomCheck(scene).rules.reduce((sum, r) => sum + (r.status === "fail" ? r.weight : r.status === "pass" ? 0 : r.weight / 2), 0);

/**
 * The first piece and spot that keep the room passing: every alternative piece in its intended spots first,
 * then each "anywhere it fits". Failing that, the one that hurts the room least. Yields between attempts.
 */
function* placeStep(scene: Scene, catalogIds: string[], options: Placement[], anywhereOk: boolean): Generator<null, OpResult | null> {
  const baseline = failWeight(scene);
  let best: { res: OpResult; cost: number } | null = null;
  const fallback = anywhereOk || !options.length ? catalogIds.map((id) => [id, undefined] as const) : [];
  const tries = [...catalogIds.flatMap((id) => options.map((p) => [id, p] as const)), ...fallback];
  for (const [catalogId, placement] of tries) {
    yield null;
    const res = addObject(scene, catalogId, placement);
    if (!res.ok) continue;
    const cost = failWeight(res.scene);
    if (cost === 0) return res;
    if (!best || cost < best.cost) best = { res, cost };
  }
  return best && best.cost <= baseline ? best.res : null; // never make a passing room fail
}
const ids = (s: Step) => (Array.isArray(s.catalogId) ? s.catalogId : [s.catalogId]);

/**
 * Furnishes step by step: yields `null` between attempts (so the app can pause for a frame) and the room
 * each time a piece lands (so it can show pieces arriving as they are placed). Returns the summary.
 */
export function* furnishSteps(scene: Scene, kind: RoomKind): Generator<Scene | null, FurnishResult> {
  const walls = wallsByFit(scene);
  const placed: Record<string, string> = {};
  const frames: Scene[] = [];
  const added: string[] = [];
  const skipped: string[] = [];
  let working = scene;
  for (const step of kit(kind, scene)) {
    const res = yield* placeStep(working, ids(step), step.place(placed, walls, working), !!step.anchor);
    if (!res) {
      skipped.push(ids(step)[0]);
      continue;
    }
    working = res.scene;
    const id = res.changed[0];
    const type = working.objects.find((o) => o.id === id)!.type;
    placed[type] ??= id; // the first of each kind is what later pieces line up with
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
  const step = kit(kind, scene).find((s) => getCatalogItem(ids(s)[0])?.type === type);
  if (!step) return null;
  const placed: Record<string, string> = {};
  for (const o of scene.objects) placed[o.type] ??= o.id;
  return yield* placeStep(scene, ids(step), step.place(placed, wallsByFit(scene), scene), !!step.anchor);
}
